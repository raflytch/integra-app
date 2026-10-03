'use client';

import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { Fragment } from 'react';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '@/components/ui/input-otp';

export const TOTP_CODE_LENGTH = 6;
const OTP_GROUP_SIZE = TOTP_CODE_LENGTH / 2;

/** Six digit slots in two groups of three, as authenticator apps show them. */
export function TotpCodeInput({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <InputOTP
      id={id}
      maxLength={TOTP_CODE_LENGTH}
      pattern={REGEXP_ONLY_DIGITS}
      autoComplete="one-time-code"
      value={value}
      onChange={onChange}
      disabled={disabled}
      containerClassName="justify-between"
    >
      {[0, OTP_GROUP_SIZE].map((groupStartIndex) => (
        <Fragment key={groupStartIndex}>
          {groupStartIndex > 0 && (
            <InputOTPSeparator className="text-ink-muted" />
          )}
          <InputOTPGroup>
            {Array.from({ length: OTP_GROUP_SIZE }, (_, offset) => (
              <InputOTPSlot
                key={offset}
                index={groupStartIndex + offset}
                className="size-11 text-body font-medium text-ink"
              />
            ))}
          </InputOTPGroup>
        </Fragment>
      ))}
    </InputOTP>
  );
}
