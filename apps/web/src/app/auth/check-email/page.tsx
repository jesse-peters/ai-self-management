'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <p className="text-sm text-gray-500">Loading…</p>
  </div>
);

function CheckEmailContent() {
  const [email, setEmail] = useState('');
  const [emailType, setEmailType] = useState<'magic-link' | 'password'>('magic-link');
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();
  
  // Lazy create supabase client only when needed (in browser)
  const getSupabase = () => {
    if (typeof window === 'undefined') {
      throw new Error('Supabase client can only be used in the browser');
    }
    return createBrowserClient();
  };

  useEffect(() => {
    const emailParam = searchParams.get('email');
    const typeParam = searchParams.get('type') as 'magic-link' | 'password' | null;

    if (emailParam) {
      setEmail(emailParam);
    }

    if (typeParam === 'magic-link' || typeParam === 'password') {
      setEmailType(typeParam);
    }

    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [searchParams, isAuthenticated, router]);

  const handleResend = async () => {
    if (!email) return;

    setError(null);
    setResendSuccess(false);
    setIsResending(true);

    try {
      const supabase = getSupabase();
      
      if (emailType === 'magic-link') {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) {
          // Check for common configuration issues
          const errorMsg = error.message.toLowerCase();
          const callbackUrl = `${window.location.origin}/auth/callback`;
          
          if (errorMsg.includes('email') && (errorMsg.includes('send') || errorMsg.includes('confirmation') || errorMsg.includes('otp'))) {
            setError(
              `Error sending email: ${error.message}\n\n` +
              `To fix this:\n` +
              `1. Go to Supabase Dashboard → Authentication → Providers → Email\n` +
              `2. Ensure "Email" provider is enabled\n` +
              `3. For production: Configure SMTP in Settings → Auth → SMTP Settings\n` +
              `4. Check that redirect URLs include: ${callbackUrl}\n` +
              `   (Go to Authentication → URL Configuration → Redirect URLs)`
            );
          } else {
            setError(error.message);
          }
          return;
        }
      } else {
        setResendSuccess(true);
        return;
      }

      setResendSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsResending(false);
    }
  };

  const getMessage = () => {
    if (emailType === 'magic-link') {
      return {
        title: 'Check your email',
        description: `We've sent a magic link to ${email || 'your email address'}. Click the link in the email to sign in.`,
        resendLabel: 'Resend magic link',
      };
    }

    return {
      title: 'Confirm your email',
      description: `We've sent a confirmation email to ${email || 'your email address'}. Please check your inbox and click the confirmation link to complete your registration.`,
      resendLabel: 'Resend confirmation email',
    };
  };

  const message = getMessage();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {message.title}
          </h2>
        </div>

        <div className="mt-8 space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-700 whitespace-pre-line">{error}</p>
            </div>
          )}

          {resendSuccess && (
            <div className="rounded-md bg-green-50 p-4">
              <p className="text-sm text-green-700">Email sent! Please check your inbox.</p>
            </div>
          )}

          <div className="rounded-md bg-blue-50 p-4">
            <p className="text-sm text-blue-700">{message.description}</p>
          </div>

          <div className="space-y-4">
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending || !email}
              className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isResending ? 'Sending...' : message.resendLabel}
            </button>

            <Link
              href="/auth/login"
              className="w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Back to sign in
            </Link>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              Didn't receive the email? Check your spam folder or try resending.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckEmailPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <CheckEmailContent />
    </Suspense>
  );
}

