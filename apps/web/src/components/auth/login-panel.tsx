'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { LoginForm } from './login-form';
import { LoginTour } from './login-tour';

/** Shares the email between the login form and the guide's demo accounts. */
export function LoginPanel() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(() => searchParams.get('email') ?? '');

  return (
    <div className="flex flex-col gap-4">
      <LoginForm email={email} onEmailChange={setEmail} />
      <LoginTour onUseDemoAccount={setEmail} />
    </div>
  );
}
