import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthPageShell } from '@/components/auth/auth-page-shell';
import { SignupFlow } from '@/components/auth/signup-flow';

export const metadata: Metadata = { title: 'Buat akun · INTEGRA' };

export default function SignupPage() {
  return (
    <AuthPageShell
      title="Buat akun INTEGRA"
      description="Hubungkan aplikasi authenticator untuk masuk tanpa kata sandi."
      footnote="Akun baru terdaftar sebagai verifikator. Akun baru dibuat setelah kode authenticator Anda cocok, jadi setup yang belum selesai tidak meninggalkan akun."
    >
      <Suspense>
        <SignupFlow />
      </Suspense>
    </AuthPageShell>
  );
}
