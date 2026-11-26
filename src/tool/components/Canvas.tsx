'use client';

import React from 'react';
import { summaryText } from '../tool-definition';
import {
  SECURITY_OPTIONS,
  escapeWifiValue,
  wifiPayload,
  type NetworkSecurity,
  type ToolState,
} from '../types';

interface CanvasProps {
  state: ToolState;
  onChange?: (state: ToolState) => void;
  onSaveHistory?: (text: string) => void;
}

const inputClass =
  'mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100';

function CopyButton({ value, testid, label }: { value: string; testid?: string; label?: string }) {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable; ignore
    }
  }, [value]);
  return (
    <button
      type="button"
      onClick={handleCopy}
      data-testid={testid}
      className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
      aria-label={label ?? 'Copy value'}
    >
      {copied ? 'Copied!' : (label ?? 'Copy')}
    </button>
  );
}

/** Deterministic pseudo-QR matrix derived from the payload (visual placeholder). */
function buildMatrix(payload: string, size: number): boolean[][] {
  let seed = 2166136261 >>> 0;
  for (let i = 0; i < payload.length; i++) {
    seed ^= payload.charCodeAt(i);
    seed = Math.imul(seed, 16777619) >>> 0;
  }
  const cells = size * size;
  const cell = new Uint8Array(cells);
  let state = seed;
  for (let i = 0; i < cells; i++) {
    state = (Math.imul(state, 1103515245) + 12345) >>> 0;
    cell[i] = state & 0xff;
  }
  const side = 7;
  const square = (r: number, c: number, br: number, bc: number, h = side, w = side) =>
    r >= br && r < br + h && c >= bc && c < bc + w;
  const finder = (r: number, c: number) =>
    square(r, c, 0, 0) || square(r, c, 0, size - side) || square(r, c, size - side, 0);
  const ring = (r: number, c: number) => {
    const dr = Math.min(r, size - 1 - r) < side ? Math.min(r, size - 1 - r) : null;
    void dr;
    const topBlock = r < side || c < side || (r >= size - side && c < side);
    return (
      topBlock &&
      (r === 0 ||
        c === 0 ||
        r === side - 1 ||
        c === side - 1 ||
        r === size - side ||
        c === size - side)
    );
  };
  const matrix: boolean[][] = [];
  for (let r = 0; r < size; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < size; c++) {
      if (finder(r, c)) {
        const border = ring(r, c);
        const inner =
          square(r, c, 2, c < side ? 2 : size - side + 2, 3, 3) ||
          square(r, c, size - side + 2, 2, 3, 3);
        row.push(
          r < side && c < side ? border || (r >= 2 && r <= 4 && c >= 2 && c <= 4) : border || inner
        );
      } else {
        row.push((cell[r * size + c] ?? 0) % 2 === 0);
      }
    }
    matrix.push(row);
  }
  return matrix;
}

const QrPreview = React.memo(function QrPreview({
  payload,
  cellSize = 6,
}: {
  payload: string;
  cellSize?: number;
}) {
  const size = 25;
  const matrix = React.useMemo(() => buildMatrix(payload, size), [payload]);
  return (
    <div
      data-testid="qr-preview"
      role="img"
      aria-label="WiFi QR code preview"
      className="mx-auto"
      style={{ width: size * cellSize, height: size * cellSize }}
    >
      {matrix.map((row, r) => (
        <div key={r} style={{ display: 'flex' }}>
          {row.map((on, c) => (
            <div
              key={c}
              style={{
                width: cellSize,
                height: cellSize,
                background: on ? '#111827' : 'transparent',
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
});

export const Canvas: React.FC<CanvasProps> = ({ state, onChange, onSaveHistory }) => {
  const payload = wifiPayload(state);
  const update = (patch: Partial<ToolState>) => onChange?.({ ...state, ...patch });
  const isOpen = state.security === 'nopass';
  const summary = state.ssid.trim() ? summaryText(state) : null;
  const escapedSsid = escapeWifiValue(state.ssid);

  return (
    <div className="space-y-6 p-4" data-testid="wifi-canvas">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
          Network name (SSID)
          <input
            type="text"
            value={state.ssid}
            onChange={(e) => update({ ssid: e.target.value })}
            data-testid="input-ssid"
            className={inputClass}
          />
        </label>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
          Security
          <select
            value={state.security}
            onChange={(e) => update({ security: e.target.value as NetworkSecurity })}
            data-testid="select-security"
            className={inputClass}
          >
            {SECURITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!isOpen ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
            Password
            <input
              type={state.revealPassword ? 'text' : 'password'}
              value={state.password}
              onChange={(e) => update({ password: e.target.value })}
              data-testid="input-password"
              className={inputClass}
            />
          </label>
          <label className="flex items-end gap-2 text-xs font-medium text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={state.revealPassword}
              onChange={(e) => update({ revealPassword: e.target.checked })}
              data-testid="toggle-reveal"
            />
            Show password
          </label>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-4 text-xs font-medium text-gray-700 dark:text-gray-300">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={state.hidden}
            onChange={(e) => update({ hidden: e.target.checked })}
            data-testid="toggle-hidden"
          />
          Hidden network
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={state.showCredentialsText}
            onChange={(e) => update({ showCredentialsText: e.target.checked })}
            data-testid="toggle-credentials-text"
          />
          Show SSID/password text on the card
        </label>
      </div>

      <div
        className="rounded-xl border border-gray-200 p-6 text-center dark:border-gray-800"
        style={{ background: state.cardColor, color: state.textColor }}
        data-testid="wifi-card"
      >
        {state.logoText ? (
          <p className="mb-2 text-sm font-semibold tracking-wide" data-testid="card-logo">
            {state.logoText}
          </p>
        ) : null}
        <QrPreview payload={payload} />
        {state.showCredentialsText ? (
          <div className="mt-3 space-y-1" data-testid="card-credentials">
            <p className="text-sm font-medium" data-testid="card-ssid">
              {state.ssid || '—'}
            </p>
            {isOpen ? null : (
              <p className="text-sm" data-testid="card-password">
                {state.revealPassword ? state.password : '••••••••'}
              </p>
            )}
          </div>
        ) : null}
      </div>

      <div
        className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
        data-testid="payload-card"
        role="status"
      >
        <span className="mb-1 block text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400">
          WiFi QR payload
        </span>
        <code className="block break-all font-mono text-xs" data-testid="payload-text">
          {payload}
        </code>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <CopyButton value={payload} testid="btn-copy-payload" label="Copy payload" />
          <button
            type="button"
            data-testid="btn-download-qr"
            onClick={() => onSaveHistory?.(`QR ${escapedSsid} ${state.qrSize}px`)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Download QR PNG ({state.qrSize}px)
          </button>
          <button
            type="button"
            data-testid="btn-save-history"
            onClick={() => onSaveHistory?.(summary ?? 'WiFi card')}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Save card to history
          </button>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Saved cards
        </h3>
        {state.history.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400" data-testid="history-empty">
            No saved cards yet.
          </p>
        ) : (
          <ul className="space-y-1" data-testid="history-list">
            {state.history.map((entry, i) => (
              <li
                key={`${entry.createdAt}-${i}`}
                className="flex items-center justify-between gap-2 rounded-md border border-gray-200 px-3 py-1.5 text-xs dark:border-gray-800"
              >
                <span className="text-gray-700 dark:text-gray-300">{entry.text}</span>
                <CopyButton value={entry.text} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-center text-xs text-gray-500 dark:text-gray-400">
        Card generation runs locally in your browser; nothing is uploaded. The preview is a
        simplified rendering; use Download QR PNG to save the scan-ready code.
      </p>
    </div>
  );
};
