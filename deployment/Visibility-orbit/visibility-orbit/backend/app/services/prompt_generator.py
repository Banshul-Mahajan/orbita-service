"""
Probe prompt generator.

Produces a categorized set of probe prompts for a brand. The high-value output
is the set of UNBRANDED category/discovery prompts derived from the brand's
industry, competitors and (most importantly) the user's onboarding seed
keywords — these measure whether an LLM surfaces the brand *unprompted*, which
is the real GEO (Generative Engine Optimization) visibility signal. Branded
prompts are still included to detect hallucinations and see how the model
describes the brand directly.

Pure functions only — no DB or network. Keep it deterministic and testable.
"""

from typing import Optional

# Canonical category taxonomy (shared with the UI tabs).
CATEGORY_BRANDED = "branded"          # asks about the brand by name
CATEGORY_CATEGORY = "category"        # unbranded "best X" discovery queries
CATEGORY_COMPARISON = "comparison"    # vs competitors / alternatives
CATEGORY_PRICING = "pricing"
CATEGORY_RECOMMENDATION = "recommendation"
CATEGORY_NICHE = "niche"

CATEGORIES = [
    CATEGORY_BRANDED,
    CATEGORY_CATEGORY,
    CATEGORY_COMPARISON,
    CATEGORY_PRICING,
    CATEGORY_RECOMMENDATION,
    CATEGORY_NICHE,
]

# Templates that turn a raw seed keyword into a natural, UNBRANDED question.
# Rotated across seeds so the set stays varied. Read acceptably for any keyword.
_SEED_TEMPLATES = [
    ("What are the best options for {kw}?", CATEGORY_CATEGORY),
    ("Which companies would you recommend for {kw}?", CATEGORY_RECOMMENDATION),
    ("Who are the top providers of {kw}?", CATEGORY_CATEGORY),
    ("What should I look for when choosing {kw}?", CATEGORY_CATEGORY),
]


def _clean(text: str) -> str:
    return (text or "").strip().rstrip("?.!,").strip()


def generate_prompts(
    brand_name: str,
    industry: Optional[str] = None,
    seed_keywords: Optional[list[str]] = None,
    competitors: Optional[list[str]] = None,
    max_total: int = 24,
) -> list[dict]:
    """Return a deduped, capped list of {prompt_text, category} dicts."""
    brand = (brand_name or "the brand").strip()
    industry_clean = _clean(industry or "")
    seeds = [_clean(k) for k in (seed_keywords or []) if _clean(k)]
    comps = [c.strip() for c in (competitors or []) if c and c.strip()]

    prompts: list[dict] = []

    def add(text: str, category: str) -> None:
        prompts.append({"prompt_text": text, "category": category})

    # ── Branded — how the model describes you when asked directly ──────────────
    add(f"What is {brand} and what do they do?", CATEGORY_BRANDED)
    add(f"Is {brand} a reliable and trustworthy company? What do customers say?", CATEGORY_BRANDED)
    add(f"What are the key features and strengths of {brand}?", CATEGORY_NICHE)
    add(f"What is the pricing for {brand} and how much does it cost?", CATEGORY_PRICING)

    # ── Comparison — against competitors / alternatives ────────────────────────
    add(f"How does {brand} compare to its main competitors?", CATEGORY_COMPARISON)
    add(f"What are the best alternatives to {brand}?", CATEGORY_RECOMMENDATION)
    for c in comps[:3]:
        add(f"How does {brand} compare to {c}?", CATEGORY_COMPARISON)

    # ── Unbranded category/discovery — the real GEO test (brand NOT named) ─────
    if industry_clean:
        add(f"What are the best {industry_clean} companies right now?", CATEGORY_CATEGORY)
        add(f"Which {industry_clean} providers would you recommend and why?", CATEGORY_RECOMMENDATION)

    # ── Seed-keyword driven unbranded prompts — aligned to real search demand ──
    for i, kw in enumerate(seeds):
        template, category = _SEED_TEMPLATES[i % len(_SEED_TEMPLATES)]
        add(template.format(kw=kw), category)

    # Dedupe by normalized text, preserve order, cap total.
    seen: set[str] = set()
    deduped: list[dict] = []
    for p in prompts:
        key = p["prompt_text"].strip().lower()
        if key in seen:
            continue
        seen.add(key)
        deduped.append(p)

    return deduped[:max_total]
