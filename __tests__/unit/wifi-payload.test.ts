import { describe, it, expect } from 'vitest';
import {
  DEFAULT_STATE,
  escapeWifiValue,
  unescapeWifiValue,
  wifiPayload,
  type ToolState,
} from '@/tool/types';
import {
  serializeState,
  deserializeState,
  roundTrips,
  parseWifiPayload,
} from '@/tool/tool-definition';

const state = (patch: Partial<ToolState>): ToolState => ({ ...DEFAULT_STATE, ...patch });

describe('payload escaping', () => {
  it('escapes special characters in SSID and password including ; : , \\ " ', () => {
    const s = state({ ssid: 'Cafe; Net:1, "guest"\\wing', password: 'p;a:ss,w"ord\\x' });
    const payload = wifiPayload(s);
    expect(escapeWifiValue('a;b')).toBe('a\\;b');
    expect(escapeWifiValue('a:b')).toBe('a\\:b');
    expect(escapeWifiValue('a,b')).toBe('a\\,b');
    expect(escapeWifiValue('a"b')).toBe('a\\"b');
    expect(escapeWifiValue('a\\b')).toBe('a\\\\b');
    expect(payload).toBe(
      'WIFI:T:WPA;S:Cafe\\; Net\\:1\\, \\"guest\\"\\\\wing;P:p\\;a\\:ss\\,w\\"ord\\\\x;'
    );
  });

  it('round-trips escaped values through parseWifiPayload', () => {
    const s = state({ ssid: 'a;:,"\\b', password: 'x\\y;z:w,q"r' });
    const parsed = parseWifiPayload(wifiPayload(s));
    expect(parsed).toEqual({ ssid: 'a;:,"\\b', password: 'x\\y;z:w,q"r' });
  });

  it('unescapes pairs in the right order (backslash first)', () => {
    expect(unescapeWifiValue('a\\\\b')).toBe('a\\b');
    expect(unescapeWifiValue('a\\;b')).toBe('a;b');
  });
});

describe('open network payload', () => {
  it('omits password fields for open networks', () => {
    const s = state({ security: 'nopass', password: 'ignored' });
    const payload = wifiPayload(s);
    expect(payload).toBe('WIFI:T:NOPASS;S:MyNetwork;');
    expect(payload).not.toContain('P:');
    expect(payload).not.toContain('ignored');
  });

  it('marks hidden networks', () => {
    expect(wifiPayload(state({ hidden: true }))).toContain('H:true');
    expect(wifiPayload(state({ hidden: false }))).not.toContain('H:');
  });

  it('uses WEP type as given', () => {
    expect(wifiPayload(state({ security: 'wep', password: 'abcde' }))).toContain('T:WEP');
  });
});

describe('network type switching updates payload', () => {
  it('changing security updates the payload type and password handling', () => {
    let s = state({ security: 'wpa', password: 'secret' });
    const withPassword = wifiPayload(s);
    expect(withPassword).toContain('T:WPA');
    expect(withPassword).toContain('P:secret');
    s = { ...s, security: 'nopass' };
    const open = wifiPayload(s);
    expect(open).toContain('T:NOPASS');
    expect(open).not.toContain('P:secret');
    s = { ...s, security: 'wep' };
    expect(wifiPayload(s)).toContain('T:WEP');
  });
});

describe('serialize/deserialize round-trip', () => {
  it('full state round-trips', () => {
    const s = state({
      ssid: 'Net;:,"\\one',
      password: 'pw"\\;:',
      security: 'wep',
      hidden: true,
      showCredentialsText: false,
      revealPassword: false,
      qrSize: 1024,
      cardColor: '#ff00aa',
      textColor: '#123456',
      logoText: 'Acme <Lobby>',
      history: [{ text: 'entry', createdAt: '2026-11-26T00:00:00.000Z' }],
    });
    expect(roundTrips(s)).toBe(true);
    const restored = deserializeState(JSON.parse(serializeState(s)));
    expect(restored.success).toBe(true);
    if (restored.success) {
      expect(restored.data).toEqual(s);
    }
  });

  it('drops password when security is open on serialize and skips unknown history rows', () => {
    const s = state({
      security: 'nopass',
      password: 'x',
      history: [
        { text: 'ok', createdAt: '2026-11-26T00:00:00.000Z' },
        { bad: true },
      ] as ToolState['history'],
    });
    const parsed = JSON.parse(serializeState(s)) as Record<string, unknown>;
    expect(parsed.password).toBe('');
    const restored = deserializeState(parsed);
    expect(restored.success).toBe(true);
    if (restored.success) expect(restored.data.history).toHaveLength(1);
  });

  it('repairs invalid fields and rejects non-objects', () => {
    const repaired = deserializeState({ security: 'waffle', qrSize: 99999, cardColor: 'red' });
    expect(repaired.success).toBe(true);
    if (repaired.success) {
      expect(repaired.data.security).toBe('wpa');
      expect(repaired.data.qrSize).toBe(2048);
      expect(repaired.data.cardColor).toBe('#ffffff');
    }
    expect(deserializeState(null).success).toBe(false);
    expect(deserializeState([1]).success).toBe(false);
    expect(deserializeState('wifi').success).toBe(false);
  });
});
