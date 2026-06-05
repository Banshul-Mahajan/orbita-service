#!/bin/bash
DEPLOY_DIR="$(cd "$(dirname "$0")" && pwd)"

# The pinned requirements (spacy, numpy, scikit-learn, lxml, psycopg2-binary, ...)
# only have prebuilt wheels for Python 3.11/3.12. On 3.13+ pip tries to build them
# from source and fails (e.g. psycopg2 needs pg_config). So prefer 3.11/3.12 and
# search the common Homebrew locations explicitly — `command -v python3.11` can miss
# them if /opt/homebrew/bin isn't first on PATH.
PYTHON_CMD=""
for CANDIDATE in \
    python3.11 \
    python3.12 \
    /opt/homebrew/opt/python@3.11/bin/python3.11 \
    /opt/homebrew/opt/python@3.12/bin/python3.12 \
    /usr/local/opt/python@3.11/bin/python3.11 \
    /opt/homebrew/bin/python3.11 ; do
    if command -v "$CANDIDATE" &> /dev/null; then
        PYTHON_CMD="$CANDIDATE"
        break
    fi
done

if [ -z "$PYTHON_CMD" ]; then
    PYTHON_CMD="python3"
fi

PY_VERSION="$("$PYTHON_CMD" --version 2>&1)"
echo "Setting up Python virtual environments for all microservices using $PYTHON_CMD ($PY_VERSION)..."

# Make sure pg_config is reachable so psycopg2-binary can build from source if a
# matching wheel isn't available (Homebrew's libpq is keg-only and off PATH).
for LIBPQ_BIN in /opt/homebrew/opt/libpq/bin /usr/local/opt/libpq/bin /opt/homebrew/opt/postgresql@16/bin; do
    if [ -x "$LIBPQ_BIN/pg_config" ]; then
        export PATH="$LIBPQ_BIN:$PATH"
        break
    fi
done

# Hard-stop on 3.13+ — the dependency set will not build there. Better to fail
# with clear instructions than to emit dozens of confusing compiler errors.
case "$PY_VERSION" in
    *3.13*|*3.14*)
        echo ""
        echo "  ✗ ERROR: only $PY_VERSION is available, but these services require Python 3.11 (or 3.12)."
        echo "    Packages like psycopg2-binary, spacy, numpy and lxml have no wheels for 3.13+"
        echo "    and will fail to compile."
        echo ""
        echo "    Fix (macOS / Homebrew):"
        echo "        brew install python@3.11"
        echo "        ./setup_backend.sh"
        echo ""
        exit 1
        ;;
esac

BACKEND_DIRS=(
    "auth-service/backend"
    "mvp-mac/backend"
    "knowledge-core/api"
    "Create/create-orbit-mvp/backend"
    "Optimize-Orbit/optimize-orbit/backend"
    "Visibility-orbit/visibility-orbit/backend"
)

FAILED=()

for DIR in "${BACKEND_DIRS[@]}"; do
    BACKEND_PATH="$DEPLOY_DIR/$DIR"
    if [ ! -d "$BACKEND_PATH" ]; then
        echo "  -> Skipping $DIR (directory not found)"
        continue
    fi

    echo "  -> Configuring $DIR..."
    LOG="$BACKEND_PATH/venv-setup.log"
    : > "$LOG"
    ok=true

    # Create the venv.
    if ! "$PYTHON_CMD" -m venv "$BACKEND_PATH/venv" >> "$LOG" 2>&1; then
        ok=false
    fi

    PIP="$BACKEND_PATH/venv/bin/pip"

    # Upgrade pip (also pull in wheel so source builds can succeed).
    if $ok && ! "$PIP" install --upgrade pip wheel >> "$LOG" 2>&1; then
        ok=false
    fi

    # Install the service's requirements. NOT quiet — full output goes to the log.
    if $ok && [ -f "$BACKEND_PATH/requirements.txt" ]; then
        if ! "$PIP" install -r "$BACKEND_PATH/requirements.txt" >> "$LOG" 2>&1; then
            ok=false
        fi
    fi

    # Install the shared package (orbita_auth) in editable mode.
    if $ok && [ -d "$DEPLOY_DIR/shared" ]; then
        if ! "$PIP" install -e "$DEPLOY_DIR/shared" >> "$LOG" 2>&1; then
            ok=false
        fi
    fi

    if $ok; then
        echo "     ✓ $DIR ready"
    else
        echo "     ✗ $DIR FAILED — last lines of $LOG:"
        tail -n 15 "$LOG" | sed 's/^/        /'
        FAILED+=("$DIR")
    fi
done

echo ""
if [ ${#FAILED[@]} -eq 0 ]; then
    echo "Backend virtual environments successfully created."
    exit 0
else
    echo "Backend setup completed with errors in ${#FAILED[@]} service(s):"
    for f in "${FAILED[@]}"; do
        echo "  - $f  (see $DEPLOY_DIR/$f/venv-setup.log)"
    done
    exit 1
fi
