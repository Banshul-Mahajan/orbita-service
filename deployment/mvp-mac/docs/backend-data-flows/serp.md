# SERP Flows

Router file: `backend/app/routers/serp.py`

## `POST /api/v1/serp/analyze`

Handler: `serp_analyze()`

What it does:

- Resolves project context.
- Calls `analyze_serp(query, num_results)`.
- Deletes old `SerpResult` rows for the same scoped project + query.
- Persists the fresh SERP result set.
- Returns the query plus enriched ranking results.

Direct dependencies:

- Platform:
  - `get_project_context()`
  - `project_scope_filters()`
- Service:
  - `analyze_serp()`
- Model written:
  - `SerpResult`

Transitive service dependencies in `analyze_serp()`:

- `SerpAPI` Google search request
- `scrape_url()` for each organic result
- `extract_domain()`
- `rough_readability()`
- `extract_entities_simple()`
- `BeautifulSoup` for heading extraction

```mermaid
%%{init: {'theme':'dark','look':'handDrawn','themeVariables':{'background':'#0b0b0b','primaryColor':'#111111','primaryTextColor':'#f5f5f5','primaryBorderColor':'#d9d9d9','lineColor':'#d9d9d9','secondaryColor':'#163534','tertiaryColor':'#141b1b'}}}%%
flowchart LR
    C["Client"] --> R["POST /serp/analyze"]
    R --> A["get_current_user"]
    R --> P["get_project_context"]
    P --> Auth["Auth Service"]
    R --> S["analyze_serp"]
    S --> API["SerpAPI Google SERP"]
    S --> Scrape["scrape_url for each ranking URL"]
    Scrape --> Web["Ranking URLs"]
    Scrape --> Parse["headings + entities + readability"]
    R --> Del["Delete old SerpResult rows for query"]
    Del --> DB["Postgres discover schema"]
    R --> Write["Write SerpResult[]"]
    Write --> DB
    R --> Resp["query + results"]

    classDef node fill:#111111,stroke:#d9d9d9,color:#f5f5f5,stroke-width:1.5px;
    classDef service fill:#163534,stroke:#d9d9d9,color:#f5f5f5,stroke-width:1.5px;
    classDef ext fill:#141b1b,stroke:#d9d9d9,color:#f5f5f5,stroke-width:1.5px;
    class C,R,A,P,Del,Write,DB,Resp node;
    class S,Scrape,Parse service;
    class Auth,API,Web ext;
```

## `GET /api/v1/serp/{project_id}?query=...`

Handler: `get_serp_results()`

What it does:

- Resolves project context.
- Selects scoped `SerpResult` rows for the requested query.
- Orders them by position.
- Maps DB rows into the API response shape.

Dependencies:

- Platform:
  - `get_project_context()`
  - `project_scope_filters()`
- Model read:
  - `SerpResult`

```mermaid
%%{init: {'theme':'dark','look':'handDrawn','themeVariables':{'background':'#0b0b0b','primaryColor':'#111111','primaryTextColor':'#f5f5f5','primaryBorderColor':'#d9d9d9','lineColor':'#d9d9d9','secondaryColor':'#163534','tertiaryColor':'#141b1b'}}}%%
flowchart LR
    C["Client"] --> R["GET /serp/{project_id}?query=..."]
    R --> A["get_current_user"]
    R --> P["get_project_context"]
    P --> Auth["Auth Service"]
    R --> Q["Select SerpResult by query"]
    Q --> DB["Postgres discover schema"]
    R --> Resp["query + ordered results"]

    classDef node fill:#111111,stroke:#d9d9d9,color:#f5f5f5,stroke-width:1.5px;
    classDef ext fill:#141b1b,stroke:#d9d9d9,color:#f5f5f5,stroke-width:1.5px;
    class C,R,A,P,Q,DB,Resp node;
    class Auth ext;
```

## `GET /api/v1/serp/{project_id}/count`

Handler: `get_serp_count()`

What it does:

- Resolves project context.
- Runs a scoped aggregate query:
  - `count(SerpResult.id)` as `total_results`
  - `count(distinct(SerpResult.query))` as `total_queries`
- Returns the counts only.

Dependencies:

- Platform:
  - `get_project_context()`
  - `project_scope_filters()`
- Model read:
  - `SerpResult`
- SQL functions:
  - `func.count`
  - `distinct`

```mermaid
%%{init: {'theme':'dark','look':'handDrawn','themeVariables':{'background':'#0b0b0b','primaryColor':'#111111','primaryTextColor':'#f5f5f5','primaryBorderColor':'#d9d9d9','lineColor':'#d9d9d9','secondaryColor':'#163534','tertiaryColor':'#141b1b'}}}%%
flowchart LR
    C["Client"] --> R["GET /serp/{project_id}/count"]
    R --> A["get_current_user"]
    R --> P["get_project_context"]
    P --> Auth["Auth Service"]
    R --> Agg["Aggregate count + distinct query count"]
    Agg --> DB["Postgres discover schema"]
    R --> Resp["total_results + total_queries"]

    classDef node fill:#111111,stroke:#d9d9d9,color:#f5f5f5,stroke-width:1.5px;
    classDef service fill:#163534,stroke:#d9d9d9,color:#f5f5f5,stroke-width:1.5px;
    classDef ext fill:#141b1b,stroke:#d9d9d9,color:#f5f5f5,stroke-width:1.5px;
    class C,R,A,P,DB,Resp node;
    class Agg service;
    class Auth ext;
```
