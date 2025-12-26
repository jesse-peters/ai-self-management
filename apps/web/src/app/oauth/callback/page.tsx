'use client';

import { useEffect, useState } from 'react';

export default function OAuthCallbackPage() {
  const [status, setStatus] = useState<'redirecting' | 'ready_to_click' | 'manual_copy' | 'error'>('redirecting');
  const [authCode, setAuthCode] = useState<string | null>(null);
  const [redirectUri, setRedirectUri] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    try {
      // Get parameters from URL using URLSearchParams
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      const redirectUriParam = params.get('redirectUri');

      if (!code || !redirectUriParam) {
        setStatus('error');
        setErrorMessage('Missing authorization code or redirect URI');
        return;
      }

      setAuthCode(code);
      setRedirectUri(redirectUriParam);

      // Build the callback URL with the authorization code
      const callbackUrl = new URL(redirectUriParam);
      callbackUrl.searchParams.set('code', code);
      if (state) {
        callbackUrl.searchParams.set('state', state);
      }

      const fullUrl = callbackUrl.toString();

      // Log the redirect attempt
      console.log('Attempting to redirect to cursor://', {
        url: fullUrl.substring(0, 100),
        codeLength: code.length,
      });

      // Try to redirect using window.location.href
      window.location.href = fullUrl;

      // After 500ms, if redirect hasn't happened, show clickable button
      // (Chrome requires user interaction for custom URL schemes)
      const showButtonTimeout = setTimeout(() => {
        console.warn('Automatic redirect did not complete, showing clickable button');
        setStatus('ready_to_click');
      }, 500);

      // After 10 seconds, if still no success, show manual copy option
      const showCopyTimeout = setTimeout(() => {
        console.warn('Manual redirect did not complete, showing copy option');
        setStatus('manual_copy');
      }, 10000);

      return () => {
        clearTimeout(showButtonTimeout);
        clearTimeout(showCopyTimeout);
      };
    } catch (error) {
      console.error('Error during OAuth callback:', error);
      setStatus('error');
      setErrorMessage(
        error instanceof Error
          ? `Error: ${error.message}`
          : 'An error occurred during OAuth callback'
      );
    }
  }, []);

  const handleClickToComplete = () => {
    if (!redirectUri || !authCode) {
      setStatus('error');
      setErrorMessage('Missing authorization data');
      return;
    }

    try {
      const params = new URLSearchParams(window.location.search);
      const state = params.get('state');

      const callbackUrl = new URL(redirectUri);
      callbackUrl.searchParams.set('code', authCode);
      if (state) {
        callbackUrl.searchParams.set('state', state);
      }

      const fullUrl = callbackUrl.toString();

      console.log('User clicked to complete redirect to cursor://', {
        url: fullUrl.substring(0, 100),
      });

      // User interaction allows custom URL scheme
      window.location.href = fullUrl;
    } catch (error) {
      console.error('Error during manual redirect:', error);
      setStatus('error');
      setErrorMessage(
        error instanceof Error
          ? `Error: ${error.message}`
          : 'An error occurred during redirect'
      );
    }
  };

  const handleCopyCode = async () => {
    if (!authCode) return;

    try {
      await navigator.clipboard.writeText(authCode);
      setCopySuccess(true);

      // Reset success message after 2 seconds
      setTimeout(() => {
        setCopySuccess(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
      setStatus('error');
      setErrorMessage('Failed to copy authorization code');
    }
  };

  if (status === 'redirecting') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Completing Authorization
          </h1>
          <p className="text-gray-600">
            Redirecting you back to Cursor...
          </p>
          <p className="text-sm text-gray-500 mt-4">
            This should only take a moment.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'ready_to_click') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">✨</div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Complete Authorization
          </h1>
          <p className="text-gray-600 mb-6">
            Click the button below to complete the authorization and return to Cursor.
          </p>

          <button
            onClick={handleClickToComplete}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg mb-4 transition-colors"
          >
            Return to Cursor
          </button>

          <p className="text-sm text-gray-500 mb-4">
            If the button doesn't work, you can copy the authorization code below and paste it manually into Cursor.
          </p>

          <div className="bg-gray-100 p-3 rounded border border-gray-300 mb-4 break-all text-xs text-gray-700 font-mono max-h-24 overflow-y-auto">
            {authCode?.substring(0, 50)}...
          </div>

          <button
            onClick={handleCopyCode}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium py-2 px-4 rounded transition-colors"
          >
            {copySuccess ? '✓ Copied!' : 'Copy Authorization Code'}
          </button>
        </div>
      </div>
    );
  }

  if (status === 'manual_copy') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">📋</div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Manual Authorization
          </h1>
          <p className="text-gray-600 mb-6">
            Copy the authorization code below and paste it into Cursor to complete setup.
          </p>

          <div className="bg-blue-50 border-2 border-blue-300 p-4 rounded-lg mb-6">
            <p className="text-xs text-blue-700 font-medium mb-2">Authorization Code:</p>
            <div className="bg-white p-3 rounded border border-blue-200 break-all text-sm text-gray-900 font-mono max-h-32 overflow-y-auto">
              {authCode}
            </div>
          </div>

          <button
            onClick={handleCopyCode}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg mb-4 transition-colors"
          >
            {copySuccess ? '✓ Code Copied!' : 'Copy Authorization Code'}
          </button>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left">
            <p className="text-sm font-medium text-yellow-900 mb-2">Next steps:</p>
            <ol className="text-sm text-yellow-800 space-y-1 list-decimal list-inside">
              <li>Make sure Cursor is open</li>
              <li>The authorization code has been copied to your clipboard</li>
              <li>Paste it into Cursor when prompted</li>
              <li>Authorization will complete automatically</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Authorization Failed
          </h1>
          <p className="text-gray-600 mb-4">
            {errorMessage || 'An error occurred during authorization'}
          </p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm font-medium text-red-900 mb-2">What to do:</p>
            <ol className="text-sm text-red-800 text-left space-y-1 list-decimal list-inside">
              <li>Check that Cursor is running</li>
              <li>Try connecting to Cursor again</li>
              <li>If the issue persists, contact support</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
