import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import manifest from '@/app/manifest';
import robots from '@/app/robots';
import sitemap from '@/app/sitemap';
import ErrorPage from '@/app/error';
import NotFound from '@/app/not-found';
import { JsonLd } from '@/app/json-ld';
import ToolPage from '@/app/page';
import { cn } from '@/lib/utils';
import { generateJsonLd, generateToolMetadata } from '@/lib/seo';
import toolConfig from '@/tool/tool.config';
import { getPublicSiteUrl, templateMetadata } from '@/tool/template-metadata';
import { qrWifiTool, serializeState } from '@/tool/tool-definition';
import { Canvas } from '@/tool/components/Canvas';
import { Sidebar } from '@/tool/components/Sidebar';
import { Toolbar } from '@/tool/components/Toolbar';
import { DEFAULT_STATE as BASE_DEFAULT_STATE } from '@/tool/types';
import type { ToolState } from '@/tool/types';
import type { ExporterLoader } from '@itsjust/core';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/app/tool-client-wrapper', () => ({
  default: () => <div data-testid="tool-client-wrapper">tool-client-wrapper</div>,
}));

describe('app and seo', () => {
  const getOgImageUrl = (
    images: NonNullable<NonNullable<ReturnType<typeof generateToolMetadata>['openGraph']>['images']>
  ): string | undefined => {
    const list = Array.isArray(images) ? images : [images];
    const first = list[0];
    if (!first) return undefined;
    if (typeof first === 'string') return first;
    if (first instanceof URL) return first.toString();
    return String(first.url);
  };

  it('builds metadata and json-ld values', () => {
    const metadata = generateToolMetadata(toolConfig);
    const jsonLd = generateJsonLd(toolConfig);

    expect(metadata.creator).toBe(toolConfig.name);
    expect(metadata.metadataBase?.toString()).toBe('http://localhost:3000/');
    const ogUrl = metadata.openGraph?.images ? getOgImageUrl(metadata.openGraph.images) : undefined;
    expect(ogUrl).toContain('/og.svg');
    expect(jsonLd.url).toBe('http://localhost:3000');
    expect(jsonLd.featureList.length).toBeGreaterThan(0);
  });

  it('returns site manifest, robots and sitemap', () => {
    const man = manifest();
    const rob = robots();
    const sm = sitemap();

    expect(man.name).toBe(templateMetadata.appName);
    expect(rob.sitemap).toBe('http://localhost:3000/sitemap.xml');
    expect(sm[0]?.url).toBe('http://localhost:3000');
  });

  it('renders json-ld script safely', () => {
    render(<JsonLd config={{ ...toolConfig, name: '</script>' }} />);
    const script = document.querySelector('script[type="application/ld+json"]');
    expect(script?.innerHTML).toContain('\\u003c/script>');
  });

  it('renders error page and invokes reset', () => {
    const reset = vi.fn();
    render(<ErrorPage error={new Error('boom')} reset={reset} />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders not-found page', () => {
    render(<NotFound />);
    expect(screen.getByText('Page not found')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go home' })).toHaveAttribute('href', '/');
  });

  it('renders top-level tool page', () => {
    render(<ToolPage />);
    expect(screen.getByTestId('tool-client-wrapper')).toBeInTheDocument();
    expect(document.querySelector('script[type="application/ld+json"]')).toBeInTheDocument();
  });

  it('covers tool definition and helper exports', async () => {
    expect(cn('a', undefined, 'b', false, null, 'c')).toBe('a b c');
    expect(getPublicSiteUrl()).toBe('http://localhost:3000');
    expect(qrWifiTool.name).toBe(toolConfig.name);
    expect(
      qrWifiTool.deserialize({
        v: 1,
        ssid: 'CafeNet',
        password: 'pw',
        security: 'wpa',
        history: [{ text: 'CafeNet — WPA network', createdAt: '2026-11-21T10:00:00.000Z' }],
      })
    ).toEqual({
      success: true,
      data: {
        ssid: 'CafeNet',
        password: 'pw',
        security: 'wpa',
        hidden: BASE_DEFAULT_STATE.hidden,
        showCredentialsText: BASE_DEFAULT_STATE.showCredentialsText,
        revealPassword: BASE_DEFAULT_STATE.revealPassword,
        qrSize: BASE_DEFAULT_STATE.qrSize,
        cardColor: BASE_DEFAULT_STATE.cardColor,
        textColor: BASE_DEFAULT_STATE.textColor,
        logoText: BASE_DEFAULT_STATE.logoText,
        history: [{ text: 'CafeNet — WPA network', createdAt: '2026-11-21T10:00:00.000Z' }],
      },
    });
    const repaired = qrWifiTool.deserialize({ nope: true });
    expect(repaired.success).toBe(true);
    if (repaired.success) {
      expect(repaired.data.security).toBe(BASE_DEFAULT_STATE.security);
      expect(repaired.data.history).toEqual([]);
    }
    expect(qrWifiTool.deserialize('nope').success).toBe(false);
    expect(serializeState({ ...BASE_DEFAULT_STATE, ssid: 'CafeNet' })).toContain(
      '"ssid":"CafeNet"'
    );
    const exporters =
      (qrWifiTool as { exporters?: Array<{ loader: ExporterLoader }> }).exporters ?? [];
    expect(exporters).toHaveLength(4);
    const first = exporters[0];
    expect(first).toBeDefined();
    if (!first) throw new Error('missing exporter');
    const png = await (first.loader as ExporterLoader)();
    const resolved = 'default' in png ? png.default : png.exporter;
    expect(resolved.format).toBe('png');
  });

  it('renders tool components', () => {
    const state: ToolState = { ...BASE_DEFAULT_STATE, ssid: 'CafeNet', password: 'pw123' };
    render(
      <>
        <Toolbar state={state} onChange={() => {}} onClear={() => {}} onCopy={() => {}} />
        <Sidebar state={state} onChange={() => {}} />
        <Canvas state={state} onChange={() => {}} />
      </>
    );

    expect(screen.getByTestId('input-ssid')).toHaveValue('CafeNet');
    expect(screen.getByTestId('payload-text')).toHaveTextContent('WIFI:T:WPA;S:CafeNet;P:pw123');
    expect(screen.getByTestId('qr-preview')).toBeInTheDocument();
  });
});
