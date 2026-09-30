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
  title: 'Resik App',
  description: 'Full-stack foundation',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={jakartaSans.variable}>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
