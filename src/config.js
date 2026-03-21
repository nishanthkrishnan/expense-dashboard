// Google Sheets configuration
// The API key is read from the VITE_GSHEET_API_KEY environment variable.
// Set it in a .env file locally or in Vercel's environment variables for production.

export const SHEET_ID = '1n26XhedIou5H50DZyoJ58seJBdkTGYtrWH1ADm6H6FY';
export const TAB_CARD_TRANSACTIONS = 'all_transactions';
export const TAB_MANUAL_TRANSACTIONS = 'non_card_transactions';
export const API_KEY = import.meta.env.VITE_GSHEET_API_KEY || '';
