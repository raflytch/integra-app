'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, CircleAlert, Mail, Smartphone } from 'lucide-react';
import { type FormEvent, Fragment, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { Spinner } from '@/components/ui/spinner';
import { CURRENT_USER_QUERY_KEY } from '@/hooks/use-current-user';
import { isTooManyRequestsError, logIn } from '@/services/auth.service';

const TOTP_CODE_LENGTH = 6;
const OTP_GROUP_SIZE = TOTP_CODE_LENGTH / 2;
const DEFAULT_RETURN_PATH = '/claims';

function toSafeReturnPath(requestedPath: string | null): string {
  const isInternalPath =
    requestedPath?.startsWith('/') && !requestedPath.startsWith('//');
  return isInternalPath ? requestedPath! : DEFAULT_RETURN_PATH;
}

function describeLoginError(error: unknown): string {
  if (isTooManyRequestsError(error)) {
    return 'Terlalu banyak percobaan masuk. Tunggu satu menit, lalu coba lagi.';
  }
  if (isAxiosError(error) && error.response?.status === 401) {
    return 'Email atau kode tidak valid. Setiap kode hanya bisa dipakai sekali, tunggu kode berikutnya.';
  }
  return 'Server tidak dapat dihubungi. Periksa koneksi, lalu coba lagi.';
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [authenticatorCode, setAuthenticatorCode] = useState('');
  const logInMutation = useMutation({
    mutationFn: logIn,
    onSuccess: (currentUser) => {
      queryClient.setQueryData(CURRENT_USER_QUERY_KEY, currentUser);
      router.replace(toSafeReturnPath(searchParams.get('next')));
    },
    onError: () => setAuthenticatorCode(''),
  });
  const isCodeComplete = authenticatorCode.length === TOTP_CODE_LENGTH;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    logInMutation.mutate({ email, code: authenticatorCode });
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup className="gap-6">
        <Field>
          <FieldLabel htmlFor="login-email" className="text-graphite">
            Email kerja
          </FieldLabel>
          <InputGroup className="h-10 border-linen-border bg-eggshell-canvas">
            <InputGroupInput
              id="login-email"
              type="email"
              autoComplete="username"
              placeholder="nama@bpjs-kesehatan.go.id"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <InputGroupAddon className="text-quiet-gray">
              <Mail aria-hidden="true" />
            </InputGroupAddon>
          </InputGroup>
        </Field>
        <Field>
          <FieldLabel htmlFor="login-code" className="text-graphite">
            Kode authenticator
          </FieldLabel>
          <InputOTP
            id="login-code"
            maxLength={TOTP_CODE_LENGTH}
            pattern={REGEXP_ONLY_DIGITS}
            autoComplete="one-time-code"
            value={authenticatorCode}
            onChange={setAuthenticatorCode}
            containerClassName="justify-between"
          >
            {[0, OTP_GROUP_SIZE].map((groupStartIndex) => (
              <Fragment key={groupStartIndex}>
                {groupStartIndex > 0 && (
                  <InputOTPSeparator className="text-disabled-ash" />
                )}
                <InputOTPGroup>
                  {Array.from({ length: OTP_GROUP_SIZE }, (_, offset) => (
                    <InputOTPSlot
                      key={offset}
                      index={groupStartIndex + offset}
                      className="size-11 border-linen-border bg-eggshell-canvas text-base font-medium text-graphite"
                    />
                  ))}
                </InputOTPGroup>
              </Fragment>
            ))}
          </InputOTP>
          <FieldDescription className="flex items-center gap-1.5 text-quiet-gray">
            <Smartphone className="size-3.5" aria-hidden="true" />
            Lihat 6 digit kode INTEGRA di aplikasi authenticator.
          </FieldDescription>
        </Field>
        {logInMutation.isError && (
          <Alert variant="destructive" className="border-linen-border">
            <CircleAlert aria-hidden="true" />
            <AlertTitle>Gagal masuk</AlertTitle>
            <AlertDescription>
              {describeLoginError(logInMutation.error)}
            </AlertDescription>
          </Alert>
        )}
        <Button
          type="submit"
          size="lg"
          disabled={!isCodeComplete || !email || logInMutation.isPending}
        >
          {logInMutation.isPending ? (
            <>
              <Spinner aria-hidden="true" />
              Memeriksa kode
            </>
          ) : (
            <>
              Masuk
              <ArrowRight aria-hidden="true" />
            </>
          )}
        </Button>
      </FieldGroup>
    </form>
  );
}
