import type { Metadata, Viewport } from 'next';
import { DM_Sans, JetBrains_Mono } from 'next/font/google';
import { QueryProvider } from '@/providers/query-provider';
import './globals.css';

const dmSans = DM_Sans({
  variable: '--font-dm-sans-next',
  subsets: ['latin'],
  display: 'swap',
});

const jetBrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono-next',
  subsets: ['latin'],
  display: 'swap',
});

/** General Sans is only distributed by Fontshare, so it loads as a stylesheet. */
const GENERAL_SANS_STYLESHEET =
  'https://api.fontshare.com/v2/css?f[]=general-sans@500,600&display=swap';

export const metadata: Metadata = {
  title: 'INTEGRA',
  description: 'Detect with evidence. Decide with integrity.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#FFFFFF',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link rel="stylesheet" href={GENERAL_SANS_STYLESHEET} />
      </head>
      <body className={`${dmSans.variable} ${jetBrainsMono.variable}`}>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
