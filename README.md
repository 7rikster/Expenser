# 💰 Expenser — Smart AI-Powered Personal Finance Tracker

Expenser is a premium, state-of-the-art personal finance tracker designed to simplify budgeting, transaction logging, and financial analytics. By combining **Next.js 16**, **Express**, **Prisma (PostgreSQL)**, and the **Gemini 2.5 Flash API**, Expenser goes beyond traditional spreadsheets by introducing an interactive AI assistant that can scan receipts, parse natural language commands, and generate dynamic monthly reviews and spending insights.

---

## 🏗️ Architecture Overview

Expenser is structured as a monorepo consisting of two primary services:
1. **Client**: A modern web application built using **Next.js 16 (App Router)**, styling by **Tailwind CSS**, state management via **Zustand**, and client-side caching/fetching powered by **TanStack React Query**.
2. **Server**: A scalable Express API written in **TypeScript** utilizing **Prisma ORM** for PostgreSQL connection, **Redis** for database caching, and **Clerk** for jwt-based secure session verification.

```mermaid
graph TD
    User([User Client]) <--> NextJS[Next.js App Router]
    NextJS <--> Clerk[Clerk Auth]
    NextJS <--> Server[Express TS Server]
    Server <--> ClerkExpress[Clerk Express Auth Middleware]
    Server <--> Redis[(Redis Cache)]
    Server <--> Gemini[Gemini 2.5 Flash API]
    Server <--> Prisma[Prisma Client]
    Prisma <--> PG[(PostgreSQL DB)]
```

---

## ✨ Core Features

### 1. 🤖 Interactive AI Assistant (Multimodal & Conversational)
The centerpiece of Expenser is its stateful AI assistant. Users can interact with the assistant via natural language text commands (e.g., *"Add Rs. 500 for groceries today"*, *"Delete my last Uber ride from the DB"*), or by uploading images of shopping receipts.
* **Smart Parsing**: The server leverages `gemini-2.5-flash` with a strict JSON output schema to categorize transactions and extract details (amounts, dates, merchant names, memo descriptions).
* **Interactive Draft & Verification Review**: Instead of silently writing data to the database, extracted transactions are saved in a local **Zustand store** as draft candidates. Users inspect them via custom UI cards where they can adjust values, edit categories, switch types (INCOME vs EXPENSE), delete drafts, or bulk-approve them into the database in one click.
* **Conversational Database Actions**: The AI can also search historical records (`LIST_DB`) or request confirmation to delete existing records (`CONFIRM_DELETE_DB` -> `DELETE_DB`).

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant FE as Frontend (Zustand + React Query)
    participant BE as Backend (Express Controller)
    participant AI as Gemini 2.5 Flash
    participant DB as PostgreSQL (via Prisma)

    User->>FE: Upload receipt or type natural language command
    FE->>BE: POST /ai/assistant (with prompt + context)
    BE->>AI: Send prompt + System guidelines + receipt image
    AI-->>BE: Return structured JSON (Action, Candidates, replyText)
    BE->>FE: Return JSON payload
    FE->>FE: Store Candidates in Zustand & render Interactive Cards
    User->>FE: Verify, edit fields, and click Approve
    FE->>BE: POST /transaction/bulk-create (Approved payload)
    BE->>DB: Execute Prisma Transaction (Insert logs, update user balance, aggregate tables)
    BE->>FE: Return success status
    FE->>FE: Update message state to 'approved' and render confirmation
```

### 2. 📊 High-Performance Dashboard & Real-time Analytics
Expenser provides a rich, responsive interface with details on your financial standing:
* **Interactive Visualizations**: Beautiful, responsive charts powered by **Recharts** displaying Monthly Income vs. Expense Trends, Weekly Spending Patterns, and Category-wise Breakdowns.
* **Aggregate Ledger System**: To avoid expensive table scans on raw transaction logs, the database maintains separate aggregated tables (`DailyExpense`, `MonthlyExpense`, `MonthlyIncome`). Updates are handled transactionally alongside individual transaction creation, ensuring statistics load instantly.
* **Redis Caching**: Key statistical API queries are cached in Redis and transactionally invalidated upon any change to transaction data.

### 3. 🎯 Budget Management
* Set a total monthly spending budget limit.
* Allocate specific sub-budgets to categories (e.g., food, travel, groceries, entertainment).
* Visual progress trackers show real-time limits and remaining balances with automated warning popups when thresholds are breached.

### 4. 🧠 AI Spending Insights & Reviews
* **Daily Burn Rate**: Alerts users if they are spending significantly faster than the calendar progress (e.g. *"20% of the month is done, but you've spent 60% of your budget"*).
* **Trend Shift Detection**: Highlights month-over-month category percentage variations (e.g. *"Groceries spending increased by 45% compared to last month"*).
* **Prediction Engine**: Forecasts month-end total spending based on daily averages.
* **Executive Summary**: Generates a professional monthly financial review paragraph using Gemini at the close of each month, saving it in the database for retrospective analysis.

### 5. 🔁 Subscription Tracker
* Logs and manages recurring transactions (DAILY, WEEKLY, MONTHLY, YEARLY).
* Dynamically computes next execution dates to automate future log intervals.

---

## 🛠️ Technology Stack

| Layer | Technology | Key Usage |
| :--- | :--- | :--- |
| **Frontend** | Next.js 16 (App Router) | Core app layout, SSR, static routes |
| | React 19 / TypeScript | Component scripting |
| | Tailwind CSS | Utility-first layout & styling |
| | Zustand | Client state (AI Assistant chat history & drafts) |
| | TanStack React Query v5 | Server state management, query caching |
| | Radix UI / shadcn/ui | Premium UI primitives & responsive components |
| | Recharts | Financial visualization & charts |
| | Clerk | Authentication frontend SDK |
| **Backend** | Express v5 / Node.js | API structure & endpoint routing |
| | Prisma ORM | PostgreSQL type-safe database queries |
| | Redis | High-speed response caching for dashboard metrics |
| | Google Generative AI | `gemini-2.5-flash` model integration |
| | Multer | Multipart/form-data middleware for receipt uploads |
| | Clerk Express Middleware | Secure JWT token authorization verification |
| **Database** | PostgreSQL | Relational transactional persistence |

---

## 🗄️ Database Schema Design

Expenser employs a clean PostgreSQL database schema managed through Prisma:

* **User**: Connects directly to a Clerk auth identifier and tracks the overall ledger balance.
* **Transaction**: Stores individual transaction records (`INCOME`/`EXPENSE`) along with category types, dates, descriptions, receipt image links, and recurring frequency rules.
* **UserBudget & CategoryBudget**: Defines overall monthly budgets and maps individual category limits.
* **DailyExpense & DailyExpenseItem**: Aggregated database tables to cache day-level category expense sums.
* **MonthlyExpense & MonthlyExpenseItem**: Aggregated database tables to cache month-level category expense sums.
* **MonthlyIncome & MonthlyIncomeItem**: Aggregated database tables to cache month-level category income sums.
* **SpendingInsight**: Holds AI-computed system messages (e.g., burn rate warnings, budget overrides, predictions).
* **MonthlyReview**: Holds core financial KPIs alongside the Gemini-generated executive summary paragraph.

---

## 🚀 Getting Started

### 📋 Prerequisites
Ensure you have the following installed on your machine:
* **Node.js** (v18+ recommended)
* **pnpm** (or npm/yarn/bun)
* **PostgreSQL** instance
* **Redis** instance

### 🔑 Environment Configuration

#### 1. Server Configuration
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

#### 2. Client Configuration
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

### 1. Database Migrations (Server)
Navigate to the server directory and setup the database:
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
In a new terminal window:
```bash
cd client
pnpm install
pnpm dev # runs next dev on http://localhost:3000
```

---

## ⚙️ Caching and Cache Invalidation Strategy

To maintain extreme snappiness across dashboard metrics, the backend caches key stats endpoints in Redis:
* **Dashboard Data**: `dashboard:${clerkUserId}:${todayKey}` (Expires in 5 minutes)
* **Monthly Trend**: `monthly-trend:${clerkUserId}:${yearMonth}`
* **Weekly Pattern**: `weekly-spending:${clerkUserId}:${weekStartDate}`
* **Category Breakdown**: `category-breakdown:${clerkUserId}:${monthStartDate}`
* **Transaction List**: `txn-list:${clerkUserId}:${pageAndFilters}`

**Eviction Logic**: When a user creates, updates, or deletes a transaction, database transactions are wrapped with standard Redis `DEL` and `SCAN` operations to invalidate all matching client-specific keys, ensuring analytics dashboard components reflect accurate numbers immediately.
