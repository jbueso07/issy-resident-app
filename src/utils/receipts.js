// src/utils/receipts.js
// ISSY - Recibos del residente: textos, formato y PDF.
// El recibo NO se arma en el app: el HTML viene del backend (un solo diseño) y aquí solo se
// muestra en la vista previa del sistema o se convierte a PDF para compartir.

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

// "Factura" solo cuando la residencial emite recibo fiscal (igual que la web); si no, "Recibo".
export const isInvoice = (receipt) => receipt?.receipt_type === 'fiscal';

export const receiptKindWord = (receipt) => (isInvoice(receipt) ? 'Factura' : 'Recibo');

export const receiptTitle = (receipt) =>
  `${receiptKindWord(receipt)} ${receipt?.receipt_number || ''}`.trim();

export const isVoided = (receipt) => receipt?.status === 'void';

export const receiptStatusLabel = (receipt) => (isVoided(receipt) ? 'Anulado' : 'Vigente');

export const formatMoney = (amount, currency = 'HNL') => {
  const symbol = currency === 'USD' ? '$' : 'L';
  const value = Number(amount) || 0;
  return `${symbol} ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Fechas solo-día ('2026-08-01') se anclan a mediodía UTC para no mostrar el día anterior en UTC-6
export const formatReceiptDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(dateString) ? `${dateString}T12:00:00Z` : dateString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('es-HN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Tegucigalpa',
  });
};

// RTN de 14 números → 0801-1990-123456; otro valor, tal cual
export const formatRtn = (taxId) => {
  const digits = String(taxId || '').replace(/[\s-]/g, '');
  if (/^\d{14}$/.test(digits)) return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8)}`;
  return taxId ? String(taxId) : '';
};

// Mismas reglas y mensajes que el backend (normalizeBilling)
export const BILLING_NAME_MESSAGE = 'El nombre para los recibos debe tener entre 2 y 150 letras, o dejarse vacío.';
export const BILLING_TAX_ID_MESSAGE = 'El RTN debe tener 14 números, o dejarse vacío.';

export const validateBilling = ({ billingName, taxId }) => {
  const name = String(billingName || '').replace(/\s+/g, ' ').trim();
  const tax = String(taxId || '').replace(/[\s-]/g, '');
  const errors = {};
  if (name && (name.length < 2 || name.length > 150)) errors.billingName = BILLING_NAME_MESSAGE;
  if (tax && !/^\d{14}$/.test(tax)) errors.taxId = BILLING_TAX_ID_MESSAGE;
  return { ok: Object.keys(errors).length === 0, errors, value: { billingName: name, taxId: tax } };
};

// Recibo-REC-00001250.pdf / Factura-000-001-01-00000124.pdf
export const receiptPdfName = (receipt) => {
  const number = String(receipt?.receipt_number || receipt?.id || 'recibo').replace(/[^A-Za-z0-9-]/g, '-');
  return `${receiptKindWord(receipt)}-${number}.pdf`;
};

// Mensaje para el residente según el error de la API
export const receiptErrorMessage = (result) => {
  if (result?.status === 404) return 'No encontramos ese recibo.';
  if (result?.sessionExpired) return 'Tu sesión terminó. Vuelve a iniciar sesión para ver tus recibos.';
  return 'No pudimos preparar el recibo. Inténtalo de nuevo.';
};

// Vista previa del sistema (iPhone: vista del documento con compartir; Android: imprimir / Guardar como PDF)
export const previewReceiptHtml = (html) => Print.printAsync({ html, width: 612, height: 792 });

// PDF tamaño carta con nombre legible, y menú de compartir
export const shareReceiptPdf = async (html, receipt) => {
  const { uri } = await Print.printToFileAsync({ html, width: 612, height: 792 });
  let fileUri = uri;
  try {
    const target = `${FileSystem.cacheDirectory}${receiptPdfName(receipt)}`;
    await FileSystem.deleteAsync(target, { idempotent: true });
    await FileSystem.moveAsync({ from: uri, to: target });
    fileUri = target;
  } catch (e) {
    // Si no se pudo renombrar, se comparte con el nombre temporal
    fileUri = uri;
  }
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('SHARING_UNAVAILABLE');
  }
  await Sharing.shareAsync(fileUri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: 'Compartir recibo',
  });
};
