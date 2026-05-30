export function buildTextPayload(text: string) {
  return text;
}

export function buildUrlPayload(url: string) {
  let finalUrl = url.trim();
  if (!/^https?:\/\//i.test(finalUrl)) {
    finalUrl = 'https://' + finalUrl;
  }
  return finalUrl;
}

export function buildPhonePayload(phone: string) {
  return `tel:${phone.trim()}`;
}

export function buildEmailPayload(email: string, subject?: string, body?: string) {
  let payload = `mailto:${email.trim()}`;
  const params = [];
  if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
  if (body) params.push(`body=${encodeURIComponent(body)}`);
  if (params.length > 0) payload += `?${params.join('&')}`;
  return payload;
}

export function buildSmsPayload(phone: string, message?: string) {
  let payload = `SMSTO:${phone.trim()}`;
  if (message) payload += `:${message}`;
  return payload;
}

export function buildWifiPayload(ssid: string, password?: string, encryption: 'WPA' | 'WEP' | 'nopass' = 'WPA', hidden: boolean = false) {
  const escapeString = (str: string) => str.replace(/([\\;,":])/g, '\\$1');
  const sanitizedSsid = escapeString(ssid);
  const sanitizedPass = password ? escapeString(password) : '';
  let payload = `WIFI:T:${encryption};S:${sanitizedSsid};`;
  if (encryption !== 'nopass' && sanitizedPass) {
    payload += `P:${sanitizedPass};`;
  } else {
    payload += 'P:;';
  }
  if (hidden) payload += 'H:true;';
  payload += ';';
  return payload;
}

export function buildVCardPayload(data: any) {
  const parts = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${data.lastName || ''};${data.firstName || ''}`,
    `FN:${data.firstName || ''} ${data.lastName || ''}`.trim(),
    data.org ? `ORG:${data.org}` : null,
    data.title ? `TITLE:${data.title}` : null,
    data.phone ? `TEL:${data.phone}` : null,
    data.email ? `EMAIL:${data.email}` : null,
    data.url ? `URL:${data.url}` : null,
    'END:VCARD'
  ];
  return parts.filter(Boolean).join('\n');
}

export function buildAssetPayload(assetCode: string, baseUrl?: string) {
  if (baseUrl) {
    const divider = baseUrl.endsWith('/') ? '' : '/';
    return `${baseUrl}${divider}${assetCode}`;
  }
  return assetCode;
}
