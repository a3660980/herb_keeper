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
NEXT_PUBLIC_SITE_URL=https://your-app-domain.com
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=<your publishable key>
SUPABASE_DB_PASSWORD=<your database password for Supabase CLI>
SUPABASE_SERVICE_ROLE_KEY=<optional service role key>
```

如果你目前沿用 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 或 `NEXT_PUBLIC_SUPABASE_ANON_KEY`，程式也會相容，不需要立刻改名。

`NEXT_PUBLIC_SITE_URL` 建議在 Vercel production 使用正式網域；若未設定，程式會改從 `VERCEL_PROJECT_PRODUCTION_URL`、`VERCEL_BRANCH_URL` 或 `VERCEL_URL` 推導站台網址。

3. 將 migration 套用到你的線上 Supabase 專案。

只套 schema / RLS：

```bash
supabase db push
```

連最小 seed 一起套到 staging 或驗證環境：

```bash
supabase db push --include-seed
```

若要同步 `supabase/config.toml` 內的 Auth 設定，例如停用公開 signup，還需要另外執行：

```bash
supabase config push
```

這一步需要 Supabase management access token；若尚未設定，repo 內的 config 會先更新，但 hosted 專案不會立即套用。

目前資料庫 schema 與 seed 在：

- `supabase/migrations/202604040001_initial_tcm_inventory.sql`
- `supabase/migrations/202604040004_auth_rls_hardening.sql`
- `supabase/seed.sql`

4. 啟動 Next.js 應用程式。

```bash
pnpm dev
```

## 部署到 Vercel

1. 在 Vercel 匯入這個 repository，Framework Preset 使用 `Next.js`。

2. 在 Vercel 專案的 Environment Variables 至少設定這些值：

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=<your publishable key>
NEXT_PUBLIC_SITE_URL=https://your-production-domain.com
```

如果目前沒有使用到任何需要高權限的 server-only 管理操作，`SUPABASE_SERVICE_ROLE_KEY` 可以先不填。

3. 若你想讓 preview deployment 也能正確處理認證連結，建議二選一：

- 在 Vercel 開啟 system environment variables，讓 `VERCEL_URL` / `VERCEL_BRANCH_URL` 可供 server side 使用。
- 或只維持 production deployment，並固定設定 `NEXT_PUBLIC_SITE_URL`。

4. 到 Supabase Dashboard 的 Auth URL Configuration 更新：

- `Site URL` 設為你的 Vercel production 網域。
- `Redirect URLs` 加入你的 Vercel preview 網域與 production 網域，例如 `https://*.vercel.app/auth/login` 和正式網域的 `/auth/login`。

5. 在正式部署前，先於本機執行：

```bash
pnpm typecheck
pnpm lint
pnpm build
```

目前這個 repo 的 `pnpm build` 已可通過，Vercel 只要有正確環境變數即可直接部署。

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

GitHub Actions CI 目前會在 `master`、`staging` 與所有 Pull Request 上自動執行 `pnpm lint`、`pnpm test:unit` 與 Playwright E2E。

### GitHub Actions 自動備份到 Google Drive

repo 內已提供 [`.github/workflows/supabase-backup-google-drive.yml`](.github/workflows/supabase-backup-google-drive.yml) 作為免費版自動備份流程。它會每天匯出 Supabase `public` schema 的 data-only dump，上傳到 Google Drive，並另外保留一份 7 天的 GitHub artifact。

這支 workflow 預設保留最近 30 天的 Google Drive 備份；若要調整，可直接修改 workflow 內的 `BACKUP_RETENTION_DAYS`。

#### 需要的 GitHub repository secrets

- `SUPABASE_DB_URL`
- `GDRIVE_RCLONE_CONFIG`

`SUPABASE_DB_URL` 請使用 Supabase Dashboard 提供的 PostgreSQL connection string，建議選 direct connection 或 session mode，並保留 `sslmode=require`。

`GDRIVE_RCLONE_CONFIG` 請填入完整的 rclone Google Drive remote 設定內容，至少要包含 `[gdrive]`、`type = drive`、`token = ...`，並建議加上 `root_folder_id = 你的資料夾 ID`，讓備份固定寫入指定資料夾。

#### Google Drive 設定步驟

1. 在你的個人 Google Drive 建立一個備份專用資料夾。
2. 安裝 rclone，執行 `rclone config`。
3. 建立一個新的 remote，名稱填 `gdrive`，storage 選 `drive`。
4. scope 建議選完整存取，登入你的個人 Google 帳號完成 OAuth 授權。
5. 問到 root folder 時，可直接填你要存放備份的資料夾 ID；若當下先略過，也可以之後手動編輯。
6. 完成後打開本機的 `~/.config/rclone/rclone.conf`，複製整段 `[gdrive]` remote 設定。
7. 把整段內容存成 GitHub secret `GDRIVE_RCLONE_CONFIG`。

範例格式如下：

```ini
[gdrive]
type = drive
scope = drive
token = {"access_token":"...","token_type":"Bearer","refresh_token":"...","expiry":"..."}
root_folder_id = your_google_drive_folder_id
```

這種做法適合個人 Google Drive，因為它會直接使用你自己的雲端硬碟配額，不會再碰到 service account 沒有 storage quota 的限制。

#### workflow 目前的備份內容

- 使用 `pg_dump`
- 匯出格式為 custom dump
- 只備份 `public` schema 的資料
- 不包含 owner / privileges

這個策略適合目前 repo 的 migration-first 做法：schema 與 RPC 仍以 `supabase/migrations/` 為主，資料備份則專注在營運資料本身。

#### 還原範例

先套用 migration 重建 schema，再用備份檔還原資料：

```bash
pg_restore \
	--dbname="$TARGET_DB_URL" \
	--data-only \
	--no-owner \
	--no-privileges \
	--disable-triggers \
	supabase-public-data-YYYYMMDDTHHMMSSZ.dump
```

如果要先驗證檔案完整性，可對照同名的 `.sha256` 檔：

```bash
shasum -a 256 -c supabase-public-data-YYYYMMDDTHHMMSSZ.dump.sha256
```

### Unit tests

`Vitest` 目前覆蓋 `lib/` 下的 formatter、URL helper、Supabase env helper，以及 customers / products / orders / sales 的表單與 payload helper。

```bash
pnpm test:unit
pnpm test:unit:coverage
```

### Playwright E2E

E2E 使用預先在 Supabase Auth 建立的測試帳號登入並完成核心流程驗證。若 Supabase 啟用 email confirmation，測試會透過 service role 自動將既有測試帳號標記為已驗證，因此執行前需要提供以下環境變數：

```bash
SUPABASE_SERVICE_ROLE_KEY=<service role key> \
E2E_USER_EMAIL=<test user email> \
E2E_USER_PASSWORD=<test user password> \
pnpm test:e2e
```

請先在 Supabase Dashboard 的 Authentication > Users 建立 `E2E_USER_EMAIL` 對應帳號，並讓密碼與 `E2E_USER_PASSWORD` 一致。

預設會自行啟動 `http://127.0.0.1:3100` 的 Next.js dev server。若你已經有一個可用中的測試站，可改用：

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3006 \
SUPABASE_SERVICE_ROLE_KEY=<service role key> \
E2E_USER_EMAIL=<test user email> \
E2E_USER_PASSWORD=<test user password> \
pnpm test:e2e
```

首次在新環境執行 Playwright 前，記得安裝瀏覽器：

```bash
pnpm exec playwright install chromium
```

若要讓 GitHub Actions 也執行 E2E，請在 GitHub repository secrets 設定至少這五個值：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `E2E_USER_EMAIL`
- `E2E_USER_PASSWORD`

## 認證與角色模型

- 公開註冊入口已停用，帳號統一由 Supabase Auth 或管理端 API 建立。
- 第一位在 Supabase Auth 建立的帳號會自動成為 `admin`。
- 後續建立帳號預設為 `operator`。
- `viewer` 角色預留給只讀帳號，可直接在 `public.profiles` 調整。
- RLS 已啟用，匿名角色不再能直接讀寫營運資料表。
- Orders / Shipments / Direct Sales 透過 security definer RPC 執行，但函式內仍會檢查登入者角色。

## 目前資料庫方式

目前專案直接連線到線上 Supabase 專案，不依賴本地 Docker。seed 與 migration 透過 Supabase CLI 直接推到 linked project。

## 目前已完成的功能切片

- Products CRUD
- Inbounds 進貨歷史與供應商追蹤
- Inbounds 進貨建立
- Customers CRUD
- Orders 建立與訂單詳情
- Partial shipment 出貨流程
- Direct Sales POS-like 建立、列表與詳情
- Inventory 真實庫存總覽與低庫存 / 快取差異檢視
- Reports 日報、月報、交易歷史與熱銷排行
- 以資料庫 RPC + trigger 同步訂單履約與 inventory ledger
- 以資料庫 RPC + trigger 同步現場銷貨與 inventory ledger
- Email / Password 登入、登出與 proxy 保護
- Profiles + app_role 權限模型與 RLS 保護

## 下一步

## 部署前檢查

- 在 staging 先跑 `supabase db push --include-seed` 驗證完整流程。
- 在 production 只跑 `supabase db push`，不要帶入示範 seed。
- 至少在 Supabase Auth 建立一位 `admin` 帳號，並確認 `public.profiles.role` 與 `is_active` 正確。
- 確認 Supabase Auth 已關閉公開 Email signup，並只保留管理端建立帳號的流程。
- 確認 Supabase Auth 的 `Site URL` 與 `Redirect URLs` 已對齊 Vercel 網域。
- 以 `pnpm typecheck && pnpm lint && pnpm build` 做最後檢查。

## 下一步

接下來可往更完整的上線硬化推進：

- 盤點與補齊庫存調整 UI
- 為角色管理補一個 admin-only 的後台頁
- 增加端對端 smoke test，固定驗證 direct sales / order shipment 主流程
