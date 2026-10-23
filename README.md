# Stockflow — React inventory workspace

Component-based React + Vite frontend.

## Login and roles

Dashboard uses the authenticated `GET /api/dashboard?companyId=<MongoDB company ID>` endpoint. Omit companyId for All companies. Counts and sums cover the complete database scope, independent of shipment pagination and table filters. Active shipments include Pending, Dispatched and In-transit (blank/`-` is In-transit). Invoice line counts exclude lines linked by shipmentKey to an inactive master; unmatched lines remain included. Connected portals count active portal records; the shipment breakdown also retains archived portals with active shipments. Company changes cancel stale dashboard requests, and uploads/edits refresh the summary.

Start the backend in `F:\rajat soni\Inventory_backend` with `npm run dev`, then start this frontend with `npm run dev`. Vite forwards `/api` and `/uploads` to `http://localhost:5000`; keep `VITE_API_BASE_URL=/api` for local development.

The first visitor registers the one Super Admin account. Registration closes after this account exists. Log in, open the avatar dropdown, choose **Create user**, and enter a team member's name, email, password, and role. New passwords must contain 8–12 characters with at least one uppercase letter, lowercase letter, number, and special character. Registration, Create user, and Login show pending password rules on focus and “Password is strong” when all rules are met. Login still accepts existing passwords without applying the new creation policy as a login restriction.

| Role | Create/manage users | Add/manage companies |
| --- | --- | --- |
| Super Admin | Admin, Manager, Executive, Visitor | Yes |
| Admin | Own Manager, Executive and Visitor accounts | Yes |
| Manager | No | No |
| Executive | No | No |
| Visitor | No | No |

Role changes require the affected user to log in again. Manager and Executive see a disabled Add company button; the backend independently rejects unauthorized company mutations. Inventory APIs and saved POD files require login. Existing inventory remains a shared workspace across these roles.

Visitors are read-only: View/edit, Add record, Add portal and Excel upload controls are disabled, and write requests are rejected by the backend. Executives can add new records through **New upload** or Add record, and can manually View/edit existing shipment records, including POD uploads. These changes are attributed to the Executive in Activity history. The server forces Executive imports to append-only even if a request asks to update existing records.

**New upload** skips matching rows and only adds new data. Existing fields, timestamps and history remain unchanged. **Upload Excel** lets Admin/Super Admin (and the existing Manager role) add and review updates to matching rows. Neither mode deletes old rows. The completion toast reports added, updated and skipped counts.

Admin/Super Admin can open **Activity history** from the avatar dropdown, filter by user, and inspect user name/email/role, time, invoice, and before/after field values. New records, Excel updates, manual edits (including linked invoice changes), and manual POD uploads are recorded atomically alongside the changed shipment. Existing records have no retrospective history; tracking starts when this feature is enabled. History is read-only through the API.

Passwords are salted and hashed with scrypt. Sessions use HttpOnly, SameSite=Strict cookies, server-side token hashes, and an eight-hour expiry. Logout revokes the session. Backend `FRONTEND_ORIGINS` accepts comma-separated frontend origins (defaults to localhost/127.0.0.1 on port 5173). For production use HTTPS, `NODE_ENV=production`, and a same-origin reverse proxy for `/api` and `/uploads`; Vite's development proxy is not part of the built files.

Backend authentication regression tests: `node --test tests/auth.test.js` from the backend directory. These tests use isolated model stubs and do not register accounts in your database.

## Documents

Open **Documents** in the sidebar. Only Super Admin can upload files or connect a file, folder, or drive on the backend computer. The path picker browses the backend machine; browser Upload files sends selected files once and does not continuously sync the user's computer.

Connected sources watch filesystem events while the backend runs, debounce writes for 500 ms, and retain a 30-second recovery scan. The Documents page uses authenticated owner-scoped SSE to refresh after changes; a 30-second fallback runs only while SSE is unavailable. Two source scans and two GridFS writes can run concurrently, with bounded queues and coalesced file-change events. Page sizes of 10, 25, 50 or 100 and numbered pagination are available. New or changed files stream into MongoDB GridFS; source deletion and disconnect retain the stored copy. Pause stops future scans, Resume rescans, and reconnect uses the same source. System folders, symlinks, credential files (`.env`), `.aws`, `.ssh`, `.codex`, `.git`, and `node_modules` are excluded. Uploads have a 1 GB per-file limit. Preview supports PDF, images and plain text up to 25 MB; other files can be downloaded.

All child users, including child Admins, can only view and download files belonging to their Super Admin ancestor. The backend rejects child upload, drive browsing and all sync/source mutations independently of UI controls. Source paths are only returned to the owner. Existing inventory permissions remain separate.

Restart `Inventory_backend` after updating these routes. Existing Drive_Folder accounts and sources are not automatically imported. Verification: run `node --test tests/documents.test.js` in the backend directory.

## Run

Requires Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
npm run build
npm run preview
npm test
```

Use the URL printed by Vite. Opening index.html directly does not compile JSX.

## Structure

- src/App.jsx: navigation and feature composition.
- src/pages/: separate Dashboard and Shipments pages.
- src/components/layout/: Sidebar and Header.
- src/components/dashboard/: StatsCards.
- src/components/shipments/: table, filters, pagination, portal tabs and form.
- src/components/portals/: custom portal modal.
- src/components/import/: Excel upload and preview.
- src/components/common/: reusable Modal and Toast.
- src/hooks/useInventory.js: inventory state and browser persistence.
- src/utils/shipments.js: pure validation, status, linked edits and import logic.
- src/utils/excel.js: local XLSX reader.
- src/data/shipments.json: initial data from supplied workbooks.
- src/styles.css: responsive design.
- tests/shipments.test.js: regression checks.

## Behavior

All 25 Master Shipment and 19 Merge Shipment fields are preserved. Blank status displays as Pending. Pending, Dispatched and In-transit records are active; delivered records are excluded. Search, company/status filters, pagination, add/edit forms and dynamic marketplace tabs work locally.

Upload Excel accepts standard unencrypted .xlsx files up to 20 MB using the supplied template headers. All workbook tabs are validated, a preview is shown, and matching records update without duplication. Import Master before Merge. Delivered or unmatched invoice lines are skipped and counted. No workbook is sent to a server. Monetary fields remain independent as supplied.

The original stockflow-transit-v1 localStorage key retains legacy browser data on the same origin. Current records are stored in the backend MongoDB database. Browser preferences and legacy data remain specific to the frontend origin.

Build output is in dist/. Google Fonts have system-font fallbacks. Original Excel files remain unchanged. extract_data.py can regenerate the initial JSON using Python and openpyxl.

Company workspace: use Select company to scope Dashboard, Master Shipment and Merge Shipment. Add company creates and selects an empty company; it appears in both shipment forms. Company names from Excel imports are included automatically. All companies restores the combined view. Company selection and new names persist in browser storage.
