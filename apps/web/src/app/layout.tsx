import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { QueryProvider } from '@/providers/query-provider';
import './globals.css';

const jakartaSans = Plus_Jakarta_Sans({
  variable: '--font-jakarta-sans-next',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'INTEGRA',
  description: 'Detect with evidence. Decide with integrity.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body className={jakartaSans.variable}>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
