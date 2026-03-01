// Monedas soportadas — portable del frontend web
export const SUPPORTED_CURRENCIES = {
  HNL: { code: 'HNL', symbol: 'L',  name: 'Lempira hondureño' },
  USD: { code: 'USD', symbol: '$',  name: 'Dólar estadounidense' },
  GTQ: { code: 'GTQ', symbol: 'Q',  name: 'Quetzal guatemalteco' },
  MXN: { code: 'MXN', symbol: '$',  name: 'Peso mexicano' },
  EUR: { code: 'EUR', symbol: '€',  name: 'Euro' },
};

export const formatCurrency = (amount, currencyCode = 'HNL') => {
  const currency = SUPPORTED_CURRENCIES[currencyCode] || SUPPORTED_CURRENCIES.HNL;
  const num = parseFloat(amount) || 0;
  const parts = num.toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${currency.symbol} ${parts[0]}.${parts[1]}`;
};

export const getCurrencySymbol = (currencyCode = 'HNL') => {
  return SUPPORTED_CURRENCIES[currencyCode]?.symbol || 'L';
};
