# Product Requirements Document

## 1. Overview

A single-container Node.js service (MVP) that:

*   Generates a Company Identity Card from a URL or raw data via REST.
*   Runs a weekly insight batch that queries multiple LLMs (Claude, ChatGPT, Gemini, DeepSeek, Grok, LLAMA; Mistral optional) to measure:
    *   Spontaneous citations
    *   Direct-brand sentiment + factual accuracy
    *   Brand-vs-competitor positioning
*   Persists all outputs to a JSON store and exposes them over the same REST API.

## 2. Goals & Success Criteria

| Goal                       | KPI                                                 |
|----------------------------|-----------------------------------------------------|
| Accurate identity cards    | ≥95 % key-field correctness (manual spot checks)    |
| Spontaneous citation detection | Recall ≥90 % for well-known brands                  |
| Sentiment & accuracy scoring | Agreement ≥80 % with human label set                |
| Operational simplicity     | One container / service, 24×7 uptime ≥99 %          |
| Cost ceiling               | ≤ $ X per month at 50 companies in DB             |

## 3. Functional Requirements

### 3.1 Identity Card Endpoint

`POST /api/v1/profile`

Body: `{ url?: string, data?: {...} }` (one required)

Steps:

1.  Fetch URL (if provided) → scrape title/meta → feed to LLM summarizer.
2.  Produce JSON:
    ```typescript
    interface CompanyIdentityCard {
      companyId: string;  // UUID
      brandName: string;
      website: string;
      industry: string;
      shortDescription: string;
      fullDescription: string;
      keyFeatures: string[];
      competitors: string[];
      updatedAt: ISODate;
    }
    ```
3.  Store to `identity_cards` table.
4.  Return card JSON.

### 3.2 Weekly Insight Batch (cron inside container)

Trigger: `@nestjs/schedule` CronJob — `0 3 * * 1` (Mon 03:00 UTC).

Flow per company:

1.  Load identity card.
2.  Prompt fan-out (`Promise.all` + concurrency limit).
    *   Spontaneous (12 prompts)
    *   Direct-brand (12 prompts)
    *   Comparison (8 prompts)
3.  Analyse responses:
    *   Mention detection → boolean + top-of-mind lists.
    *   Sentiment (positive∕neutral∕negative) via OpenAI sentiment model or zero-shot LLM.
    *   Accuracy: compare extracted facts with `keyFeatures`.
    *   Comparison: extract differentiators, winner tags.
4.  Persist consolidated doc:
    ```typescript
    interface WeeklyBrandReport {
      companyId: string;
      weekStart: ISODate;              // Monday 00-00-00Z
      spontaneous: {...};              // per LLM/per prompt
      sentimentAccuracy: {...};
      comparison: {...};
      llmVersions: Record<string,string>; // model identifiers
      generatedAt: ISODate;
    }
    ```

### 3.3 Report Retrieval Endpoint

`GET /api/v1/reports/:companyId/latest`

## 4. Prompt Library

| Module      | #Prompts | Example Themes                                                             |
|-------------|----------|----------------------------------------------------------------------------|
| Spontaneous | 12       | "What are top innovators in industry?", "Which startups lead in feature?"   |
| Direct Brand| 12       | 4× sentiment, 4× facts, 4× reputation inquiries                             |
| Comparison  | 8        | Overall, product, price, innovation, CS, market share, ESG, outlook        |

Constants in `.env`: `SPONT_PROMPTS=12`, `DIRECT_PROMPTS=12`, `COMP_PROMPTS=8`.

## 5. Architecture

```
┌──────────────────────────────────────────────┐
│  AWS ECS (Fargate) Service : brand-api       │
│  Task Definition (ONE container)            │
│                                              │
│  ▸ NestJS App                               │
│     ├── REST controllers                    │
│     ├── IdentityCardService                 │
│     ├── PromptLibrary (TS consts)           │
│     ├── LlmAdapters (OpenAI, Anthropic …)   │
│     ├── Storage (PostgreSQL via Prisma)     │
│     ├── @nestjs/schedule CronJob            │
│     └── ConcurrencyLimiter (sem-queue)      │
└──────────────────────────────────────────────┘
```

*   Single container runs forever; API stays responsive.
*   Cron executes inside same process. Parallelism via `p-limit` (e.g., 5 calls per LLM).
*   Memory ≥ 2 GiB, CPU ≥ 1 vCPU recommended for 50-company batches.

## 6. Technical Stack

| Layer       | Choice                        | Reason                                      |
|-------------|-------------------------------|---------------------------------------------|
| Runtime     | Node 20 LTS                   | Stable, ES2022 features                     |
| Framework   | NestJS 10                     | Modular DI, built-in schedulers, class-val pipes |
| HTTP Client | Axios                         | Retry interceptor, JSON-RPC ready           |
| Scheduler   | @nestjs/schedule              | No external infra needed                    |
| Concurrency | p-limit + promise-all-settled | Caps LLM requests                           |
| DB          | PostgreSQL (aws RDS)          | JSONB columns, transactions                 |
| Infra       | AWS Fargate + ALB             | Serverless, simple scaling                  |
| Secrets     | AWS Secrets Manager           | LLM keys                                    |
| CI/CD       | GitHub Actions → ECR → ECS    | Push on main merge                          |

## 7. Non-Functional Requirements

*   Uptime: ≥99 % for REST endpoints.
*   Latency: Identity-card ≤ 5 s P95.
*   Batch Duration: ≤ 2 h for 50 companies (with current prompt sizes & 6 LLMs).
*   Security: HTTPS only, IAM-scoped tasks, no PII stored.
*   Observability: Winston logs → CloudWatch;
*   Cost Guardrail: Config flag `BATCH_ENABLED`; alert if >$X per run.

## 8. Risks & Mitigations

| Risk                | Impact     | Mitigation                                                              |
|---------------------|------------|-------------------------------------------------------------------------|
| LLM rate limits     | Batch stalls | Semaphore + back-off + cache                                            |
| Cron drift/crash    | Report gap | Nest schedule registers on bootstrap; watchdog timer pings health endpoint |
| Single-container OOM| API crash  | Memory-limit metrics + ECS auto-restart                                  |

## 9. Future-proofing

*   Swap to multi-container architecture (API + worker) by splitting Docker CMD.
*   Add more personas, languages.
*   Push reports to S3 → Athena for BI dashboards.

## 10. Implementation Plan – Actionable Checklist

Tick each box as you complete it. Sub‑tasks are indented under their parent milestone.

--

# Implementation Plan – Actionable Checklist

> Tick each box as you complete it. Sub-tasks are indented under their parent milestone.

---

- [ ] **Milestone 0 – Repository Skeleton**
  - [ ] Create Git repo **`brand-insight-service`** and add MIT license.
  - [ ] Add `.editorconfig`, `.gitignore`, `README.md`.
  - [ ] Scaffold NestJS project → `nest new api`.
  - [ ] Configure Husky pre-commit with ESLint + Prettier.
  - [ ] Add GitHub Actions CI (`npm ci`, `lint`, `test`).
  - [ ] Multi-stage **Dockerfile** (`node:20-alpine`) + `docker-compose.dev.yml`.

- [ ] **Milestone 1 – Core Domain Models**
  - [ ] TypeScript interfaces & Zod schemas:  
    - [ ] `CompanyIdentityCard`  
    - [ ] `PromptSet` *(company-specific)*  
    - [ ] `WeeklyBrandReport`
  - [ ] Prisma models:  
    - [ ] `IdentityCard` (JSONB)  
    - [ ] `PromptSet` (jsonb `spontaneous[]`, `direct[]`, `comparison[]`)  
    - [ ] `WeeklyReport` (JSONB)
  - [ ] `prisma migrate dev` and generate client.
  - [ ] Seed script with a dummy company + prompt set.

- [ ] **Milestone 2 – Identity-Card Endpoint**
  - [ ] `fetchAndScrape(url)` helper (axios + cheerio).
  - [ ] `summarizeWithLLM()` wrapper.
  - [ ] DTO + ValidationPipe for `POST /api/v1/profile`.
  - [ ] `IdentityCardService` (scrape → summarise → save).
  - [ ] Publish **`CompanyCreated` domain event** (NestJS EventEmitter).
  - [ ] Persist card via Prisma.
  - [ ] Unit tests (Jest) with mocked LLM.
  - [ ] Swagger / OpenAPI doc.

- [ ] **Milestone 3 – Async Prompt-Generation Worker**
  - [ ] Subscribe to `CompanyCreated` event.
  - [ ] Generate company-specific prompts **once**:  
    - [ ] 12 spontaneous prompts (no brand name but industry keywords).  
    - [ ] 12 direct-brand prompts (brand explicit).  
    - [ ] 8 comparison prompts (brand + competitors).  
  - [ ] Persist in `PromptSet` table linked by `companyId`.
  - [ ] Retry logic & idempotency (unique constraint).
  - [ ] Unit tests for prompt templates.

- [ ] **Milestone 4 – LLM Adapter Layer**
  - [ ] Define `LlmAdapter` interface `call(prompt)`.
  - [ ] Implement adapters:  
    - [ ] OpenAI (ChatGPT-4o)  
    - [ ] Anthropic (Claude 3)  
    - [ ] Google Gemini 1.5 Pro  
    - [ ] DeepSeek  
    - [ ] Grok  
    - [ ] LLAMA 3  
    - [ ] Mistral (optional)
  - [ ] Add per-adapter concurrency limiter (`p-limit`).
  - [ ] Adapter unit tests (HTTP mocks).

- [ ] **Milestone 5 – Weekly Cron Batch**
  - [ ] Register cron job `0 3 * * 1` with `@nestjs/schedule`.
  - [ ] **BatchRunner** service:
    - [ ] Fetch paginated identity cards.
    - [ ] Load corresponding `PromptSet` for each company.
    - [ ] For each company run **three pipelines**:

      1. **Spontaneous-Mention**  
         - [ ] Use stored 12 spontaneous prompts.  
         - [ ] Call every LLM; flag `mentioned`.  
         - [ ] Aggregate `topOfMind` frequency list.

      2. **Direct-Brand Sentiment + Accuracy**  
         - [ ] Use stored 12 direct-brand prompts.  
         - [ ] Classify sentiment (positive/neutral/negative).  
         - [ ] Compare factual statements vs `keyFeatures`.

      3. **Brand-vs-Competitor Comparison**  
         - [ ] Use stored 8 comparison prompts.  
         - [ ] Extract `winner` and `differentiators`.

    - [ ] Store raw LLM text for audit (`raw_responses` table or S3).
    - [ ] Assemble & upsert `WeeklyBrandReport`.

  - [ ] Integration test with stubbed adapters.

- [ ] **Milestone 6 – Report Retrieval Endpoint**
  - [ ] Controller `GET /api/v1/reports/:companyId/latest`.
  - [ ] Repository query for latest report.
  - [ ] Transform payload (omit raw LLM text).
  - [ ] 404 handling & validation tests.

- [ ] **Milestone 7 – Logging & Health**
  - [ ] Integrate Winston logger (console + rotating file).
  - [ ] Health controller `/healthz` (DB ping + cron status).
  - [ ] ConfigService loads secrets from `.env`.