# 💰 Expenser — Smart AI-Powered Personal Finance Tracker

Expenser is a premium, state-of-the-art personal finance tracker designed to simplify budgeting, transaction logging, and financial analytics. By combining **Next.js 16**, **Express**, **Prisma (PostgreSQL)**, and **Gemini AI**, Expenser goes beyond traditional spreadsheets by introducing an interactive, trend-aware AI assistant that can scan receipts, parse natural language commands, perform semantic search queries, and generate dynamic monthly reviews and spending insights.

---

## 🏗️ Architecture Overview

Expenser is structured as a monorepo consisting of two primary services:
1. **Client**: A modern web application built using **Next.js 16 (App Router)**, styling by **Tailwind CSS**, state management via **Zustand**, and client-side caching/fetching powered by **TanStack React Query**.
2. **Server**: A scalable Express API written in **TypeScript** utilizing **Prisma ORM** for PostgreSQL connection, **Redis** for database caching, and **Clerk** for JWT-based secure session verification.

```mermaid
graph TD
    User([User Client]) <--> NextJS[Next.js App Router]
    NextJS <--> Clerk[Clerk Auth]
    NextJS <--> Server[Express TS Server]
    Server <--> ClerkExpress[Clerk Express Auth Middleware]
    Server <--> Redis[(Redis Cache)]
    Server <--> Gemini[Gemini 2.5 Flash API]
    Server <--> Prisma[Prisma Client]
    Prisma <--> PG[(PostgreSQL DB + pgvector)]
```

---

## ✨ Core Features

### 1. 🤖 Interactive AI Financial Copilot (Hybrid Tool Calling & SSE Streaming)
Expenser features a trend-aware conversational AI assistant powered by Gemini's native **Function Calling (Tool Calling)** and **Server-Sent Events (SSE)** response streaming.

* **Dynamic Tool Selection**: The AI dynamically chooses between structured analytical tools and semantic retrieval based on user intent. It can chain multiple tools in a single turn for complex questions.
* **SSE Response Streaming**: Assistant replies stream chunk-by-chunk in real-time, providing immediate feedback with visual tool call loaders (e.g. `📊 Analyzing spending...`, `💰 Checking budget...`).
* **Interactive Draft Review**: Extracted transactions are staged in a **Zustand store** as candidate cards. Users inspect details in the UI to modify amounts, dates, categories, or delete drafts before bulk-approving them.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant FE as Frontend (SSE Client)
    participant BE as Backend (SSE Server)
    participant AI as Gemini 2.5 Flash
    participant DB as PostgreSQL (Prisma + pgvector)

    User->>FE: Ask: "Will I exceed my budget this month?"
    FE->>BE: POST /ai/copilot (with message + context)
    BE->>AI: Start chat session with system rules
    AI-->>BE: Request Tool: predict_end_of_month
    BE->>FE: SSE event: tool_start {"tool": "predict_end_of_month"}
    BE->>DB: Query current spending aggregates + user budget limit
    DB-->>BE: Return data
    BE->>FE: SSE event: tool_end {"tool": "predict_end_of_month"}
    BE->>AI: Send tool result back to Gemini model
    AI-->>BE: Return final text answer chunk
    BE->>FE: SSE event: text_delta {"delta": "Based on..."}
    BE->>FE: SSE event: done {"action": "COPILOT_RESPONSE", "replyText": "..."}
    FE->>User: Stream text markdown and render results
```

---

## 🛠️ AI Tool Registry (13 Registered Tools)

The assistant has access to the following built-in tools:

| Category | Tool Name | Description |
| :--- | :--- | :--- |
| **Analysis** | `get_spending_summary` | Fetches monthly total income, expense, net savings, savings rate, and daily average. |
| | `get_budget_status` | Returns overall monthly budget vs actual spending, plus category-level breakdowns. |
| | `compare_months` | Compares income, expense, and category trends between any two months side by side. |
| | `get_category_breakdown` | Groups expenses by category. Supports merchant-level drilldown for specific categories. |
| | `predict_end_of_month` | Projects end-of-month spending based on current daily spending velocity. |
| | `calculate_savings_plan` | Computes average savings, validates goal feasibility, and suggests cuts from discretionary categories. |
| | `get_recurring_expenses` | Lists all active recurring transactions and normalizes intervals to monthly/annual costs. |
| | `search_transactions` | Search and filter raw database transaction records. |
| **RAG** | `retrieve_financial_context` | Searches historical monthly reviews and narratives semantically using `pgvector` embeddings. |
| **CRUD** | `create_draft_transactions` | Parses transaction candidates from user messages or uploaded receipts. |
| | `manage_drafts` | Updates or deletes staged draft candidate transactions. |
| | `approve_drafts` | Bulk-saves all staged drafts directly to the PostgreSQL ledger. |
| | `confirm_delete_transaction` | Staged query to locate logged database items for deletion. |
| | `execute_delete_transaction` | Bulk-deletes confirmed database transactions and rolls back aggregates. |

---

## 🧠 Hybrid RAG Layer (pgvector & Semantic Retrieval)

To answer general, trend-based, or historical queries (e.g., *"Where do I usually spend the most?"* or *"How have my habits changed over time?"*), Expenser integrates a **Retrieval-Augmented Generation (RAG)** pipeline:

1. **Monthly Review Ingestion**: At the end of each month, an Inngest cron job compiles raw transaction metrics into a dense monthly summary narrative.
2. **Vector Embeddings**: The text narrative is passed to Gemini's `text-embedding-004` model to generate a 768-dimensional vector embedding.
3. **pgvector Storage**: Embeddings are saved directly in the PostgreSQL database in the `monthlyNarratives` table (represented in Prisma as `Unsupported("vector(768)")`).
4. **Semantic Retrieval**: When a user queries historical patterns, Gemini calls `retrieve_financial_context`. The server converts the search query to an embedding and runs a cosine similarity query (`1 - (embedding <=> queryEmbedding)`) to load the matching historical narratives directly into the LLM context.

---

## ⚙️ Technology Stack

| Layer | Technology | Key Usage |
| :--- | :--- | :--- |
| **Frontend** | Next.js 16 (App Router) | Core app layout, SSR, static routes |
| | React 19 / TypeScript | Component scripting |
| | Tailwind CSS | Utility-first layout & styling |
| | Zustand | Client state (AI Assistant chat history, drafts, active tool loading, streaming text) |
| | TanStack React Query v5 | Server state management, query caching |
| | Recharts | Financial visualization & charts |
| | Clerk | Authentication frontend SDK |
| **Backend** | Express v5 / Node.js | API structure & endpoint routing |
| | Prisma ORM | PostgreSQL type-safe database queries |
| | Redis | High-speed response caching for dashboard metrics |
| | Google Generative AI | `gemini-2.5-flash` (Conversational logic) & `text-embedding-004` (Embeddings) |
| | Multer | Multipart/form-data middleware for receipt uploads |
| | Clerk Express Middleware | Secure JWT token authorization verification |
| **Database** | PostgreSQL + pgvector | Relational transactional persistence and vector similarity search |

---

## 🗄️ Database Schema Design

* **User**: Connects directly to a Clerk auth identifier and tracks the overall ledger balance.
* **Transaction**: Stores individual transaction records (`INCOME`/`EXPENSE`) along with category types, dates, descriptions, receipt image links, and recurring frequency rules.
* **MonthlyNarrative**: Stores monthly summaries and vector embeddings for semantic search retrieval.
* **UserBudget & CategoryBudget**: Defines overall monthly budgets and maps category limits.
* **DailyExpense & DailyExpenseItem**: Aggregated database tables to cache day-level category expense sums.
* **MonthlyExpense & MonthlyExpenseItem**: Aggregated database tables to cache month-level category expense sums.
* **MonthlyIncome & MonthlyIncomeItem**: Aggregated database tables to cache month-level category income sums.
* **SpendingInsight**: Holds AI-computed system messages (burn rate warnings, budget overrides, predictions).
* **MonthlyReview**: Holds core financial KPIs alongside the Gemini-generated summary.

---

## 🚀 Getting Started

### 📋 Prerequisites
* **Node.js** (v18+ recommended)
* **pnpm** (or npm/yarn/bun)
* **PostgreSQL** instance with `pgvector` enabled:
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;
  ```
* **Redis** instance

### 🔑 Environment Configuration

Create a `.env` file in the `server` directory:
```env
PORT=5000
DATABASE_URL="postgresql://username:password@localhost:5432/expenser"
REDIS_URL="redis://localhost:6379"
CLERK_PUBLISHABLE_KEY="your_clerk_publishable_key"
CLERK_SECRET_KEY="your_clerk_secret_key"
GEMINI_API_KEY="your_gemini_api_key"
GEMINI_API_KEY_2="your_gemini_api_key_for_assistant"
```

Create a `.env` file in the `client` directory:
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="your_clerk_publishable_key"
CLERK_SECRET_KEY="your_clerk_secret_key"
NEXT_PUBLIC_API_URL="http://localhost:5000"
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
```

---

## 💻 Running the App

### 1. Database Setup (Server)
```bash
cd server
pnpm install
pnpm prisma db push # push schema to postgres
```

### 2. Start the Backend API Server
```bash
pnpm dev # runs watch index.ts using tsx
```

### 3. Start the Frontend Application
```bash
cd client
pnpm install
pnpm dev # runs next dev on http://localhost:3000
```
