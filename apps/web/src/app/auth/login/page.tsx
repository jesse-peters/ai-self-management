'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabaseClient';

type AuthMethod = 'magic-link' | 'password';

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <p className="text-sm text-gray-500">Loading…</p>
  </div>
);

function LoginContent() {
  const [authMethod, setAuthMethod] = useState<AuthMethod>('magic-link');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Lazy create supabase client only in browser
  const getSupabase = () => {
    if (typeof window === 'undefined') {
      throw new Error('Supabase client can only be used in the browser');
    }
    return createBrowserClient();
  };

  useEffect(() => {
    const errorParam = searchParams.get('error');
    const messageParam = searchParams.get('message');
    if (errorParam) {
      setError(errorParam);
    }
    if (messageParam) {
      setSuccessMessage(messageParam);
    }
  }, [searchParams]);

  const handleMagicLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    
    // Validate email is provided
    if (!email || !email.trim()) {
      setError('Please enter your email address');
      return;
    }

    setIsLoading(true);

    try {
      const supabase = getSupabase();
      // Get redirect parameter from URL (for OAuth flow)
      const redirectParam = searchParams.get('redirect');
      const callbackUrl = redirectParam 
        ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectParam)}`
        : `${window.location.origin}/auth/callback`;

      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: callbackUrl,
        },
      });

      if (error) {
        // Check for common configuration issues
        const errorMsg = error.message.toLowerCase();
        
        if (errorMsg.includes('email or phone must be set') || errorMsg.includes('email') && errorMsg.includes('phone') && errorMsg.includes('must')) {
          setError('Please enter a valid email address');
        } else if (errorMsg.includes('email signups disabled') || errorMsg.includes('provider')) {
          setError(`Email authentication is not enabled. Please check your Supabase configuration. Original error: ${error.message}`);
        } else if (errorMsg.includes('failed to fetch') || errorMsg.includes('fetch')) {
          setError('Cannot reach Supabase. Check your internet connection and NEXT_PUBLIC_SUPABASE_URL environment variable.');
        } else if (errorMsg.includes('email') && (errorMsg.includes('send') || errorMsg.includes('confirmation') || errorMsg.includes('otp'))) {
          setError(
            `Error sending email: ${error.message}\n\n` +
            `To fix this:\n` +
            `1. Go to Supabase Dashboard → Authentication → Providers → Email\n` +
            `2. Ensure "Email" provider is enabled\n` +
            `3. For production: Configure SMTP in Settings → Auth → SMTP Settings\n` +
            `4. Check that redirect URLs include: ${callbackUrl}\n` +
            `   (Go to Authentication → URL Configuration → Redirect URLs)`
          );
        } else if (errorMsg.includes('redirect') || errorMsg.includes('url')) {
          setError(
            `Redirect URL error: ${error.message}\n\n` +
            `Add this URL to your Supabase redirect allowlist:\n` +
            `${callbackUrl}\n\n` +
            `Go to: Authentication → URL Configuration → Redirect URLs`
          );
        } else {
          setError(error.message);
        }
        return;
      }

      router.push(`/auth/check-email?email=${encodeURIComponent(email)}&type=magic-link`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      if (errorMessage.includes('fetch')) {
        setError('Network error: Cannot reach Supabase. Check your internet connection.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Check for common configuration issues
        if (error.message.includes('Email signups disabled') || error.message.includes('provider')) {
          setError(`Email/password authentication is not enabled. Check your Supabase configuration. Original error: ${error.message}`);
        } else if (error.message.includes('Invalid login credentials')) {
          setError('Invalid email or password. Please try again.');
        } else if (error.message.includes('Failed to fetch') || error.message.includes('fetch')) {
          setError('Cannot reach Supabase. Check your internet connection and NEXT_PUBLIC_SUPABASE_URL environment variable.');
        } else {
          setError(error.message);
        }
        return;
      }

      // Get redirect parameter from URL (for OAuth flow)
      const redirectParam = searchParams.get('redirect');
      const redirectTo = redirectParam || '/dashboard';
      router.push(redirectTo);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      if (errorMessage.includes('fetch')) {
        setError('Network error: Cannot reach Supabase. Check your internet connection.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to ProjectFlow
          </h2>
        </div>

        <div className="flex rounded-lg border border-gray-200 bg-white p-1">
          <button
            type="button"
            onClick={() => {
              setAuthMethod('magic-link');
              setError(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              authMethod === 'magic-link' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Magic Link
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMethod('password');
              setError(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              authMethod === 'password' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Email/Password
          </button>
        </div>

        {successMessage && (
          <div className="rounded-md bg-green-50 p-4">
            <p className="text-sm text-green-700">{successMessage}</p>
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-700 whitespace-pre-line">{error}</p>
          </div>
        )}

        {authMethod === 'magic-link' && (
          <form className="mt-8 space-y-6" onSubmit={handleMagicLinkLogin}>
            <div className="rounded-md shadow-sm">
              <div>
                <label htmlFor="magic-email" className="sr-only">
                  Email address
                </label>
                <input
                  id="magic-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isLoading ? 'Sending magic link...' : 'Send magic link'}
              </button>
            </div>
          </form>
        )}

        {authMethod === 'password' && (
          <form className="mt-8 space-y-6" onSubmit={handlePasswordLogin}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="password-email" className="sr-only">
                  Email address
                </label>
                <input
                  id="password-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 bg-white rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 bg-white rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>
        )}

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link href="/auth/register" className="text-blue-600 hover:text-blue-500">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <LoginContent />
    </Suspense>
  );
}

