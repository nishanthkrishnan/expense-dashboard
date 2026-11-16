# Expense Dashboard — Design Spec

Status: **Living document.** Part 1 describes the dashboard as built (commit `2434df1`). Part 2 is where proposed changes are discussed and agreed before implementation.

---

## Part 1 — Current state

### 1.1 Purpose

A private, single-user web dashboard for household card spend. It reads transactions that the `expense-tracker` job writes to a Google Sheet and shows:

- **Spend analytics** — where money goes, by month and category, with large purchases optionally spread (amortized) over several months.
- **Settlement** — how shared expenses split between Nishanth (65%) and Navya (35%), and who owes whom for a month.

### 1.2 Architecture

```
Gmail (Citi alerts, ADCB PDFs)
   │  expense-tracker (GitHub Actions, daily cron + manual dispatch)
   ▼
Google Sheet ──────────────────────────────┐
  • all_transactions       (card, automated)│  Sheets API v4, read-only,
  • non_card_transactions  (manual entries) │  API key in browser
                                            ▼
                         expense-dashboard (React 18 + Vite SPA, Vercel)
                                            │  POST /api/trigger-sync
                                            ▼
                         Vercel function → GitHub workflow_dispatch
```

| Concern | Implementation |
|---|---|
| Framework | React 18, Vite 5, CSS Modules |
| Charts | Chart.js 4 via `react-chartjs-2`, custom `barLabelPlugin` for value labels |
| Data fetch | `src/sheets.js` — both tabs fetched in parallel on load; no refetch, no caching |
| Hosting | Vercel free tier; auto-deploys on push to `main`; preview deploys for other branches |
| Server code | One serverless function, `api/trigger-sync.js` |
| Config | `VITE_GSHEET_API_KEY` (build-time, shipped to browser); `GITHUB_SYNC_TOKEN` (Vercel server env) |

### 1.3 Data model

Each row from either tab is parsed into:

| Field | Type | Notes |
|---|---|---|
| `row_id` | string | Stable hash from the tracker; rows without `row_id` or `date` are dropped |
| `date` | `YYYY-MM-DD` | Transaction date |
| `source` | `Citi` \| `ADCB` \| other | Card / origin |
| `currency`, `amount` | string, number | Original currency and amount |
| `amount_aed` | number | Falls back to `amount` if blank — **all charts and totals use this** |
| `description` | string | Raw bank descriptor |
| `merchant_clean` | string | LLM-cleaned name; table falls back to `description` |
| `category` | string | Defaults to `Miscellaneous` if blank |
| `tags` | string | Stringified list; not displayed anywhere |
| `paid_by` | string | `Nishanth` / `Navya`; used only by Settlement |
| `exclude_overall` | `yes` / blank | Case-insensitive. Rows marked `yes` are removed **at load** — invisible everywhere |
| `exclude_from_split` | `yes` / blank | Kept in analytics, excluded from Settlement |
| `amortize_months` | int, default 1 | > 1 spreads the amount over N months (analytics only) |
| `amortize_start` | date | Month to start amortizing; defaults to `date` |

**Amortization rule** (`expandAmortized`): a row with `amortize_months = N > 1` becomes N virtual rows of `amount_aed / N`, dated the 1st of each consecutive month from `amortize_start`. Months after the current month are not generated.

### 1.4 Global UI

**Visual language**
- Font: DM Sans (Google Fonts, weights 400/500); monospace for amounts.
- Content width max 1120px, centred, `2rem 1.5rem` padding.
- Cards: white surface on an off-white page, 0.5px hairline borders, 12px radius, no shadows.
- Section labels: 11–13px uppercase, letter-spaced, tertiary grey.
- Light/dark themes follow the OS (`prefers-color-scheme`) via CSS variables in `src/index.css`. No manual toggle.

**Colour tokens — categories** (`src/constants.js`)

| Category | Bar colour | Badge bg / text |
|---|---|---|
| Grocery | `#1D9E75` green | `#E1F5EE` / `#085041` |
| Food Delivery | `#D85A30` orange | `#FAECE7` / `#712B13` |
| Entertainment | `#7F77DD` violet | `#EEEDFE` / `#3C3489` |
| Transport & Fines | `#3266ad` blue | `#E6F1FB` / `#0C447C` |
| Subscriptions | `#D4537E` pink | `#FBEAF0` / `#72243E` |
| Health | `#639922` olive | `#EAF3DE` / `#27500A` |
| Online Shopping | `#BA7517` amber | `#FAEEDA` / `#633806` |
| Housing & Utilities | `#888780` warm grey | `#F1EFE8` / `#444441` |
| Miscellaneous / Uncategorized | `#5F5E5A` dark grey | `#F1EFE8` / `#2C2C2A` |

Sources: Citi = blue badge, ADCB = amber badge. Unknown sources fall back to Citi's style.

**App shell** (`App.jsx`)
1. **PIN gate** — full-screen 4-digit keypad. Correct PIN unlocks for the browser session (`sessionStorage`). Wrong PIN shakes the dots and clears.
2. **Loading** — centred spinner, "Loading transactions...".
3. **Error** — card with the API error and a hint about `.env` and sheet sharing.
4. **Top nav** — folder-style tabs: *Spend analytics* | *Settlement*, and a right-aligned **Sync now** button.

**Sync now** — POSTs `/api/trigger-sync`, which dispatches the tracker's `daily_sync.yml` workflow on `main`. Label cycles `Sync now` → `Syncing…` → `Synced ✓` / `Failed ✗` (resets after 4s). "Synced" means the workflow was *queued*, not that new data has arrived.

**Month filter** (shared by both pages) — pill-shaped `<select>`: "All months" + every month present in the data, newest first, labelled `Nov 26`. Defaults to the current month. The selection persists when switching tabs.

### 1.5 Page — Spend analytics

Header: "Expense tracker" + month filter. Then two identical chart rows and a table:

| Section | Left (1.2fr) | Right (1fr) |
|---|---|---|
| **Actual spend** | Monthly spend trend | Category breakdown |
| **Amortized spend** | Monthly spend trend (amortized rows) | Category breakdown (amortized rows) |

Below 768px the two columns stack.

**Monthly spend trend** (`TrendChart`) — vertical bars, one per month, AED totals, value label above each bar (`1.2k` format), y-axis in `k`. Height 280px.
- *All months*: every month, all bars green.
- *A month selected*: a 4-month window around it (selected month highlighted green, others muted grey). The window shifts to stay within available data.

**Category breakdown** (`CategoryChart`) — horizontal bars sorted by spend, coloured per category. Title: "Category breakdown — Nov 26 (AED)". Value labels sit inside the bar (white) or just outside if the bar is short. Tooltip shows `AED 1,234 (23%)`. Height grows with the number of categories (36px each, min 200px).

**Transactions table** (`TransactionTable`) — uses *actual* (not amortized) rows for the selected month.
- Columns: Date (ISO) · Merchant (`merchant_clean` or raw description) · Category badge · Source badge · Amount (AED, rounded, right-aligned mono).
- Always sorted by amount, descending; shows **top 30 only** ("Top 30 of 87 transactions").
- Multi-select category filter dropdown with colour dots and "Clear selection".
- Horizontally scrollable on narrow screens.

### 1.6 Page — Settlement

Header: "Settlement" + month filter. Uses actual rows for the month, minus `exclude_from_split = yes`.

1. **Metric cards** (3 across, stacked on mobile): Total splittable (with count and excluded count) · Nishanth's share (65%) · Navya's share (35%).
2. **Expense split ratio** — legend + a 65/35 two-segment bar (blue / pink).
3. **Person cards** (2 across): avatar initials, share %, then *Should pay*, *Actually paid* (sum where `paid_by` matches), *Transactions* count, *Balance* (green "Overpaid AED x" / red "Underpaid AED x").
4. **Verdict** — "Settlement for Nov 26", large amount, and "Navya owes Nishanth" / "Nishanth owes Navya" / "Settled".

Names, initials, colours and the 65/35 ratio are hard-coded in `SettlementPage.jsx`.

### 1.7 Responsive behaviour

Single breakpoint at 768px: chart rows, metric cards and person cards collapse to one column. Nav tabs and the sync button stay on one row. The table scrolls horizontally.

### 1.8 Known gaps and quirks (observed in code)

Not decisions — candidates for Part 2.

**Behaviour**
- Sync doesn't refresh data. After a sync you have to reload the page, and the button can't tell whether the workflow succeeded.
- The transactions table is capped at 30 rows, has no sort controls, no search, and no pagination. The README calls it "sortable"; it isn't.
- Uncategorised rows are indistinguishable from genuine *Miscellaneous* spend (e.g. the 42 rows from the Nov 2026 Gemini outage).
- `tags`, `currency` and original `amount` are fetched but never shown. Foreign-currency spend isn't visible as such.
- The default month uses UTC (`toISOString`), so between 00:00–04:00 Dubai time on the 1st it still selects the previous month.
- Data is fetched even while the PIN gate is showing.

**Visual**
- Dark-mode chart colours are read once at render; changing the OS theme needs a reload.
- The verdict card is always green, even when the reader owes money.
- Axis ticks use `Math.round(v/1000) + 'k'`, so axes under AED 1,000 read `0k, 0k, 1k`.
- Weights 600/700 are used, but only 400/500 are loaded, so the browser synthesises bold.
- Miscellaneous and Housing & Utilities share a badge background.

**Security** (personal app, but worth knowing)
- The PIN (`1357`) is in the client bundle; it hides the UI but doesn't protect data.
- The Sheets API key is in the browser bundle, and the sheet is "anyone with the link can view".
- `/api/trigger-sync` has no auth, so anyone with the URL can trigger the workflow.

---

## Part 2 — Proposed changes

Process: add a proposal below → discuss → mark **Agreed** → implement on a branch → check the Vercel preview → merge to `main`.

Template:

```
### P-<n>: <short title>
Status: Proposed | Agreed | Rejected | Done
Problem:   what's wrong / missing today (link to 1.x if relevant)
Proposal:  what changes, from the user's point of view
Design:    layout / states / mobile behaviour; sketch if useful
Data:      any sheet or tracker changes needed
Out of scope:
Open questions:
```

### Target layout — Spend analytics (after P-1 to P-3)

```
┌ Expense tracker ─────────────────────────────── [ Nov 26 ▾ ] ┐
│ AMORTIZED SPEND                                              │
│ ┌ Monthly spend trend ────────┐ ┌ Category breakdown ──────┐ │
│ └─────────────────────────────┘ └──────────────────────────┘ │
│ CATEGORY COMPARISON  (Aug 26 – Nov 26)              (P-3)    │
│ ┌ Grocery ──┐ ┌ Food Del. ┐ ┌ Transport ┐                    │
│ │ ▁ ▃ ▂ █   │ │ ▂ ▂ ▃ █   │ │ █ ▃ ▂ ▅   │   … one per category│
│ └───────────┘ └───────────┘ └───────────┘                    │
│ ▸ ACTUAL SPEND  ·  AED 6,420                 (P-1, collapsed)│
│ ┌ Transactions ─ [🔍 Search…] [All categories ▾] 87 txns ──┐ │
│ │ DATE ▼ │ MERCHANT │ CATEGORY │ SOURCE │ AMOUNT ⇅       (P-2)│
│ └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### P-1: Amortized spend first, actual spend collapsed
Status: Done (fd67558)

**Problem:** Actual spend is shown first, but amortized spend is the more useful monthly view, since one-off big purchases otherwise dominate their month.

**Proposal:**
- Reorder the page: **Amortized spend** section at the top, then the P-3 category comparison, then **Actual spend**, then the transactions table.
- Actual spend becomes a collapsible section, **collapsed by default**.

**Design:**
- Collapsed: a single full-width row with a chevron, the label `ACTUAL SPEND`, and the actual total for the selected month (e.g. `· AED 6,420`), so the number is visible without expanding.
- Click (or Enter/Space) toggles it; the chevron rotates. Expanded content is the existing trend + category pair, unchanged.
- Open/closed state is remembered per browser (`localStorage`) and falls back to collapsed.
- Mobile: same behaviour; the collapsed row stays one line.

**Data:** None.

**Out of scope:** Changing the charts themselves.

### P-2: Full transaction list with sorting and search
Status: Done (fd67558)

**Problem:** The table shows only the top 30 transactions by amount, with no way to re-sort or find a specific transaction (§1.8).

**Proposal:**
- List **every** transaction in the selected timeframe (one month, or all months when "All months" is selected).
- Default sort: **date, newest first**.
- Sort by **date** or **amount**, both ascending and descending, by clicking the column header. Clicking cycles that column desc → asc. The active column shows ▲/▼; the inactive one shows a faint ⇅. Ties on amount sort by date (newest first); ties on date sort by amount (largest first).
- A **search bar** in the table header filters rows as you type.

**Search behaviour:**
- Case-insensitive substring match across: merchant (`merchant_clean`), raw `description`, `category`, `source`, `tags`, `paid_by`, `currency`, `date`, and the amount.
- Amounts match on their displayed text, so `210` finds `AED 210` and `210.05`; the original foreign amount is searchable too (e.g. `OMR`).
- Several words are ANDed: `talabat nov` → Talabat rows dated in November. Month names (`nov`, `november`) match too.
- Search combines with the existing category filter (both must match). A ✕ button clears the search.
- The count label reflects the filter: `12 of 87 transactions`. Empty state: "No transactions match "xyz"".

**Design:**
- Header row: `Transactions` · search input (grows to fill) · category dropdown · count. On mobile the search input wraps to its own full-width line.
- Long lists: show the first **50** rows plus a `Show all 312` button. Sorting and search apply to the full set, not just the visible 50.
- Rows remain *actual* transactions (not amortized virtual rows).

**Data:** None. Everything needed is already fetched.

**Out of scope:** Editing transactions from the dashboard, and exporting.

### P-3: Category comparison across months
Status: Done (fd67558)

**Problem:** You can see this month's category split or the overall monthly trend, but not "is Grocery up or down compared with the last few months?"

**Proposal:** A new **Category comparison** section directly below the amortized summary: one small bar chart per category (small multiples).

**Design:**
- **Months shown:** the same months as the amortized trend chart above it, i.e. the 4-month window around the selected month. Section subtitle states the range: `Aug 26 – Nov 26`.
- **Each card:** category name and colour dot, the selected month's amount (`AED 1,840`), and the change vs the average of the other months in the window (`▲ 18% vs avg`). Below that, a mini vertical bar chart with one bar per month.
- **Highlighting:** the selected month's bar is in the category's colour; other months are a muted tint of it. Value labels sit above bars (`1.2k`).
- **Order:** by selected-month spend, descending. Categories with no spend in the selected month but spend elsewhere in the window go last. Categories with no spend anywhere in the window are hidden.
- **Grid:** 3 per row on desktop, 2 on tablet, 1 on mobile. Each chart is about 140px tall.
- **Scale:** each mini chart has its own y-scale (no y-axis drawn; value labels on bars), so small categories stay readable.
- **Data used:** amortized rows, to match the section above.
- **"All months" selected:** the window is capped at the **latest 12 months** so the charts stay readable and fast; no month is highlighted, and the card header shows the monthly average instead of a delta.
- Tooltip on a bar: `Grocery · Oct 26 · AED 1,560`.

**Data:** None. It reuses `expandAmortized` plus a per-category, per-month aggregation.

**Out of scope:** Clicking a bar to change the selected month (could be a follow-up).

### P-4: Category drill-down
Status: Agreed

**Problem:** A bar tells you *how much* went to a category, not *what* made it up. Finding out means scrolling to the table and filtering by hand, and for amortized bars and other months the table can't show it at all.

**Proposal:** Click any category bar to open a **details panel** that shows what contributed to it. The page underneath doesn't move.

**Where it works:**

| Click on | Opens |
|---|---|
| A bar in **Category breakdown** (amortized or actual) | That category, the selected month, from that chart's data (amortized or actual) |
| A bar in a **Category comparison** card | That category, **that bar's month**, amortized |
| The **category name** on a breakdown y-axis or a comparison card header | Same as clicking its bar for the selected month (a larger, keyboard-reachable target) |

Bars with zero spend aren't clickable. Bars show a pointer cursor on hover, and tooltips gain a second line: `Click for details`.

**Why a side panel** (and not an inline expansion or a popover):
- Inline expansion pushes the rest of the page down and moves the chart you just clicked. That's disruptive, especially in the 3-column comparison grid.
- A popover is too small for a list of transactions.
- A side panel keeps the clicked chart visible next to it, closes in one action, and you can click another bar to swap its content without closing it first.

**Layout:**

```
                                   ┌──────────────────────────────┐
  (page stays visible,             │ ● Grocery              ✕     │
   lightly dimmed)                 │ ‹ Sep 26    Oct 26    Nov 26 ›│
                                   │ AED 1,587 · 23 transactions   │
                                   │ ▼ 12% vs window avg · Amortized│
                                   │──────────────────────────────│
                                   │ TOP MERCHANTS                │
                                   │ Amazon        ████████  52%  │
                                   │ Lulu          ███       21%  │
                                   │ Big Buy       ██        11%  │
                                   │ +4 more       ██        16%  │
                                   │──────────────────────────────│
                                   │ TRANSACTIONS      Amount ▾   │
                                   │ Oct 05 Amazon     Citi   200 │
                                   │ Oct 17 Amazon     Citi   305 │
                                   │ Mar 12 IKEA ↻ 1/6 of 1,200   │
                                   │ …                            │
                                   └──────────────────────────────┘
```

- **Desktop / tablet:** panel slides in from the right, 400px wide, full height. A light dimming layer over the page. Closes on ✕, Esc, or clicking the dimmed page.
- **Mobile (< 560px):** bottom sheet, up to 85% of the screen height, with its own scroll area. Closes on ✕ or tapping above it.
- **Header:** category colour dot and name. Month switcher (‹ ›) to step through months without closing; it stops at the first and last month with data. Total, transaction count, change vs average of the comparison window, and an `Amortized` / `Actual` chip so it's clear which numbers you're looking at.
- **Top merchants:** grouped by cleaned merchant name, up to 5 rows plus `+N more`, each with a thin bar in the category colour and its share %. Clicking a merchant filters the transaction list below to it (click again to clear).
- **Transactions:** every row in that category and month, largest first, with a toggle to sort by date. Each row shows date, merchant, source badge and amount. Foreign-currency rows also show the original amount (`OMR 262.50`).
- **Amortized slices:** when the panel shows amortized data, a slice of a spread-out purchase shows a ↻ marker and `1/6 of AED 1,200 · bought Mar 26`, so it's clear why an older purchase appears in this month.
- **Focus:** keyboard focus moves into the panel on open and returns to what you clicked on close. The clicked bar stays highlighted (outlined) while the panel is open.
- **"All months" selected:** breakdown bars open the category across all months (no month switcher); comparison bars still open their specific month.

**Data:** None. Rows are already loaded; the panel filters existing data by category and month.

**Out of scope:** Editing or recategorising from the panel (could later link to the sheet row); drill-down from the monthly trend bars (whole-month view).

---

## Decisions

| # | Question | Decision |
|---|---|---|
| 1 | P-1: remember expanded state? | Yes, per browser (`localStorage`), default collapsed |
| 2 | P-2: long lists | First 50 rows + "Show all" button |
| 3 | P-2: month names in search | Yes: `nov`, `november`, `nov 26` and ISO `2026-11` all match |
| 4 | P-3: y-scale | Independent per category |
| 5 | P-3: window size | Same as the trend chart (4 months around the selection); "All months" capped at the latest 12 |
| 6 | P-3: Miscellaneous card | Shown like any other category |
| 7 | P-4: panel style | Side panel (bottom sheet on mobile) |
| 8 | P-4: month switcher | Included in the first version |
| 9 | P-4: actual-spend breakdown | Clickable, opens the panel with an `Actual` chip |

## Open questions

_None._
