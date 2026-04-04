# HerbKeeper

HerbKeeper 是一套為中藥行設計的 Web-based 進銷存系統，使用 Next.js App Router、Supabase PostgreSQL、shadcn UI 與 Tailwind CSS。

目前已完成：

- Supabase migration，包含產品、客戶、進貨、訂單、部分出貨、現場銷貨與 inventory_ledger。
- Auth / RLS 權限模型，內建 profiles 與角色分級。
- 可重複執行的最小 seed data，用於實測 Products / Customers / Direct Sales 流程。
- Next.js App Router 基礎版型、中文導航與各功能模組頁面。
- Supabase browser / server helper 與線上環境變數相容處理。

## 專案結構

- `app/`: Next.js App Router 頁面與版型。
- `components/`: shadcn UI 與應用層元件。
- `lib/supabase/`: browser / server Supabase helper 與環境變數工具。
- `supabase/migrations/`: 資料庫 migration。
- `supabase/seed.sql`: 最小示範資料。
- `supabase/config.toml`: Supabase CLI 設定，支援 `db push --include-seed`。

## 線上 Supabase 設定

1. 安裝前端依賴。

```bash
pnpm install
```

2. 依照 `.env.example` 建立 `.env.local`，填入你的線上 Supabase 專案資訊：

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=<your publishable key>
SUPABASE_DB_PASSWORD=<your database password for Supabase CLI>
SUPABASE_SERVICE_ROLE_KEY=<optional service role key>
```

如果你目前沿用 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 或 `NEXT_PUBLIC_SUPABASE_ANON_KEY`，程式也會相容，不需要立刻改名。

3. 將 migration 套用到你的線上 Supabase 專案。

只套 schema / RLS：

```bash
supabase db push
```

連最小 seed 一起套到 staging 或驗證環境：

```bash
supabase db push --include-seed
```

目前資料庫 schema 與 seed 在：

- `supabase/migrations/202604040001_initial_tcm_inventory.sql`
- `supabase/migrations/202604040004_auth_rls_hardening.sql`
- `supabase/seed.sql`

4. 啟動 Next.js 應用程式。

```bash
pnpm dev
```

## 可用腳本

```bash
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm test:unit
pnpm test:unit:coverage
pnpm test:e2e
pnpm format
```

## 測試

### Unit tests

`Vitest` 目前覆蓋 `lib/` 下的 formatter、URL helper、Supabase env helper，以及 customers / products / orders / sales 的表單與 payload helper。

```bash
pnpm test:unit
pnpm test:unit:coverage
```

### Playwright E2E

E2E 會使用真實登入帳號進行核心流程驗證，因此執行前需要提供測試帳號：

```bash
E2E_USER_EMAIL=<test user email> \
E2E_USER_PASSWORD=<test user password> \
pnpm test:e2e
```

預設會自行啟動 `http://127.0.0.1:3100` 的 Next.js dev server。若你已經有一個可用中的測試站，可改用：

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3006 \
E2E_USER_EMAIL=<test user email> \
E2E_USER_PASSWORD=<test user password> \
pnpm test:e2e
```

首次在新環境執行 Playwright 前，記得安裝瀏覽器：

```bash
pnpm exec playwright install chromium
```

## 認證與角色模型

- 第一位透過 `/auth/register` 建立的帳號會自動成為 `admin`。
- 後續註冊帳號預設為 `operator`。
- `viewer` 角色預留給只讀帳號，可直接在 `public.profiles` 調整。
- RLS 已啟用，匿名角色不再能直接讀寫營運資料表。
- Orders / Shipments / Direct Sales 透過 security definer RPC 執行，但函式內仍會檢查登入者角色。

## 目前資料庫方式

目前專案直接連線到線上 Supabase 專案，不依賴本地 Docker。seed 與 migration 透過 Supabase CLI 直接推到 linked project。

## 目前已完成的功能切片

- Products CRUD
- Customers CRUD
- Orders 建立與訂單詳情
- Partial shipment 出貨流程
- Direct Sales POS-like 建立、列表與詳情
- Inventory 真實庫存總覽與低庫存 / 快取差異檢視
- Reports 日報、月報、交易歷史與熱銷排行
- 以資料庫 RPC + trigger 同步訂單履約與 inventory ledger
- 以資料庫 RPC + trigger 同步現場銷貨與 inventory ledger
- Email / Password 登入、註冊、登出與 proxy 保護
- Profiles + app_role 權限模型與 RLS 保護

## 下一步

## 部署前檢查

- 在 staging 先跑 `supabase db push --include-seed` 驗證完整流程。
- 在 production 只跑 `supabase db push`，不要帶入示範 seed。
- 至少建立一位 `admin` 帳號，並確認 `public.profiles.role` 與 `is_active` 正確。
- 確認 Supabase Auth 的 Email signup / password policy 符合營運需求。
- 以 `pnpm typecheck && pnpm lint && pnpm build` 做最後檢查。

## 下一步

接下來可往更完整的上線硬化推進：

- 盤點與補齊進貨 / 庫存調整 UI
- 為角色管理補一個 admin-only 的後台頁
- 增加端對端 smoke test，固定驗證 direct sales / order shipment 主流程
