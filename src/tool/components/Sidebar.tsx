'use client';

import React from 'react';
import { SECURITY_OPTIONS, type ToolState } from '../types';

interface SidebarProps {
  state: ToolState;
  onChange: (next: ToolState) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ state, onChange }) => {
  return (
    <div className="space-y-6 overflow-y-auto p-4 text-sm h-full" data-testid="wifi-sidebar">
      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Card appearance</h3>
        <label className="mb-2 block text-xs text-gray-600 dark:text-gray-300">
          Background color
          <input
            type="color"
            value={state.cardColor}
            onChange={(e) => onChange({ ...state, cardColor: e.target.value })}
            data-testid="sidebar-card-color"
            className="mt-1 block w-full"
          />
        </label>
        <label className="mb-2 block text-xs text-gray-600 dark:text-gray-300">
          Text color
          <input
            type="color"
            value={state.textColor}
            onChange={(e) => onChange({ ...state, textColor: e.target.value })}
            data-testid="sidebar-text-color"
            className="mt-1 block w-full"
          />
        </label>
        <label className="block text-xs text-gray-600 dark:text-gray-300">
          Logo text
          <input
            type="text"
            value={state.logoText}
            onChange={(e) => onChange({ ...state, logoText: e.target.value })}
            data-testid="sidebar-logo-text"
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </label>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">QR download size</h3>
        <label className="block text-xs text-gray-600 dark:text-gray-300">
          QR size (px)
          <input
            type="number"
            min={128}
            max={2048}
            step={64}
            value={state.qrSize}
            onChange={(e) => onChange({ ...state, qrSize: Number(e.target.value) || 512 })}
            data-testid="sidebar-qr-size"
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </label>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Network types</h3>
        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
          {SECURITY_OPTIONS.map((option) => (
            <li key={option.value} className="flex justify-between gap-2">
              <span>{option.label}</span>
              <span className="text-gray-500 dark:text-gray-400">{option.hint}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Saved cards</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300" data-testid="sidebar-history-count">
          {state.history.length} saved card{state.history.length === 1 ? '' : 's'}
        </p>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Share</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300">
          Use the toolbar share button to create a URL with the current card setup; open it to
          restore this card. Credentials stay in the URL, so share thoughtfully.
        </p>
      </div>
    </div>
  );
};
