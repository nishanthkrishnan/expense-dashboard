# Expense Dashboard

Personal expense tracker dashboard — reads from Google Sheets, deployed on Vercel.

## Local setup

```bash
# Install dependencies
npm install

# Create .env with your API key
cp .env.example .env
# Edit .env and add your Google Sheets API key

# Run dev server
npm run dev
```

## Prerequisites

1. **Google Sheets API key** — create one at [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials
2. **Sheet sharing** — make your Google Sheet "Anyone with the link can view"
3. **Sheets API enabled** — enable "Google Sheets API" in your Google Cloud project

## Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) and sign up with GitHub
3. Click "Import Project" → select this repo
4. Add environment variable: `VITE_GSHEET_API_KEY` = your API key
5. Deploy — Vercel auto-detects Vite and builds it

Every push to `main` auto-redeploys.

## Project structure

```
src/
  config.js          — Sheet ID and API key config
  sheets.js          — Google Sheets API fetch + parse
  constants.js       — Category/source color definitions
  utils.js           — Formatting and aggregation helpers
  barLabelPlugin.js  — Chart.js plugin for bar value labels
  App.jsx            — Main dashboard layout
  components/
    MonthFilter.jsx       — Month pill filter
    TrendChart.jsx        — Monthly spend bar chart
    CategoryChart.jsx     — Category breakdown horizontal bar
    TransactionTable.jsx  — Sortable transaction table
```
