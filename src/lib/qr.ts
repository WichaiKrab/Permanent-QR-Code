import QRCode from 'qrcode';
import { QRSettings } from '../types';

export async function generateQRDataUrl(text: string, settings: QRSettings): Promise<string> {
  try {
    const url = await QRCode.toDataURL(text, {
      width: settings.size,
      margin: settings.margin,
      errorCorrectionLevel: settings.errorCorrectionLevel,
      color: {
        dark: settings.foregroundColor,
        light: settings.backgroundColor,
      }
    });
    return url;
  } catch (err) {
    console.error('Error generating QR Data URL', err);
    throw err;
  }
}

export async function generateQRSvg(text: string, settings: QRSettings): Promise<string> {
  try {
    const svg = await QRCode.toString(text, {
      type: 'svg',
      width: settings.size,
      margin: settings.margin,
      errorCorrectionLevel: settings.errorCorrectionLevel,
      color: {
        dark: settings.foregroundColor,
        light: settings.backgroundColor,
      }
    });
    return svg;
  } catch (err) {
    console.error('Error generating QR SVG', err);
    throw err;
  }
}
