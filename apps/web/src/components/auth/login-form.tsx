'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  LuArrowRight,
  LuCircleAlert,
  LuCircleCheck,
  LuMail,
  LuSmartphone,
  LuUserPlus,
} from 'react-icons/lu';
import { type FormEvent, useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { NoticeDialog } from '@/components/notice-dialog';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import { Spinner } from '@/components/ui/spinner';
import { CURRENT_USER_QUERY_KEY } from '@/hooks/use-current-user';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { isValidEmailFormat, normalizeEmail } from '@/lib/email';
import { toSafeReturnPath } from '@/lib/return-path';
import {
  checkEmailStatus,
  getErrorStatus,
  isTooManyRequestsError,
  logIn,
} from '@/services/auth.service';
import { TOTP_CODE_LENGTH, TotpCodeInput } from './totp-code-input';

const EMAIL_CHECK_DELAY_MS = 500;

/**
 * `unknown` means the check failed (offline or rate limited); login stays
 * available and the API decides.
 */
type EmailState =
  | 'empty'
  | 'typing'
  | 'invalid'
  | 'checking'
  | 'registered'
  | 'demo'
  | 'unregistered'
  | 'unknown';

function describeLoginError(error: unknown): string {
  if (isTooManyRequestsError(error)) {
    return 'Terlalu banyak percobaan masuk. Tunggu satu menit, lalu coba lagi.';
  }
  if (getErrorStatus(error) === 401) {
    return 'Kode tidak cocok dengan email ini. Setiap kode hanya bisa dipakai sekali, tunggu kode berikutnya di aplikasi authenticator.';
  }
  return 'Server tidak dapat dihubungi. Periksa koneksi, lalu coba lagi.';
}

function EmailStatusHint({ emailState }: { emailState: EmailState }) {
  if (emailState === 'checking') {
    return (
      <FieldDescription className="flex items-center gap-1.5 text-caption text-ink-secondary">
        <Spinner className="size-3.5" aria-hidden="true" />
        Memeriksa akun…
      </FieldDescription>
    );
  }
  if (emailState === 'registered') {
    return (
      <FieldDescription className="flex items-center gap-1.5 text-caption text-success-ink">
        <LuCircleCheck className="size-3.5" aria-hidden="true" />
        Akun ditemukan. Masukkan kode authenticator.
      </FieldDescription>
    );
  }
  if (emailState === 'demo') {
    return (
      <FieldDescription className="flex items-center gap-1.5 text-caption text-success-ink">
        <LuCircleCheck className="size-3.5" aria-hidden="true" />
        Akun demo. Masuk tanpa kode authenticator.
      </FieldDescription>
    );
  }
  if (emailState === 'unregistered') {
    return (
      <FieldDescription className="flex items-center gap-1.5 text-caption text-ink-secondary">
        <LuUserPlus className="size-3.5" aria-hidden="true" />
        Email ini belum punya akun INTEGRA.
      </FieldDescription>
    );
  }
  return null;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState(() => searchParams.get('email') ?? '');
  const [hasLeftEmailField, setHasLeftEmailField] = useState(false);
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isSignupPromptRequested, setIsSignupPromptRequested] = useState(false);
  const [signupDeclinedFor, setSignupDeclinedFor] = useState<string | null>(
    null,
  );
  const [authenticatorCode, setAuthenticatorCode] = useState('');

  const normalizedEmail = normalizeEmail(email);
  const debouncedEmail = useDebouncedValue(
    normalizedEmail,
    EMAIL_CHECK_DELAY_MS,
  );
  const isEmailFormatValid = isValidEmailFormat(normalizedEmail);
  const emailStatusQuery = useQuery({
    queryKey: ['auth', 'email-status', debouncedEmail],
    queryFn: () => checkEmailStatus(debouncedEmail),
    enabled: isValidEmailFormat(debouncedEmail),
    staleTime: 30_000,
    retry: false,
  });
  const logInMutation = useMutation({
    mutationFn: logIn,
    onSuccess: (currentUser) => {
      queryClient.setQueryData(CURRENT_USER_QUERY_KEY, currentUser);
      router.replace(toSafeReturnPath(searchParams.get('next')));
    },
    onError: () => setAuthenticatorCode(''),
  });

  const emailState: EmailState = !normalizedEmail
    ? 'empty'
    : normalizedEmail !== debouncedEmail
      ? isEmailFormatValid || !hasLeftEmailField
        ? 'typing'
        : 'invalid'
      : !isEmailFormatValid
        ? 'invalid'
        : emailStatusQuery.isPending
          ? 'checking'
          : emailStatusQuery.isError
            ? 'unknown'
            : !emailStatusQuery.data.registered
              ? 'unregistered'
              : emailStatusQuery.data.requiresCode
                ? 'registered'
                : 'demo';
  const isSignupPromptOpen =
    emailState === 'unregistered' &&
    signupDeclinedFor !== normalizedEmail &&
    (!isEmailFocused || isSignupPromptRequested);
  const isCodeComplete = authenticatorCode.length === TOTP_CODE_LENGTH;

  function changeEmail(nextEmail: string) {
    setEmail(nextEmail);
    setIsSignupPromptRequested(false);
  }

  function declineSignup() {
    setSignupDeclinedFor(normalizedEmail);
    setIsSignupPromptRequested(false);
  }

  function goToSignup() {
    const signupParams = new URLSearchParams({ email: normalizedEmail });
    const returnPath = searchParams.get('next');
    if (returnPath) signupParams.set('next', returnPath);
    router.push(`/signup?${signupParams}`);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasLeftEmailField(true);
    if (!isEmailFormatValid) return;
    if (emailState === 'unregistered') {
      setSignupDeclinedFor(null);
      setIsSignupPromptRequested(true);
      return;
    }
    if (emailState === 'demo') {
      logInMutation.mutate({ email: normalizedEmail });
    } else if (isCodeComplete) {
      logInMutation.mutate({ email: normalizedEmail, code: authenticatorCode });
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FieldGroup className="gap-6">
        <Field data-invalid={emailState === 'invalid'} data-tour="login-email">
          <FieldLabel htmlFor="login-email" className="text-small text-ink">
            Email kerja
          </FieldLabel>
          <InputGroup className="h-11">
            <InputGroupInput
              id="login-email"
              type="email"
              inputMode="email"
              autoComplete="username"
              placeholder="nama@instansi.go.id"
              required
              aria-invalid={emailState === 'invalid'}
              aria-describedby="login-email-status"
              value={email}
              onChange={(event) => changeEmail(event.target.value)}
              onFocus={() => setIsEmailFocused(true)}
              onBlur={() => {
                setIsEmailFocused(false);
                setHasLeftEmailField(true);
              }}
            />
            <InputGroupAddon className="text-ink-muted">
              <LuMail aria-hidden="true" />
            </InputGroupAddon>
          </InputGroup>
          <div id="login-email-status" aria-live="polite">
            {emailState === 'invalid' ? (
              <FieldError className="text-caption">
                Format email belum benar, contoh: nama@instansi.go.id
              </FieldError>
            ) : (
              <EmailStatusHint emailState={emailState} />
            )}
          </div>
        </Field>
        {emailState !== 'unregistered' && emailState !== 'demo' && (
          <Field data-tour="login-code">
            <FieldLabel htmlFor="login-code" className="text-small text-ink">
              Kode authenticator
            </FieldLabel>
            <TotpCodeInput
              id="login-code"
              value={authenticatorCode}
              onChange={setAuthenticatorCode}
            />
            <FieldDescription className="flex items-center gap-1.5 text-caption text-ink-secondary">
              <LuSmartphone className="size-3.5" aria-hidden="true" />
              Lihat 6 digit kode INTEGRA di aplikasi authenticator.
            </FieldDescription>
          </Field>
        )}
        {emailState === 'unregistered' ? (
          <Button type="submit" size="lg">
            <LuUserPlus aria-hidden="true" />
            Buat akun baru
          </Button>
        ) : (
          <Button
            type="submit"
            size="lg"
            disabled={
              (!isCodeComplete && emailState !== 'demo') ||
              !isEmailFormatValid ||
              logInMutation.isPending
            }
          >
            {logInMutation.isPending ? (
              <>
                <Spinner aria-hidden="true" />
                {emailState === 'demo' ? 'Masuk' : 'Memeriksa kode'}
              </>
            ) : (
              <>
                Masuk
                <LuArrowRight aria-hidden="true" />
              </>
            )}
          </Button>
        )}
      </FieldGroup>
      <ConfirmDialog
        open={isSignupPromptOpen}
        onOpenChange={(open) => !open && declineSignup()}
        icon={LuUserPlus}
        title="Akun belum terdaftar"
        description={`Belum ada akun INTEGRA untuk ${normalizedEmail}. Buat akun baru dengan email ini? Anda akan menghubungkan aplikasi authenticator dalam 5 menit.`}
        confirmLabel="Ya, buat akun"
        onConfirm={goToSignup}
      />
      <NoticeDialog
        open={logInMutation.isError}
        onOpenChange={(open) => !open && logInMutation.reset()}
        icon={LuCircleAlert}
        title="Gagal masuk"
        description={describeLoginError(logInMutation.error)}
        actionLabel="Coba lagi"
      />
    </form>
  );
}
