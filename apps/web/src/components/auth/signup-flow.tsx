'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { type FormEvent, type ReactNode, useEffect, useState } from 'react';
import {
  LuArrowLeft,
  LuArrowRight,
  LuCheck,
  LuCircleAlert,
  LuClock,
  LuCopy,
  LuQrCode,
  LuRefreshCw,
  LuSmartphone,
  LuTimerOff,
  LuUserCheck,
} from 'react-icons/lu';
import { Pill } from '@/components/claim-pills';
import { NoticeDialog } from '@/components/notice-dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { CURRENT_USER_QUERY_KEY } from '@/hooks/use-current-user';
import { useNow } from '@/hooks/use-now';
import { LOGIN_PATH } from '@/lib/api-client';
import { isValidEmailFormat, normalizeEmail } from '@/lib/email';
import { toSafeReturnPath } from '@/lib/return-path';
import {
  confirmEnrollment,
  getErrorStatus,
  startEnrollment,
} from '@/services/auth.service';
import type { EnrollmentChallenge } from '@/types/auth.types';
import { TOTP_CODE_LENGTH, TotpCodeInput } from './totp-code-input';

const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 100;
/** After the QR expires, wait this long for a choice before returning to login. */
const EXPIRED_REDIRECT_DELAY_MS = 15_000;
const EXPIRY_WARNING_MS = 60_000;
const SETUP_KEY_GROUP = /.{1,4}/g;

interface SignupNotice {
  title: string;
  description: string;
  actionLabel: string;
  goToLogin: boolean;
}

function describeSignupError(error: unknown): SignupNotice {
  switch (getErrorStatus(error)) {
    case 409:
      return {
        title: 'Email sudah terdaftar',
        description:
          'Email ini sudah punya akun INTEGRA. Masuk dengan kode dari aplikasi authenticator Anda.',
        actionLabel: 'Ke halaman masuk',
        goToLogin: true,
      };
    case 422:
      return {
        title: 'Kode tidak cocok',
        description:
          'Pastikan Anda memakai kode INTEGRA untuk email ini dan jam ponsel diatur otomatis. Tunggu kode berikutnya, lalu coba lagi.',
        actionLabel: 'Coba lagi',
        goToLogin: false,
      };
    case 429:
      return {
        title: 'Terlalu banyak percobaan',
        description: 'Tunggu satu menit, lalu coba lagi.',
        actionLabel: 'Mengerti',
        goToLogin: false,
      };
    default:
      return {
        title: 'Server tidak dapat dihubungi',
        description: 'Periksa koneksi, lalu coba lagi.',
        actionLabel: 'Coba lagi',
        goToLogin: false,
      };
  }
}

function formatCountdown(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function SetupStep({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden="true"
        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-subtle text-caption font-medium text-ink"
      >
        {number}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <span className="text-small font-medium text-ink">{title}</span>
        {children}
      </div>
    </li>
  );
}

function SetupKey({ setupKey }: { setupKey: string }) {
  const [hasCopied, setHasCopied] = useState(false);

  async function copySetupKey() {
    try {
      await navigator.clipboard.writeText(setupKey);
      setHasCopied(true);
      window.setTimeout(() => setHasCopied(false), 2000);
    } catch {
      setHasCopied(false);
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-md border border-hairline bg-canvas p-2 pl-3">
      <code className="min-w-0 flex-1 font-mono text-small break-words text-ink">
        {setupKey.match(SETUP_KEY_GROUP)?.join(' ')}
      </code>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={copySetupKey}
        aria-label="Salin setup key"
      >
        {hasCopied ? (
          <>
            <LuCheck aria-hidden="true" />
            Tersalin
          </>
        ) : (
          <>
            <LuCopy aria-hidden="true" />
            Salin
          </>
        )}
      </Button>
    </div>
  );
}

export function SignupFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const now = useNow();
  const email = normalizeEmail(searchParams.get('email') ?? '');
  const loginHref = `${LOGIN_PATH}?${new URLSearchParams({ email })}`;
  const [name, setName] = useState('');
  const [challenge, setChallenge] = useState<EnrollmentChallenge | null>(null);
  /** Local-clock deadline, so a skewed device clock cannot shift the countdown. */
  const [deadline, setDeadline] = useState<number | null>(null);
  const [authenticatorCode, setAuthenticatorCode] = useState('');
  const [notice, setNotice] = useState<SignupNotice | null>(null);

  const enrollmentMutation = useMutation({
    mutationFn: startEnrollment,
    onSuccess: (nextChallenge) => {
      setChallenge(nextChallenge);
      setDeadline(Date.now() + nextChallenge.expiresInSeconds * 1000);
      setAuthenticatorCode('');
    },
    onError: (error) => setNotice(describeSignupError(error)),
  });
  const confirmationMutation = useMutation({
    mutationFn: confirmEnrollment,
    onSuccess: (currentUser) => {
      queryClient.setQueryData(CURRENT_USER_QUERY_KEY, currentUser);
      router.replace(toSafeReturnPath(searchParams.get('next')));
    },
    onError: (error) => {
      setAuthenticatorCode('');
      // 410: the token expired between the countdown and the request; the
      // expiry dialog takes over.
      if (getErrorStatus(error) === 410) {
        setDeadline(0);
        return;
      }
      setNotice(describeSignupError(error));
    },
  });

  // `now` ticks once a second, so clamp the first frame to the full lifetime.
  const remainingMs =
    challenge && deadline !== null
      ? Math.min(deadline - now, challenge.expiresInSeconds * 1000)
      : Infinity;
  const isExpired = challenge !== null && remainingMs <= 0;
  const redirectRemainingMs = remainingMs + EXPIRED_REDIRECT_DELAY_MS;
  const shouldReturnToLogin =
    isExpired && redirectRemainingMs <= 0 && !enrollmentMutation.isPending;
  const trimmedName = name.trim();
  const isNameValid =
    trimmedName.length >= MIN_NAME_LENGTH &&
    trimmedName.length <= MAX_NAME_LENGTH;

  useEffect(() => {
    if (shouldReturnToLogin) router.replace(loginHref);
  }, [shouldReturnToLogin, router, loginHref]);

  function requestChallenge() {
    enrollmentMutation.mutate({ email, name: trimmedName });
  }

  function handleDetailsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isNameValid) requestChallenge();
  }

  function handleConfirmSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!challenge || authenticatorCode.length !== TOTP_CODE_LENGTH) return;
    confirmationMutation.mutate({
      enrollmentToken: challenge.enrollmentToken,
      code: authenticatorCode,
    });
  }

  function closeNotice() {
    if (notice?.goToLogin) router.replace(loginHref);
    setNotice(null);
  }

  if (!isValidEmailFormat(email)) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p className="text-body text-ink-secondary">
          Email untuk akun baru belum diisi. Mulai dari halaman masuk dengan
          memasukkan email Anda.
        </p>
        <Button asChild variant="outline">
          <Link href={LOGIN_PATH}>
            <LuArrowLeft aria-hidden="true" />
            Ke halaman masuk
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      {challenge === null ? (
        <form onSubmit={handleDetailsSubmit} noValidate>
          <FieldGroup className="gap-6">
            <Field>
              <FieldLabel className="text-small text-ink">Email</FieldLabel>
              <div className="flex items-center justify-between gap-3 rounded-md border border-hairline bg-canvas px-3.5 py-2.5">
                <span className="truncate text-small text-ink">{email}</span>
                <Link
                  href={loginHref}
                  className="shrink-0 text-small text-primary-hover hover:underline"
                >
                  Ganti
                </Link>
              </div>
            </Field>
            <Field>
              <FieldLabel htmlFor="signup-name" className="text-small text-ink">
                Nama lengkap
              </FieldLabel>
              <Input
                id="signup-name"
                autoComplete="name"
                placeholder="Nama sesuai identitas kerja"
                maxLength={MAX_NAME_LENGTH}
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="h-11"
              />
              <FieldDescription className="text-caption text-ink-secondary">
                Tampil di riwayat keputusan klaim yang Anda buat.
              </FieldDescription>
            </Field>
            <Button
              type="submit"
              size="lg"
              disabled={!isNameValid || enrollmentMutation.isPending}
            >
              {enrollmentMutation.isPending ? (
                <>
                  <Spinner aria-hidden="true" />
                  Menyiapkan kode QR
                </>
              ) : (
                <>
                  Lanjut ke authenticator
                  <LuArrowRight aria-hidden="true" />
                </>
              )}
            </Button>
          </FieldGroup>
        </form>
      ) : (
        <form onSubmit={handleConfirmSubmit} noValidate>
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between gap-3">
              <span className="text-small text-ink-secondary">
                Selesaikan sebelum waktu habis
              </span>
              <Pill
                tone={remainingMs <= EXPIRY_WARNING_MS ? 'warning' : 'outline'}
                icon={LuClock}
                className="tabular-nums"
              >
                <span aria-label="Sisa waktu">
                  {formatCountdown(remainingMs)}
                </span>
              </Pill>
            </div>
            <ol className="flex flex-col gap-6">
              <SetupStep number={1} title="Pindai kode QR">
                <p className="text-caption text-ink-secondary">
                  Buka Google Authenticator, Microsoft Authenticator, atau
                  aplikasi sejenis, lalu pilih tambah akun dan pindai kode ini.
                </p>
                <div className="flex justify-center rounded-lg border border-hairline bg-surface p-3">
                  <Image
                    src={challenge.qrCodeDataUrl}
                    alt={`Kode QR authenticator untuk ${email}`}
                    width={192}
                    height={192}
                    unoptimized
                  />
                </div>
              </SetupStep>
              <SetupStep
                number={2}
                title="Tidak bisa memindai? Tempel setup key"
              >
                <SetupKey setupKey={challenge.setupKey} />
              </SetupStep>
              <SetupStep number={3} title="Masukkan kode dari aplikasi">
                <Field>
                  <FieldLabel htmlFor="signup-code" className="sr-only">
                    Kode authenticator
                  </FieldLabel>
                  <TotpCodeInput
                    id="signup-code"
                    value={authenticatorCode}
                    onChange={setAuthenticatorCode}
                    disabled={isExpired}
                  />
                  <FieldDescription className="flex items-center gap-1.5 text-caption text-ink-secondary">
                    <LuSmartphone className="size-3.5" aria-hidden="true" />
                    Kode membuktikan authenticator sudah terhubung.
                  </FieldDescription>
                </Field>
              </SetupStep>
            </ol>
            <div className="flex flex-col gap-2">
              <Button
                type="submit"
                size="lg"
                disabled={
                  authenticatorCode.length !== TOTP_CODE_LENGTH ||
                  isExpired ||
                  confirmationMutation.isPending
                }
              >
                {confirmationMutation.isPending ? (
                  <>
                    <Spinner aria-hidden="true" />
                    Mengaktifkan akun
                  </>
                ) : (
                  <>
                    <LuUserCheck aria-hidden="true" />
                    Sudah, aktifkan akun
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={requestChallenge}
                disabled={enrollmentMutation.isPending}
              >
                {enrollmentMutation.isPending ? (
                  <Spinner aria-hidden="true" />
                ) : (
                  <LuRefreshCw aria-hidden="true" />
                )}
                Buat kode QR baru
              </Button>
            </div>
          </div>
        </form>
      )}
      <AlertDialog open={isExpired}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="size-10">
              <LuTimerOff aria-hidden="true" className="size-5" />
            </AlertDialogMedia>
            <AlertDialogTitle>Waktu setup habis</AlertDialogTitle>
            <AlertDialogDescription>
              Kode QR ini sudah tidak berlaku dan akun belum dibuat. Hapus entri
              INTEGRA yang mungkin sudah tersimpan di authenticator, lalu buat
              kode QR baru. Kembali ke halaman masuk otomatis dalam{' '}
              <span className="tabular-nums">
                {Math.max(0, Math.ceil(redirectRemainingMs / 1000))}
              </span>{' '}
              detik.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => router.replace(loginHref)}
              disabled={enrollmentMutation.isPending}
            >
              Kembali ke login
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                requestChallenge();
              }}
              disabled={enrollmentMutation.isPending}
            >
              {enrollmentMutation.isPending ? (
                <Spinner aria-hidden="true" />
              ) : (
                <LuQrCode aria-hidden="true" />
              )}
              Buat kode QR baru
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <NoticeDialog
        open={notice !== null}
        onOpenChange={(open) => !open && closeNotice()}
        icon={LuCircleAlert}
        title={notice?.title ?? ''}
        description={notice?.description ?? ''}
        actionLabel={notice?.actionLabel ?? ''}
      />
    </>
  );
}
