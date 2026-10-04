import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthPageShell } from '@/components/auth/auth-page-shell';
import { LoginPanel } from '@/components/auth/login-panel';

export const metadata: Metadata = { title: 'Masuk · INTEGRA' };

export default function LoginPage() {
  return (
    <AuthPageShell
      title="Masuk ke INTEGRA"
      description="Gunakan email dan kode dari aplikasi authenticator Anda."
      footnote="Belum punya akun? Masukkan email Anda, lalu ikuti langkah pembuatan akun. Kode berganti setiap 30 detik dan hanya bisa dipakai sekali."
    >
      <Suspense>
        <LoginPanel />
      </Suspense>
    </AuthPageShell>
  );
}
