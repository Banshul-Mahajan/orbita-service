# Question Flows

Router file: `backend/app/routers/questions.py`

## `POST /api/v1/questions/mine`

Handler: `mine()`

What it does:

- Resolves project context.
- Calls `mine_questions(topic)`.
- Deletes old `Question` rows for the same scoped project + topic.
- Persists the new mined questions.
- Builds a grouped response keyed by `q_type`.

Direct dependencies:

- Platform:
  - `get_project_context()`
  - `project_scope_filters()`
- Service:
  - `mine_questions()`
- Model written:
  - `Question`

Transitive service dependencies:

- `mine_questions()`
  - `fetch_paa_questions()` via SerpAPI
  - `generate_ai_questions()` via OpenAI
  - `deduplicate_questions()`
  - `classify_q_type()`

```mermaid
%%{init: {'theme':'dark','look':'handDrawn','themeVariables':{'background':'#0b0b0b','primaryColor':'#111111','primaryTextColor':'#f5f5f5','primaryBorderColor':'#d9d9d9','lineColor':'#d9d9d9','secondaryColor':'#163534','tertiaryColor':'#141b1b'}}}%%
flowchart LR
    C["Client"] --> R["POST /questions/mine"]
    R --> A["get_current_user"]
    R --> P["get_project_context"]
    P --> Auth["Auth Service"]
    R --> M["mine_questions"]
    M --> PAA["fetch_paa_questions"]
    PAA --> SerpAPI["SerpAPI"]
    M --> AI["generate_ai_questions"]
    AI --> OpenAI["OpenAI Chat Completions"]
    M --> Dedupe["deduplicate_questions"]
    R --> Del["Delete old Question rows for topic"]
    Del --> DB["Postgres discover schema"]
    R --> Write["Write Question[]"]
    Write --> DB
    R --> Resp["topic + grouped + all"]

    classDef node fill:#111111,stroke:#d9d9d9,color:#f5f5f5,stroke-width:1.5px;
    classDef service fill:#163534,stroke:#d9d9d9,color:#f5f5f5,stroke-width:1.5px;
    classDef ext fill:#141b1b,stroke:#d9d9d9,color:#f5f5f5,stroke-width:1.5px;
    class C,R,A,P,Del,Write,DB,Resp node;
    class M,PAA,AI,Dedupe service;
    class Auth,SerpAPI,OpenAI ext;
```

## `GET /api/v1/questions/{project_id}?topic=...`

Handler: `get_questions()`

What it does:

- Resolves project context.
- Selects scoped `Question` rows for the requested topic.
- Orders them by `q_type`.
- Rebuilds grouped output in memory.

Dependencies:

- Platform:
  - `get_project_context()`
  - `project_scope_filters()`
- Model read:
  - `Question`

```mermaid
%%{init: {'theme':'dark','look':'handDrawn','themeVariables':{'background':'#0b0b0b','primaryColor':'#111111','primaryTextColor':'#f5f5f5','primaryBorderColor':'#d9d9d9','lineColor':'#d9d9d9','secondaryColor':'#163534','tertiaryColor':'#141b1b'}}}%%
flowchart LR
    C["Client"] --> R["GET /questions/{project_id}?topic=..."]
    R --> A["get_current_user"]
    R --> P["get_project_context"]
    P --> Auth["Auth Service"]
    R --> Q["Select Question[] by topic"]
    Q --> DB["Postgres discover schema"]
    R --> Group["Group by q_type"]
    R --> Resp["topic + total + grouped"]

    classDef node fill:#111111,stroke:#d9d9d9,color:#f5f5f5,stroke-width:1.5px;
    classDef service fill:#163534,stroke:#d9d9d9,color:#f5f5f5,stroke-width:1.5px;
    classDef ext fill:#141b1b,stroke:#d9d9d9,color:#f5f5f5,stroke-width:1.5px;
    class C,R,A,P,Q,DB,Resp node;
    class Group service;
    class Auth ext;
```

## `GET /api/v1/questions/{project_id}/count`

Handler: `get_questions_count()`

What it does:

- Resolves project context.
- Aggregates:
  - `count(Question.id)` as `total_questions`
  - `count(distinct(Question.topic))` as `total_topics`
- Returns only the aggregate counts.

Dependencies:

- Platform:
  - `get_project_context()`
  - `project_scope_filters()`
- Model read:
  - `Question`

```mermaid
%%{init: {'theme':'dark','look':'handDrawn','themeVariables':{'background':'#0b0b0b','primaryColor':'#111111','primaryTextColor':'#f5f5f5','primaryBorderColor':'#d9d9d9','lineColor':'#d9d9d9','secondaryColor':'#163534','tertiaryColor':'#141b1b'}}}%%
flowchart LR
    C["Client"] --> R["GET /questions/{project_id}/count"]
    R --> A["get_current_user"]
    R --> P["get_project_context"]
    P --> Auth["Auth Service"]
    R --> Agg["Aggregate count + distinct topic count"]
    Agg --> DB["Postgres discover schema"]
    R --> Resp["total_questions + total_topics"]

    classDef node fill:#111111,stroke:#d9d9d9,color:#f5f5f5,stroke-width:1.5px;
    classDef service fill:#163534,stroke:#d9d9d9,color:#f5f5f5,stroke-width:1.5px;
    classDef ext fill:#141b1b,stroke:#d9d9d9,color:#f5f5f5,stroke-width:1.5px;
    class C,R,A,P,DB,Resp node;
    class Agg service;
    class Auth ext;
```
