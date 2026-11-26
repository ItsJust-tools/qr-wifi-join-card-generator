import type { ToolConfig } from '@itsjust/core';

export const toolConfig: ToolConfig = {
  id: 'qr-wifi-join-card-generator',
  name: 'QR WiFi Join Card Generator',
  description:
    'Generate a printable WiFi join card with an embedded QR code holding network credentials for one-tap guest connection.',
  version: '1.0.0',
  exportFormats: ['png', 'jpeg', 'webp', 'pdf'],
  features: {
    export: true,
    autoSave: true,
    undoRedo: true,
    sidebar: true,
    statusBar: true,
    darkMode: true,
  },
  theme: {
    brand: 'QR WiFi Join Card Generator',
    accent: '#7c3aed',
  },
};

export default toolConfig;
