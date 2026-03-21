import { SHEET_ID, TAB_CARD_TRANSACTIONS, API_KEY } from './config';

/**
 * Fetch all rows from a Google Sheet tab via the Sheets API (public/API key auth).
 * Returns an array of objects keyed by header row.
 */
export async function fetchSheetData(tabName = TAB_CARD_TRANSACTIONS) {
  if (!API_KEY) {
    throw new Error(
      'Missing API key. Set VITE_GSHEET_API_KEY in your .env file.'
    );
  }

  const range = encodeURIComponent(tabName);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?key=${API_KEY}`;

  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      `Sheets API error ${res.status}: ${err?.error?.message || res.statusText}`
    );
  }

  const json = await res.json();
  const rows = json.values || [];

  if (rows.length < 2) return [];

  const headers = rows[0];
  return rows.slice(1).map((row) => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] || '';
    });
    return obj;
  });
}

/**
 * Parse raw sheet rows into typed transaction objects.
 */
export function parseTransactions(rawRows) {
  return rawRows
    .filter((r) => r.row_id && r.date)
    .map((r) => ({
      row_id: r.row_id,
      date: r.date,
      source: r.source || '',
      currency: r.currency || 'AED',
      amount: parseFloat(r.amount) || 0,
      description: r.description || '',
      category: r.category || 'Miscellaneous',
      tags: r.tags || '',
      merchant_clean: r.merchant_clean || '',
      paid_by: r.paid_by || '',
      exclude_from_split: r.exclude_from_split || '',
      exclude_overall: r.exclude_overall || '',
      amount_aed: parseFloat(r.amount_aed) || parseFloat(r.amount) || 0,
      amortize_months: parseInt(r.amortize_months) || 1,
      amortize_start: r.amortize_start || '',
    }));
}
