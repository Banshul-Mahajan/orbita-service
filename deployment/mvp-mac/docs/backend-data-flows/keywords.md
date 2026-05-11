# Keyword Flows

Router file: `backend/app/routers/keywords.py`

## `POST /api/v1/keywords/expand`

Handler: `keyword_expand()`

What it does:

- Resolves scoped project context.
- Calls `expand_keywords(seed_keyword, limit)`.
- Deletes old `KeywordCluster` rows for the same `project_id` + `seed_keyword`.
- Persists new `KeywordCluster` rows from the clustering output.
- Returns the raw keyword clustering result.

Direct code dependencies:

- Platform:
  - `get_project_context()`
  - `project_scope_filters()`
- Service:
  - `expand_keywords()`
- Model written:
  - `KeywordCluster`

Transitive service dependencies in `expand_keywords()`:

- `fetch_related_keywords()` from SerpAPI
- `embed_keywords()` using OpenAI `text-embedding-3-small`
- `cluster_keywords()` using scikit-learn `KMeans`
- `classify_intent()` and `pick_cluster_name()`

```mermaid
%%{init: {'theme':'dark','look':'handDrawn','themeVariables':{'background':'#0b0b0b','primaryColor':'#111111','primaryTextColor':'#f5f5f5','primaryBorderColor':'#d9d9d9','lineColor':'#d9d9d9','secondaryColor':'#163534','tertiaryColor':'#141b1b'}}}%%
flowchart LR
    C["Client"] --> R["POST /keywords/expand"]
    R --> A["get_current_user"]
    R --> P["get_project_context"]
    P --> Auth["Auth Service"]
    R --> E["expand_keywords"]
    E --> Fetch["fetch_related_keywords"]
    Fetch --> SerpAPI["SerpAPI"]
    E --> Embed["embed_keywords"]
    Embed --> OpenAI["OpenAI Embeddings"]
    E --> Cluster["cluster_keywords"]
    R --> Del["Delete old KeywordCluster rows"]
    Del --> DB["Postgres discover schema"]
    R --> Write["Write KeywordCluster[]"]
    Write --> DB
    R --> Resp["seed_keyword + clusters"]

    classDef node fill:#111111,stroke:#d9d9d9,color:#f5f5f5,stroke-width:1.5px;
    classDef service fill:#163534,stroke:#d9d9d9,color:#f5f5f5,stroke-width:1.5px;
    classDef ext fill:#141b1b,stroke:#d9d9d9,color:#f5f5f5,stroke-width:1.5px;
    class C,R,A,P,Del,Write,DB,Resp node;
    class E,Fetch,Embed,Cluster service;
    class Auth,SerpAPI,OpenAI ext;
```

## `GET /api/v1/keywords/{project_id}`

Handler: `get_keywords()`

What it does:

- Resolves project context.
- Reads all scoped `KeywordCluster` rows ordered by `cluster_id`.
- Reconstructs response groups in memory into `{cluster_id, cluster_name, intent, keywords[]}`.
- Returns grouped clusters plus `total_keywords`.

Dependencies:

- Platform:
  - `get_project_context()`
  - `project_scope_filters()`
- Model read:
  - `KeywordCluster`

```mermaid
%%{init: {'theme':'dark','look':'handDrawn','themeVariables':{'background':'#0b0b0b','primaryColor':'#111111','primaryTextColor':'#f5f5f5','primaryBorderColor':'#d9d9d9','lineColor':'#d9d9d9','secondaryColor':'#163534','tertiaryColor':'#141b1b'}}}%%
flowchart LR
    C["Client"] --> R["GET /keywords/{project_id}"]
    R --> A["get_current_user"]
    R --> P["get_project_context"]
    P --> Auth["Auth Service"]
    R --> Q["Select KeywordCluster[]"]
    Q --> DB["Postgres discover schema"]
    R --> Group["Rebuild cluster groups in memory"]
    R --> Resp["project_id + clusters + total_keywords"]

    classDef node fill:#111111,stroke:#d9d9d9,color:#f5f5f5,stroke-width:1.5px;
    classDef service fill:#163534,stroke:#d9d9d9,color:#f5f5f5,stroke-width:1.5px;
    classDef ext fill:#141b1b,stroke:#d9d9d9,color:#f5f5f5,stroke-width:1.5px;
    class C,R,A,P,Q,DB,Resp node;
    class Group service;
    class Auth ext;
```

## `GET /api/v1/keywords/opportunities/{project_id}`

Handler: `get_keyword_opportunities()`

What it does:

- Resolves project context.
- Reads all scoped `KeywordOpportunity` rows ordered by `intent` and `relevance_score desc`.
- Groups them into intent buckets.
- Uses `_opportunity_dict()` to normalize row output.
- Returns grouped and flattened views plus selected counts.

Dependencies:

- Platform:
  - `get_project_context()`
  - `project_scope_filters()`
- Model read:
  - `KeywordOpportunity`
- Helper:
  - `_opportunity_dict()`

```mermaid
%%{init: {'theme':'dark','look':'handDrawn','themeVariables':{'background':'#0b0b0b','primaryColor':'#111111','primaryTextColor':'#f5f5f5','primaryBorderColor':'#d9d9d9','lineColor':'#d9d9d9','secondaryColor':'#163534','tertiaryColor':'#141b1b'}}}%%
flowchart LR
    C["Client"] --> R["GET /keywords/opportunities/{project_id}"]
    R --> A["get_current_user"]
    R --> P["get_project_context"]
    P --> Auth["Auth Service"]
    R --> Q["Select KeywordOpportunity[]"]
    Q --> DB["Postgres discover schema"]
    R --> Map["_opportunity_dict()"]
    R --> Group["Group by intent"]
    R --> Resp["grouped + all + selected count"]

    classDef node fill:#111111,stroke:#d9d9d9,color:#f5f5f5,stroke-width:1.5px;
    classDef service fill:#163534,stroke:#d9d9d9,color:#f5f5f5,stroke-width:1.5px;
    classDef ext fill:#141b1b,stroke:#d9d9d9,color:#f5f5f5,stroke-width:1.5px;
    class C,R,A,P,Q,DB,Resp node;
    class Map,Group service;
    class Auth ext;
```

## `POST /api/v1/keywords/select`

Handler: `select_keyword_opportunities()`

What it does:

- Resolves project context.
- Short-circuits with `updated: 0` if `keyword_ids` is empty.
- Selects the scoped `KeywordOpportunity` rows matching the supplied IDs.
- Mutates each row's `selected` flag to the requested boolean.
- Returns the updated IDs and count.

Dependencies:

- Platform:
  - `get_project_context()`
  - `project_scope_filters()`
- Model updated:
  - `KeywordOpportunity`

```mermaid
%%{init: {'theme':'dark','look':'handDrawn','themeVariables':{'background':'#0b0b0b','primaryColor':'#111111','primaryTextColor':'#f5f5f5','primaryBorderColor':'#d9d9d9','lineColor':'#d9d9d9','secondaryColor':'#163534','tertiaryColor':'#141b1b'}}}%%
flowchart LR
    C["Client"] --> R["POST /keywords/select"]
    R --> A["get_current_user"]
    R --> P["get_project_context"]
    P --> Auth["Auth Service"]
    R --> Q["Select KeywordOpportunity by ids"]
    Q --> DB["Postgres discover schema"]
    R --> U["Update selected flag in memory"]
    U --> DB
    R --> Resp["updated + selected + keyword_ids"]

    classDef node fill:#111111,stroke:#d9d9d9,color:#f5f5f5,stroke-width:1.5px;
    classDef service fill:#163534,stroke:#d9d9d9,color:#f5f5f5,stroke-width:1.5px;
    classDef ext fill:#141b1b,stroke:#d9d9d9,color:#f5f5f5,stroke-width:1.5px;
    class C,R,A,P,Q,DB,Resp node;
    class U service;
    class Auth ext;
```
