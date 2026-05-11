# AI Scan Flows

Router file: `backend/app/routers/ai_scan.py`

## `POST /api/v1/ai-scan`

Handler: `run_ai_scan()`

What it does:

- Resolves project context.
- Calls `scan_ai_engines(query, engines)`.
- Deletes old `AiScanResult` rows for the same scoped project + query.
- Persists one `AiScanResult` row per engine response.
- Returns the query and per-engine answer metadata.

Direct dependencies:

- Platform:
  - `get_project_context()`
  - `project_scope_filters()`
- Service:
  - `scan_ai_engines()`
- Model written:
  - `AiScanResult`

Transitive service dependencies:

- `scan_ai_engines()`
  - `query_openai()`
  - `query_gemini()` placeholder returning `{}`
  - `query_perplexity()` placeholder returning `{}`
  - `extract_urls()`
  - `urls_to_domains()`
- External:
  - OpenAI chat completions for the `openai` engine

```mermaid
%%{init: {'theme':'dark','look':'handDrawn','themeVariables':{'background':'#0b0b0b','primaryColor':'#111111','primaryTextColor':'#f5f5f5','primaryBorderColor':'#d9d9d9','lineColor':'#d9d9d9','secondaryColor':'#163534','tertiaryColor':'#141b1b'}}}%%
flowchart LR
    C["Client"] --> R["POST /ai-scan"]
    R --> A["get_current_user"]
    R --> P["get_project_context"]
    P --> Auth["Auth Service"]
    R --> S["scan_ai_engines"]
    S --> OAI["query_openai"]
    OAI --> OpenAI["OpenAI Chat Completions"]
    OAI --> Parse["extract_urls + urls_to_domains"]
    S --> G["query_gemini placeholder"]
    S --> PX["query_perplexity placeholder"]
    R --> Del["Delete old AiScanResult rows"]
    Del --> DB["Postgres discover schema"]
    R --> Write["Write AiScanResult[]"]
    Write --> DB
    R --> Resp["query + per-engine results"]

    classDef node fill:#111111,stroke:#d9d9d9,color:#f5f5f5,stroke-width:1.5px;
    classDef service fill:#163534,stroke:#d9d9d9,color:#f5f5f5,stroke-width:1.5px;
    classDef ext fill:#141b1b,stroke:#d9d9d9,color:#f5f5f5,stroke-width:1.5px;
    class C,R,A,P,Del,Write,DB,Resp node;
    class S,OAI,Parse,G,PX service;
    class Auth,OpenAI ext;
```

## `GET /api/v1/ai-scan/{project_id}?query=...`

Handler: `get_ai_scan()`

What it does:

- Resolves project context.
- Reads all scoped `AiScanResult` rows for the query.
- Maps them into the response shape without re-calling any engine.

Dependencies:

- Platform:
  - `get_project_context()`
  - `project_scope_filters()`
- Model read:
  - `AiScanResult`

```mermaid
%%{init: {'theme':'dark','look':'handDrawn','themeVariables':{'background':'#0b0b0b','primaryColor':'#111111','primaryTextColor':'#f5f5f5','primaryBorderColor':'#d9d9d9','lineColor':'#d9d9d9','secondaryColor':'#163534','tertiaryColor':'#141b1b'}}}%%
flowchart LR
    C["Client"] --> R["GET /ai-scan/{project_id}?query=..."]
    R --> A["get_current_user"]
    R --> P["get_project_context"]
    P --> Auth["Auth Service"]
    R --> Q["Select AiScanResult by query"]
    Q --> DB["Postgres discover schema"]
    R --> Resp["query + stored engine results"]

    classDef node fill:#111111,stroke:#d9d9d9,color:#f5f5f5,stroke-width:1.5px;
    classDef ext fill:#141b1b,stroke:#d9d9d9,color:#f5f5f5,stroke-width:1.5px;
    class C,R,A,P,Q,DB,Resp node;
    class Auth ext;
```

## `GET /api/v1/ai-scan/{project_id}/count`

Handler: `get_ai_scan_count()`

What it does:

- Resolves project context.
- Aggregates:
  - `count(AiScanResult.id)` as `total_scans`
  - `count(distinct(AiScanResult.query))` as `total_queries`
- Returns summary counts only.

Dependencies:

- Platform:
  - `get_project_context()`
  - `project_scope_filters()`
- Model read:
  - `AiScanResult`

```mermaid
%%{init: {'theme':'dark','look':'handDrawn','themeVariables':{'background':'#0b0b0b','primaryColor':'#111111','primaryTextColor':'#f5f5f5','primaryBorderColor':'#d9d9d9','lineColor':'#d9d9d9','secondaryColor':'#163534','tertiaryColor':'#141b1b'}}}%%
flowchart LR
    C["Client"] --> R["GET /ai-scan/{project_id}/count"]
    R --> A["get_current_user"]
    R --> P["get_project_context"]
    P --> Auth["Auth Service"]
    R --> Agg["Aggregate scan count + distinct query count"]
    Agg --> DB["Postgres discover schema"]
    R --> Resp["total_scans + total_queries"]

    classDef node fill:#111111,stroke:#d9d9d9,color:#f5f5f5,stroke-width:1.5px;
    classDef service fill:#163534,stroke:#d9d9d9,color:#f5f5f5,stroke-width:1.5px;
    classDef ext fill:#141b1b,stroke:#d9d9d9,color:#f5f5f5,stroke-width:1.5px;
    class C,R,A,P,DB,Resp node;
    class Agg service;
    class Auth ext;
```
