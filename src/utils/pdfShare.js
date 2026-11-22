// src/utils/pdfShare.js
// ISSY - HTML del backend → PDF tamaño carta con nombre legible → menú de compartir.
// Lo usan el recibo (src/utils/receipts.js) y el Reporte de uso (app/admin/usage-report.js).

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

// Carta: 8.5 × 11 pulgadas a 72 puntos por pulgada
export const LETTER = { width: 612, height: 792 };

// fileName ya debe venir limpio y con .pdf. Si no se puede renombrar, se comparte con el nombre temporal.
export const shareHtmlAsPdf = async (html, { fileName, dialogTitle }) => {
  const { uri } = await Print.printToFileAsync({ html, ...LETTER });
  let fileUri = uri;
  try {
    const target = `${FileSystem.cacheDirectory}${fileName}`;
    await FileSystem.deleteAsync(target, { idempotent: true });
    await FileSystem.moveAsync({ from: uri, to: target });
    fileUri = target;
  } catch (e) {
    fileUri = uri;
  }
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('SHARING_UNAVAILABLE');
  }
  await Sharing.shareAsync(fileUri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle,
  });
};
