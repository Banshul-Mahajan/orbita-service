# Heatmap Flow

Router file: `backend/app/routers/heatmap.py`

## `GET /api/v1/heatmap/{project_id}?query=...`

Handler: `get_heatmap()`

What it does:

- Resolves project context.
- Reads stored `SerpResult` rows for the query.
- Reads stored `AiScanResult` rows for the query.
- Converts both datasets into compact domain coverage payloads.
- Returns an error if both datasets are empty.
- Calls `build_heatmap(query, serp_data, ai_data)`.
- Returns a single-row intent/coverage comparison structure.

Direct dependencies:

- Platform:
  - `get_project_context()`
  - `project_scope_filters()`
- Service:
  - `build_heatmap()`
- Models read:
  - `SerpResult`
  - `AiScanResult`

Transitive service dependencies:

- `build_heatmap()`
  - `compute_coverage_score()`
  - `_generate_insight()`
- No live outbound API requests in this route

Upstream prerequisites:

- `POST /api/v1/serp/analyze`
- `POST /api/v1/ai-scan`

```mermaid
%%{init: {'theme':'dark','look':'handDrawn','themeVariables':{'background':'#0b0b0b','primaryColor':'#111111','primaryTextColor':'#f5f5f5','primaryBorderColor':'#d9d9d9','lineColor':'#d9d9d9','secondaryColor':'#163534','tertiaryColor':'#141b1b'}}}%%
flowchart LR
    C["Client"] --> R["GET /heatmap/{project_id}?query=..."]
    R --> A["get_current_user"]
    R --> P["get_project_context"]
    P --> Auth["Auth Service"]
    R --> S1["Select SerpResult[] for query"]
    R --> S2["Select AiScanResult[] for query"]
    S1 --> DB["Postgres discover schema"]
    S2 --> DB
    R --> T["Transform rows into serp_data + ai_data"]
    R --> H["build_heatmap"]
    H --> Score["compute_coverage_score"]
    H --> Insight["_generate_insight"]
    R --> Resp["channels + overlap_analysis + insight"]

    classDef node fill:#111111,stroke:#d9d9d9,color:#f5f5f5,stroke-width:1.5px;
    classDef service fill:#163534,stroke:#d9d9d9,color:#f5f5f5,stroke-width:1.5px;
    classDef ext fill:#141b1b,stroke:#d9d9d9,color:#f5f5f5,stroke-width:1.5px;
    class C,R,A,P,S1,S2,DB,T,Resp node;
    class H,Score,Insight service;
    class Auth ext;
```
