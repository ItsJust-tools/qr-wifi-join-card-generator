export type NetworkSecurity = 'wpa' | 'wep' | 'nopass';

export interface ToolState {
  /** WiFi network name (SSID). */
  ssid: string;
  /** WiFi password; ignored for open networks. */
  password: string;
  /** Security type of the network. */
  security: NetworkSecurity;
  /** Whether the network is hidden. */
  hidden: boolean;
  /** Whether the SSID/password text is shown on the printed card. */
  showCredentialsText: boolean;
  /** Whether the password is revealed in the form and on the card. */
  revealPassword: boolean;
  /** QR code size in pixels for the PNG download. */
  qrSize: number;
  /** Card background color. */
  cardColor: string;
  /** Card accent/text color. */
  textColor: string;
  /** Optional logo label shown on the card (e.g. venue name). */
  logoText: string;
  /** Saved card presets, newest first. */
  history: HistoryEntry[];
}

export interface HistoryEntry {
  /** Short human readable description of the saved card. */
  text: string;
  /** ISO timestamp when the entry was saved. */
  createdAt: string;
}

export const DEFAULT_STATE: ToolState = {
  ssid: 'MyNetwork',
  password: '',
  security: 'wpa',
  hidden: false,
  showCredentialsText: true,
  revealPassword: true,
  qrSize: 512,
  cardColor: '#ffffff',
  textColor: '#111827',
  logoText: 'Guest WiFi',
  history: [],
};

export const MAX_HISTORY = 20;

export const SECURITY_OPTIONS: { value: NetworkSecurity; label: string; hint: string }[] = [
  { value: 'wpa', label: 'WPA / WPA2 / WPA3', hint: 'most common password-protected networks' },
  { value: 'wep', label: 'WEP', hint: 'legacy networks' },
  { value: 'nopass', label: 'Open', hint: 'no password required' },
];

/** Escape special characters for the WIFI: QR payload (backslash first). */
export function escapeWifiValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/([;,:"])/g, '\\$1');
}

/** Un-escape a WIFI: payload value (backslash first). */
export function unescapeWifiValue(value: string): string {
  return value.replace(/\\([\\;,:"])/g, '$1');
}

export function isState(value: unknown): value is ToolState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<ToolState>;
  return (
    typeof v.ssid === 'string' &&
    typeof v.security === 'string' &&
    ['wpa', 'wep', 'nopass'].includes(v.security) &&
    typeof v.hidden === 'boolean'
  );
}

/** Build the WIFI: QR payload per Android/iOS/Windows escaping rules. */
export function wifiPayload(state: ToolState): string {
  const parts = [`T:${state.security.toUpperCase()}`, `S:${escapeWifiValue(state.ssid)}`];
  if (state.security !== 'nopass' && state.password !== '') {
    parts.push(`P:${escapeWifiValue(state.password)}`);
  }
  if (state.hidden) parts.push('H:true');
  return `WIFI:${parts.join(';')};`;
}
