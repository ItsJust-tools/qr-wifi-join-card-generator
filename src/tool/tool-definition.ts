import type { DeserializeResult, Tool } from '@itsjust/core';
import toolConfig from './tool.config';
import {
  DEFAULT_STATE,
  MAX_HISTORY,
  escapeWifiValue,
  isState,
  unescapeWifiValue,
  wifiPayload,
  type HistoryEntry,
  type NetworkSecurity,
  type ToolState,
} from './types';

const VALID_SECURITY: NetworkSecurity[] = ['wpa', 'wep', 'nopass'];

/** Human-readable summary of the card (used by status bar and copy actions). */
export function summaryText(state: ToolState): string {
  if (!state.ssid.trim()) return 'Enter a network name (SSID) to build the WiFi card.';
  const security =
    state.security === 'nopass' ? 'Open network' : `${state.security.toUpperCase()} network`;
  const hidden = state.hidden ? ', hidden' : '';
  return `${state.ssid} — ${security}${hidden}`;
}

/** Compact payload string for embedding elsewhere. */
export function payloadForCopy(state: ToolState): string {
  return wifiPayload(state);
}

/** Serialize tool state into a compact JSON string for share/import. */
export function serializeState(state: ToolState): string {
  return JSON.stringify({
    v: 1,
    ssid: state.ssid,
    password: state.security === 'nopass' ? '' : state.password,
    security: state.security,
    hidden: state.hidden,
    showCredentialsText: state.showCredentialsText,
    revealPassword: state.revealPassword,
    qrSize: state.qrSize,
    cardColor: state.cardColor,
    textColor: state.textColor,
    logoText: state.logoText,
    history: state.history,
  });
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function numberOr(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function boolOr(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function colorOr(value: unknown, fallback: string): string {
  return typeof value === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(value) ? value : fallback;
}

function validHistory(value: unknown): HistoryEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (entry): entry is HistoryEntry =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as HistoryEntry).text === 'string' &&
        typeof (entry as HistoryEntry).createdAt === 'string'
    )
    .slice(0, MAX_HISTORY);
}

/** Validate and recover tool state from an arbitrary payload. */
export function deserializeState(data: unknown): DeserializeResult<ToolState> {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return {
      success: false,
      error: 'Invalid data format: expected WiFi join card state object',
    };
  }
  const v = data as Record<string, unknown>;
  const security: NetworkSecurity = VALID_SECURITY.includes(v.security as NetworkSecurity)
    ? (v.security as NetworkSecurity)
    : DEFAULT_STATE.security;
  const state: ToolState = {
    ssid: stringOr(v.ssid, DEFAULT_STATE.ssid),
    password: security === 'nopass' ? '' : stringOr(v.password, ''),
    security,
    hidden: boolOr(v.hidden, DEFAULT_STATE.hidden),
    showCredentialsText: boolOr(v.showCredentialsText, DEFAULT_STATE.showCredentialsText),
    revealPassword: boolOr(v.revealPassword, DEFAULT_STATE.revealPassword),
    qrSize: numberOr(v.qrSize, DEFAULT_STATE.qrSize, 128, 2048),
    cardColor: colorOr(v.cardColor, DEFAULT_STATE.cardColor),
    textColor: colorOr(v.textColor, DEFAULT_STATE.textColor),
    logoText: stringOr(v.logoText, DEFAULT_STATE.logoText),
    history: validHistory(v.history),
  };
  if (!isState(state)) {
    return { success: false, error: 'Invalid WiFi state structure' };
  }
  return { success: true, data: state };
}

/** Append a history entry to state, capped at MAX_HISTORY, newest first. */
export function withHistory(state: ToolState, text: string, now = new Date()): ToolState {
  const entry: HistoryEntry = { text, createdAt: now.toISOString() };
  return { ...state, history: [entry, ...state.history].slice(0, MAX_HISTORY) };
}

/** True when a serialized string round-trips back to the same state. */
export function roundTrips(state: ToolState): boolean {
  try {
    const restored = deserializeState(JSON.parse(serializeState(state)));
    return restored.success && JSON.stringify(restored.data) === JSON.stringify(state);
  } catch {
    return false;
  }
}

/** Parse a WIFI: payload back into an SSID/password when possible (best effort). */
export function parseWifiPayload(payload: string): { ssid: string; password: string } | null {
  if (!payload.startsWith('WIFI:')) return null;
  // Strip trailing ';' terminator used by this tool.
  const body = payload.slice(5).replace(/;\s*$/, '');
  let ssid = '';
  let password = '';
  const regex = /([TSPH]):((?:\\.|[^;:])*)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(body)) !== null) {
    const key = match[1];
    const raw = match[2] ?? '';
    if (key === 'S') ssid = unescapeWifiValue(raw);
    if (key === 'P') password = unescapeWifiValue(raw);
  }
  if (!ssid) return null;
  return { ssid, password };
}

/** True when the state carries a usable network configuration. */
export function hasCredentials(state: ToolState): boolean {
  return state.ssid.trim().length > 0;
}

export { escapeWifiValue, unescapeWifiValue, wifiPayload };

export const qrWifiTool: Tool<ToolState> = {
  id: toolConfig.id,
  name: toolConfig.name,
  version: toolConfig.version,
  config: toolConfig,
  initialState: { ...DEFAULT_STATE },
  serialize: serializeState,
  deserialize: deserializeState,
  exporters: [
    { format: 'png', loader: () => import('./exporters/png') },
    { format: 'jpeg', loader: () => import('./exporters/jpeg') },
    { format: 'webp', loader: () => import('./exporters/webp') },
    { format: 'pdf', loader: () => import('./exporters/pdf') },
  ],
};
