'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@/lib/supabaseClient';

type AuthMethod = 'magic-link' | 'password';

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <p className="text-sm text-gray-500">Loading…</p>
  </div>
);

function OAuthAuthorizeContent() {
  const [authMethod, setAuthMethod] = useState<AuthMethod>('magic-link');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get OAuth parameters from URL
  const clientId = searchParams.get('client_id');
  const redirectUri = searchParams.get('redirect_uri');
  const state = searchParams.get('state');
  const codeChallenge = searchParams.get('code_challenge');
  const codeChallengeMethod = searchParams.get('code_challenge_method');
  const scope = searchParams.get('scope');
  const responseType = searchParams.get('response_type');

  // Check if we have OAuth parameters - if not, this is a manual visit
  const hasOAuthParams = !!(clientId || redirectUri || codeChallenge);

  // Build the API authorize URL to redirect to after login
  // Memoized with useCallback to avoid recreating on every render
  const buildAuthorizeUrl = useCallback(() => {
    const apiUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const url = new URL(`${apiUrl}/api/oauth/authorize`);
    if (clientId) url.searchParams.set('client_id', clientId);
    if (redirectUri) url.searchParams.set('redirect_uri', redirectUri);
    if (state) url.searchParams.set('state', state);
    if (codeChallenge) url.searchParams.set('code_challenge', codeChallenge);
    if (codeChallengeMethod) url.searchParams.set('code_challenge_method', codeChallengeMethod);
    if (responseType) url.searchParams.set('response_type', responseType);
    if (scope) url.searchParams.set('scope', scope);
    return url.toString();
  }, [clientId, redirectUri, state, codeChallenge, codeChallengeMethod, responseType, scope]);

  // Lazy create supabase client only in browser
  const getSupabase = useCallback(() => {
    if (typeof window === 'undefined') {
      throw new Error('Supabase client can only be used in the browser');
    }
    return createBrowserClient();
  }, []);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = getSupabase();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          // User is authenticated - redirect to complete OAuth flow
          const authorizeUrl = buildAuthorizeUrl();
          try {
            router.push(authorizeUrl);
          } catch (pushErr) {
            console.error('Error pushing auth URL:', pushErr);
            setError('Failed to complete authorization. Please try again.');
            setIsCheckingAuth(false);
          }
        } else {
          // User not authenticated - show login form
          setIsCheckingAuth(false);
        }
      } catch (err) {
        console.error('Error checking auth:', err);
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        if (errorMsg.includes('fetch')) {
          setError('Cannot reach authentication service. Please check your connection.');
        } else {
          setError('Failed to check authentication status. Please try again.');
        }
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, [buildAuthorizeUrl, getSupabase, router]);

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
      // Redirect back to this page after email confirmation
      const authorizeUrl = buildAuthorizeUrl();
      const callbackUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(authorizeUrl)}`;

      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: callbackUrl,
        },
      });

      if (error) {
        const errorMsg = error.message.toLowerCase();
        if (errorMsg.includes('email or phone must be set') || (errorMsg.includes('email') && errorMsg.includes('phone') && errorMsg.includes('must'))) {
          setError('Please enter a valid email address');
        } else if (errorMsg.includes('email signups disabled') || errorMsg.includes('provider')) {
          setError(`Email authentication is not enabled. Please check your Supabase configuration. Original error: ${error.message}`);
        } else if (errorMsg.includes('failed to fetch') || errorMsg.includes('fetch')) {
          setError('Cannot reach Supabase. Check your internet connection and SUPABASE_URL environment variable.');
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
        if (error.message.includes('Email signups disabled') || error.message.includes('provider')) {
          setError(`Email/password authentication is not enabled. Check your Supabase configuration. Original error: ${error.message}`);
        } else if (error.message.includes('Invalid login credentials')) {
          setError('Invalid email or password. Please try again.');
        } else if (error.message.includes('Failed to fetch') || error.message.includes('fetch')) {
          setError('Cannot reach Supabase. Check your internet connection and SUPABASE_URL environment variable.');
        } else {
          setError(error.message);
        }
        return;
      }

      // Redirect to complete OAuth flow
      const authorizeUrl = buildAuthorizeUrl();
      router.push(authorizeUrl);
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

  const handleCopyUrl = () => {
    const authorizeUrl = buildAuthorizeUrl();
    navigator.clipboard.writeText(authorizeUrl).then(() => {
      setSuccessMessage('Authorization URL copied to clipboard!');
      setTimeout(() => setSuccessMessage(null), 3000);
    }).catch(() => {
      setError('Failed to copy URL to clipboard');
    });
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-sm text-gray-500">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // If no OAuth parameters, show manual setup instructions
  if (!hasOAuthParams) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              ProjectFlow MCP Authorization
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Manual OAuth Authorization Setup
            </p>
          </div>

          <div className="rounded-md bg-yellow-50 p-4 border border-yellow-200">
            <h3 className="text-sm font-medium text-yellow-900 mb-2">Authorization in Progress</h3>
            <p className="text-sm text-yellow-700">
              If you're seeing this page, you likely clicked an authorization URL from Cursor. 
              Please ensure you're logged in below, and we'll complete the authorization process.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              const loginUrl = new URL('/auth/login', window.location.origin);
              window.location.href = loginUrl.toString();
            }}
            className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Go to Login
          </button>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              If you're already logged in, please contact support or try the authorization process again from Cursor.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Authorize Cursor MCP Connection
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to authorize ProjectFlow MCP server access
          </p>
        </div>

        {/* Instructions */}
        <div className="rounded-md bg-blue-50 p-4 border border-blue-200">
          <h3 className="text-sm font-medium text-blue-900 mb-2">About this authorization</h3>
          <p className="text-sm text-blue-700 mb-3">
            This page authorizes Cursor to connect to your ProjectFlow MCP server. After signing in, 
            you'll be redirected back to Cursor to complete the connection.
          </p>
          {redirectUri?.startsWith('cursor://') && (
            <div className="mt-3 pt-3 border-t border-blue-200">
              <p className="text-xs text-blue-600 font-medium mb-2">How this works:</p>
              <ol className="text-xs text-blue-600 space-y-1 list-decimal list-inside">
                <li>You clicked an authorization link from Cursor</li>
                <li>Sign in with your credentials below</li>
                <li>We'll generate an authorization code</li>
                <li>Cursor will receive the code and complete setup automatically</li>
              </ol>
            </div>
          )}
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

        <div className="text-center space-y-2">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link href="/auth/register" className="text-blue-600 hover:text-blue-500">
              Sign up
            </Link>
          </p>
          <button
            type="button"
            onClick={handleCopyUrl}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Copy authorization URL
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OAuthAuthorizePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <OAuthAuthorizeContent />
    </Suspense>
  );
}

