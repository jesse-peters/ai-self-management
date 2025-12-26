'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabaseClient';

type AuthMethod = 'magic-link' | 'password';

export default function RegisterPage() {
  const [authMethod, setAuthMethod] = useState<AuthMethod>('magic-link');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  // Lazy create supabase client only in browser
  const getSupabase = () => {
    if (typeof window === 'undefined') {
      throw new Error('Supabase client can only be used in the browser');
    }
    return createBrowserClient();
  };

  const handleMagicLinkRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate email is provided
    if (!email || !email.trim()) {
      setError('Please enter your email address');
      return;
    }

    setIsLoading(true);

    try {
      const supabase = getSupabase();
      // Supabase auto-creates account on first magic link click
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        // Check for common configuration issues
        const errorMsg = error.message.toLowerCase();
        const callbackUrl = `${window.location.origin}/auth/callback`;
        
        if (errorMsg.includes('email or phone must be set') || errorMsg.includes('email') && errorMsg.includes('phone') && errorMsg.includes('must')) {
          setError('Please enter a valid email address');
        } else if (errorMsg.includes('email signups disabled') || errorMsg.includes('provider')) {
          setError(`Email authentication is not enabled. Please check your Supabase configuration. Original error: ${error.message}`);
        } else if (errorMsg.includes('failed to fetch') || errorMsg.includes('fetch')) {
          setError('Cannot reach Supabase. Check your internet connection and SUPABASE_URL environment variable.');
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

      // Redirect to check-email page
      router.push(`/auth/check-email?email=${encodeURIComponent(email)}&type=magic-link`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        // Check for common configuration issues
        const errorMsg = error.message.toLowerCase();
        
        if (errorMsg.includes('email signups disabled') || errorMsg.includes('provider')) {
          setError(`Email authentication is not enabled. Please check your Supabase configuration. Original error: ${error.message}`);
        } else if (errorMsg.includes('failed to fetch') || errorMsg.includes('fetch')) {
          setError('Cannot reach Supabase. Check your internet connection and SUPABASE_URL environment variable.');
        } else if (errorMsg.includes('email') && (errorMsg.includes('send') || errorMsg.includes('confirmation'))) {
          setError(
            `Error sending confirmation email: ${error.message}\n\n` +
            `To fix this:\n` +
            `1. Go to Supabase Dashboard → Authentication → Providers → Email\n` +
            `2. Ensure "Email" provider is enabled\n` +
            `3. For production: Configure SMTP in Settings → Auth → SMTP Settings\n` +
            `4. Or disable email confirmations in Authentication → Providers → Email → Confirm email: OFF`
          );
        } else {
          setError(error.message);
        }
        return;
      }

      // Redirect to check-email page for email confirmation
      router.push(`/auth/check-email?email=${encodeURIComponent(email)}&type=password`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Create your ProjectFlow account
          </h2>
        </div>

        {/* Tab Selection */}
        <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-1">
          <button
            type="button"
            onClick={() => {
              setAuthMethod('magic-link');
              setError(null);
            }}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              authMethod === 'magic-link'
                ? 'bg-blue-600 dark:bg-blue-500 text-white'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            Magic Link
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMethod('password');
              setError(null);
            }}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              authMethod === 'password'
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Email/Password
          </button>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
            <p className="text-sm text-red-700 dark:text-red-400 whitespace-pre-line">{error}</p>
          </div>
        )}

        {/* Magic Link Form */}
        {authMethod === 'magic-link' && (
          <form className="mt-8 space-y-6" onSubmit={handleMagicLinkRegister}>
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
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
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
                {isLoading ? 'Sending magic link...' : 'Create account'}
              </button>
            </div>
          </form>
        )}

        {/* Email/Password Form */}
        {authMethod === 'password' && (
          <form className="mt-8 space-y-6" onSubmit={handlePasswordRegister}>
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
                  autoComplete="new-password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Password (min 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div>
                <label htmlFor="confirm-password" className="sr-only">
                  Confirm password
                </label>
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 bg-white rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                {isLoading ? 'Creating account...' : 'Sign up'}
              </button>
            </div>
          </form>
        )}

        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

