import type { Metadata, Viewport } from 'next';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/noto-sans-jp/japanese-400.css';
import '@fontsource/noto-sans-jp/japanese-700.css';
import './globals.css';
import { AppProvider } from '@/components/AppProvider';
import { LiquidBackground } from '@/components/canvas/LiquidBackground';
import { BottomDock } from '@/components/layout/BottomDock';

export const metadata: Metadata = {
  title: 'Opal | SSW 宿泊分野 試験対策',
  description:
    '100% offline-first spaced repetition, interactive hospitality drills, and CBT simulator for Japanese SSW Level 1 Accommodation.',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-192.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#4D3EA3',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      style={
        {
          '--font-inter': '"Inter"',
          '--font-noto-jp': '"Noto Sans JP"',
        } as React.CSSProperties
      }
    >
      <body className="antialiased text-[#1D1D1F]">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-3 focus:rounded-full focus:bg-[#1D1D1F] focus:text-white focus:text-sm focus:font-bold"
        >
          Skip to main content
        </a>
        <AppProvider>
          <LiquidBackground />
          <main
            id="main-content"
            tabIndex={-1}
            className="relative z-10 min-h-dvh mx-auto w-full max-w-[480px] md:max-w-3xl px-4 pt-6 pb-[calc(7.5rem+env(safe-area-inset-bottom,0px))] outline-none"
          >
            {children}
          </main>
          <BottomDock />
        </AppProvider>
      </body>
    </html>
  );
}
