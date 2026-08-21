export interface GatewaySettings {
  upiId: string;
  merchantName: string;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  ifscCode: string;
  usdtTrc20Address: string;
  usdtBep20Address: string;
  usdtRateInr: number;
}

const STORAGE_KEY = 'playarena_gateway_settings';

export const DEFAULT_GATEWAY_SETTINGS: GatewaySettings = {
  upiId: 'playarena.pay@icici',
  merchantName: 'PLAYARENA CASINO ENTERTAINMENT',
  bankName: 'HDFC Bank Ltd',
  accountHolder: 'PLAYARENA ROYAL ENTERTAINMENT PVT LTD',
  accountNumber: '50200084920194',
  ifscCode: 'HDFC0000128',
  usdtTrc20Address: 'TQ8bX2nL9pRtWm4yK6sJv3hFcGz1aD9',
  usdtBep20Address: '0x71C...4e89',
  usdtRateInr: 91.50,
};

export function getGatewaySettings(): GatewaySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_GATEWAY_SETTINGS;
    return { ...DEFAULT_GATEWAY_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_GATEWAY_SETTINGS;
  }
}

export function saveGatewaySettings(settings: Partial<GatewaySettings>): GatewaySettings {
  const current = getGatewaySettings();
  const updated = { ...current, ...settings };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event('gateway_settings_updated'));
  return updated;
}
