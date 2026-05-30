export type QRType = "text" | "url" | "phone" | "email" | "sms" | "wifi" | "vcard" | "asset" | "custom";

export type ErrorCorrectionLevel = "L" | "M" | "Q" | "H";

export interface QRSettings {
  size: number;
  margin: number;
  errorCorrectionLevel: ErrorCorrectionLevel;
  foregroundColor: string;
  backgroundColor: string;
}

export interface LinkRecord {
  id: string;
  targetUrl: string;
  name: string;
  createdAt: string;
  updatedAt?: string;
  clicks: number;
}
