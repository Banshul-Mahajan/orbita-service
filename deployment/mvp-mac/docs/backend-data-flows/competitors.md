# Competitor Flows

Router file: `backend/app/routers/competitors.py`

## `POST /api/v1/competitors/discover`

Handler: `discover_project_competitors()`

What it does:

- Resolves project context.
- Reads scoped `KeywordOpportunity` rows where `selected = true`.
- Returns an API error payload if no selected keywords exist.
- Determines the brand's own domain from `primary_domain` or `website_url`.
- Calls `discover_competitors(selected_keywords, own_domain, num_results)`.
- Deletes old competitor data for the project:
  - `CompetitorPage`
  - `CompetitorDomain`
- Persists ranked competitor domains.
- Flushes each new domain row to build a `domain_id_by_name` map.
- Persists competitor pages linked back to the domain rows.
- Reuses `get_project_competitors()` to produce the final response shape.

Direct dependencies:

- Platform:
  - `get_project_context()`
  - `project_scope_filters()`
- Services:
  - `discover_competitors()`
  - `extract_domain()`
- Models read:
  - `KeywordOpportunity`
- Models deleted/written:
  - `CompetitorDomain`
  - `CompetitorPage`

Transitive service dependencies:

- `discover_competitors()`
  - loops over selected keywords
  - calls `analyze_serp()` for each keyword
  - filters out the brand's own domain and child domains via `_same_or_child_domain()`
  - computes visibility and average position
  - returns domain rollups and capped page samples
- `analyze_serp()` further depends on SerpAPI and page scraping

```mermaid
%%{init: {'theme':'dark','look':'handDrawn','themeVariables':{'background':'#0b0b0b','primaryColor':'#111111','primaryTextColor':'#f5f5f5','primaryBorderColor':'#d9d9d9','lineColor':'#d9d9d9','secondaryColor':'#163534','tertiaryColor':'#141b1b'}}}%%
flowchart LR
    C["Client"] --> R["POST /competitors/discover"]
    R --> A["get_current_user"]
    R --> P["get_project_context"]
    P --> Auth["Auth Service"]
    R --> K["Select selected KeywordOpportunity[]"]
    K --> DB["Postgres discover schema"]
    R --> Own["extract own domain"]
    R --> D["discover_competitors"]
    D --> S["analyze_serp per keyword"]
    S --> SerpAPI["SerpAPI"]
    S --> Web["Ranking URLs"]
    R --> Del["Delete old CompetitorDomain / CompetitorPage"]
    Del --> DB
    R --> W1["Write CompetitorDomain[]"]
    W1 --> DB
    R --> W2["Write CompetitorPage[]"]
    W2 --> DB
    R --> Resp["reuse get_project_competitors()"]

    classDef node fill:#111111,stroke:#d9d9d9,color:#f5f5f5,stroke-width:1.5px;
    classDef service fill:#163534,stroke:#d9d9d9,color:#f5f5f5,stroke-width:1.5px;
    classDef ext fill:#141b1b,stroke:#d9d9d9,color:#f5f5f5,stroke-width:1.5px;
    class C,R,A,P,K,DB,Del,W1,W2,Resp node;
    class Own,D,S service;
    class Auth,SerpAPI,Web ext;
```

## `GET /api/v1/competitors/{project_id}`

Handler: `get_project_competitors()`

What it does:

- Resolves project context.
- Reads scoped `CompetitorDomain` rows ordered by `visibility_score desc`.
- Reads scoped `CompetitorPage` rows ordered by `position asc`.
- Builds an in-memory `domain_by_id` lookup.
- Returns normalized domain and page arrays.

Dependencies:

- Platform:
  - `get_project_context()`
  - `project_scope_filters()`
- Models read:
  - `CompetitorDomain`
  - `CompetitorPage`

```mermaid
%%{init: {'theme':'dark','look':'handDrawn','themeVariables':{'background':'#0b0b0b','primaryColor':'#111111','primaryTextColor':'#f5f5f5','primaryBorderColor':'#d9d9d9','lineColor':'#d9d9d9','secondaryColor':'#163534','tertiaryColor':'#141b1b'}}}%%
flowchart LR
    C["Client"] --> R["GET /competitors/{project_id}"]
    R --> A["get_current_user"]
    R --> P["get_project_context"]
    P --> Auth["Auth Service"]
    R --> Q1["Select CompetitorDomain[]"]
    R --> Q2["Select CompetitorPage[]"]
    Q1 --> DB["Postgres discover schema"]
    Q2 --> DB
    R --> Join["Build domain_by_id lookup"]
    R --> Resp["domains + pages"]

    classDef node fill:#111111,stroke:#d9d9d9,color:#f5f5f5,stroke-width:1.5px;
    classDef service fill:#163534,stroke:#d9d9d9,color:#f5f5f5,stroke-width:1.5px;
    classDef ext fill:#141b1b,stroke:#d9d9d9,color:#f5f5f5,stroke-width:1.5px;
    class C,R,A,P,Q1,Q2,DB,Resp node;
    class Join service;
    class Auth ext;
```
