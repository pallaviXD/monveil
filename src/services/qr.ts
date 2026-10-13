import QRCode from 'qrcode';
import type { Bill } from '../domain/types';
import { serializeBillQr } from './mockApi';

export async function generateBillQr(bill: Bill): Promise<string> {
  return QRCode.toDataURL(serializeBillQr(bill), {
    errorCorrectionLevel: 'M', margin: 1, width: 320,
    color: { dark: '#111025', light: '#F4EFE6' },
  });
}
