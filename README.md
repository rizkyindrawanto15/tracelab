# TraceLab — Build. Test. Debug. Ship.

TraceLab is a modern, high-performance API testing and development platform inspired by Postman, Insomnia, Linear, and Vercel.

---

## Features

- **Real HTTP Execution Engine**: Real Fetch API execution supporting `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, and `OPTIONS` with request cancellation (`AbortController`), timeout control, and transparent CORS handling.
- **SSRF-Hardened Request Proxy**: An optional, server-side relay with connection-time DNS validation blocking private, loopback (`127.0.0.1`, `localhost`), and cloud-metadata addresses (`169.254.169.254`).
- **Response Inspector**: Multi-mode response viewer:
  - **Pretty**: Self-hosted Monaco editor with JSON syntax coloring.
  - **Raw**: Unformatted response with in-body text search highlighting.
  - **Tree**: Interactive JSON object tree with property path navigation (`user.address.city`) and subtree copying.
  - **Preview**: Sandboxed iframe with scripts disabled for safe HTML rendering, plus image previews.
  - **Headers & Cookies**: Complete response headers and parsed cookies table.
- **Declarative Testing & Assertions**: Run tests on status codes, latency budgets, body contents, and JSON property paths without executing unsafe user JavaScript.
- **Dynamic Environments**: Manage `Local`, `Development`, `Staging`, and `Production` environments. Variables like `{{base_url}}` and `{{api_token}}` automatically resolve across URLs, headers, and request bodies with automatic secret masking.
- **Collections & Workspaces**: Organize endpoints hierarchically, save requests, duplicate workflows, and collaborate with team members.
- **Code Generator**: Export requests instantly to copy-pasteable snippets in **cURL**, **JavaScript Fetch**, and **Node.js**.
- **JSON Utilities**: Format, minify, and validate JSON payloads with exact line and column syntax error diagnostics.
- **API Documentation**: Document endpoints, request/response examples, and descriptions with live previews and collection importing.
- **Raycast-Style Command Palette**: Press `⌘K` or `Ctrl+K` to search requests, jump between environments, switch themes, and execute actions at speed.
- **Dual-Mode Persistence**:
  - **Cloud Mode**: Supabase PostgreSQL with Row Level Security (RLS) on all 8 tables.
  - **Local Mode**: Out-of-the-box local storage mode if Supabase credentials are not configured.

---

## Tech Stack

- **Framework**: Next.js 15 (App Router, Server & Client Components)
- **Language**: TypeScript (Strict mode)
- **Styling**: Tailwind CSS v4, Lucide React, Geist font
- **Components**: Radix UI primitives, `cmdk`, `react-resizable-panels`, `sonner` toasts
- **Code Editor**: Self-hosted Monaco Editor AMD build
- **Database & Auth**: Supabase SSR (`@supabase/ssr`, `@supabase/supabase-js`)
- **State & Data**: Zustand, TanStack Query v5, React Hook Form, Zod v3
- **Animations**: Framer Motion v12
- **Testing**: Vitest v3

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment (Optional for Cloud Mode)
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
If left unconfigured, TraceLab automatically runs in **Local Mode**, storing your workspaces, collections, environments, and history securely in your browser.

### 3. Database Migrations (When using Supabase)
Apply the complete migration in `supabase/migrations/20261117000000_init.sql` to your Supabase PostgreSQL instance:
```bash
# Using Supabase CLI:
supabase db push
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Scripts

- `npm run dev` — Starts the Next.js development server
- `npm run build` — Compiles the production build
- `npm run start` — Runs the production server
- `npm run test` — Executes Vitest unit and integration tests
- `npm run typecheck` — Validates all TypeScript types with `tsc --noEmit`
