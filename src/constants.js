export const CATEGORIES = {
  'Grocery':            { color: '#1D9E75', bg: '#E1F5EE', text: '#085041' },
  'Food Delivery':      { color: '#D85A30', bg: '#FAECE7', text: '#712B13' },
  'Entertainment':      { color: '#7F77DD', bg: '#EEEDFE', text: '#3C3489' },
  'Transport & Fines':  { color: '#3266ad', bg: '#E6F1FB', text: '#0C447C' },
  'Subscriptions':      { color: '#D4537E', bg: '#FBEAF0', text: '#72243E' },
  'Health':             { color: '#639922', bg: '#EAF3DE', text: '#27500A' },
  'Online Shopping':    { color: '#BA7517', bg: '#FAEEDA', text: '#633806' },
  'Housing & Utilities':{ color: '#888780', bg: '#F1EFE8', text: '#444441' },
  'Miscellaneous':      { color: '#5F5E5A', bg: '#F1EFE8', text: '#2C2C2A' },
  'Uncategorized':      { color: '#5F5E5A', bg: '#F1EFE8', text: '#2C2C2A' },
};

export const SOURCE_COLORS = {
  'Citi': { bg: '#E6F1FB', text: '#0C447C' },
  'ADCB': { bg: '#FAEEDA', text: '#633806' },
};

export function getCatStyle(category) {
  return CATEGORIES[category] || CATEGORIES['Miscellaneous'];
}

export function getSrcStyle(source) {
  return SOURCE_COLORS[source] || SOURCE_COLORS['Citi'];
}
