'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { copyToClipboard } from '@/lib/clipboard';

interface TestResult {
  success: boolean;
  message: string;
  error?: string;
}

export function MCPSetup() {
  const { session } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [apiUrl, setApiUrl] = useState('');
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);
  const [tokenConfig, setTokenConfig] = useState<string | null>(null);
  const [tokenCopied, setTokenCopied] = useState(false);

  // Get API URL from environment or current origin
  useEffect(() => {
    const url =
      process.env.NEXT_PUBLIC_APP_URL ||
      (typeof window !== 'undefined' ? window.location.origin : '');
    setApiUrl(url);
  }, []);

  // Get MCP config JSON (for manual setup - without token)
  const getMCPConfig = (): string => {
    return JSON.stringify(
      {
        mcpServers: {
          projectflow: {
            url: `${apiUrl}/api/mcp`,
          },
        },
      },
      null,
      2
    );
  };

  // Get MCP config JSON with token (for manual setup with token)
  const getMCPConfigWithToken = (token: string): string => {
    return JSON.stringify(
      {
        mcpServers: {
          projectflow: {
            url: `${apiUrl}/api/mcp`,
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        },
      },
      null,
      2
    );
  };

  // Generate OAuth token and return config
  const handleGenerateToken = async () => {
    setIsGeneratingToken(true);
    setTokenConfig(null);
    setTestResult(null);

    try {
      const response = await fetch(`${apiUrl}/api/mcp/connect`, {
        method: 'GET',
        credentials: 'include', // Include cookies for session
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Failed to generate token: ${response.statusText}`);
      }

      const configJson = await response.text();
      const config = JSON.parse(configJson);
      const token = config.mcpServers?.projectflow?.headers?.Authorization?.replace('Bearer ', '');

      if (!token) {
        throw new Error('Token not found in response');
      }

      setTokenConfig(getMCPConfigWithToken(token));
      setTestResult({
        success: true,
        message: 'Token generated successfully! Copy the configuration below and add it to your Cursor settings file.',
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Failed to generate token',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsGeneratingToken(false);
    }
  };

  const handleCopyTokenConfig = async () => {
    if (!tokenConfig) return;
    const result = await copyToClipboard(tokenConfig);
    if (result.success) {
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 2000);
    } else {
      alert(`Failed to copy: ${result.error}`);
    }
  };

  // Get Cursor settings file path based on OS
  const getCursorSettingsPath = (): string => {
    if (typeof window === 'undefined') return '';
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('mac')) {
      return '~/Library/Application Support/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json';
    } else if (userAgent.includes('win')) {
      return '%APPDATA%\\Cursor\\User\\globalStorage\\saoudrizwan.claude-dev\\settings\\cline_mcp_settings.json';
    } else {
      return '~/.config/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json';
    }
  };

  const handleConnect = () => {
    try {
      // Create MCP config object - just the URL, no token
      // Authentication will happen via OAuth when Cursor connects
      const config = {
        url: `${apiUrl}/api/mcp`,
      };

      // Encode config as base64
      const configJson = JSON.stringify(config);
      const configBase64 = btoa(configJson);

      // Create Cursor deep link
      const deepLink = `cursor://anysphere.cursor-deeplink/mcp/install?name=projectflow&config=${encodeURIComponent(configBase64)}`;

      // Try to open the deep link
      window.location.href = deepLink;

      // Show success message after a short delay
      setTimeout(() => {
        setTestResult({
          success: true,
          message: 'Opening Cursor to complete setup... You\'ll be prompted to authenticate when Cursor connects.',
        });
      }, 500);
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Failed to create connection link',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const handleCopy = async () => {
    const config = getMCPConfig();
    const result = await copyToClipboard(config);
    if (result.success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      alert(`Failed to copy: ${result.error}`);
    }
  };

  const handleTestConnection = async () => {
    if (!session?.access_token) {
      setTestResult({
        success: false,
        message: 'No authentication token available',
        error: 'Please refresh the page and try again',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch(`${apiUrl}/api/mcp/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setTestResult({
          success: true,
          message: data.message || 'MCP connection successful',
        });
      } else {
        setTestResult({
          success: false,
          message: data.message || 'MCP connection failed',
          error: data.error || 'Unknown error',
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: 'MCP connection failed',
        error: error instanceof Error ? error.message : 'Network error',
      });
    } finally {
      setIsTesting(false);
    }
  };

  if (!session) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-8">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            {isExpanded ? (
              <svg
                className="w-5 h-5 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 15l7-7 7 7"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Set up MCP Integration</h2>
            <p className="text-sm text-gray-500">
              Connect Cursor to ProjectFlow for AI-powered project management
            </p>
          </div>
        </div>
        {testResult?.success && (
          <div className="flex-shrink-0 ml-4">
            <svg
              className="w-5 h-5 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        )}
      </button>

      {isExpanded && (
        <div className="px-6 py-4 border-t border-gray-200 space-y-6">
          {/* Introduction */}
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Connect your Cursor IDE to ProjectFlow using the Model Context Protocol (MCP). This
              allows AI assistants in Cursor to create projects, manage tasks, and track your work
              directly from your editor.
            </p>
            
            {/* Quick Connect Button */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-blue-900 mb-1">
                    One-Click Connect with OAuth
                  </h3>
                  <p className="text-xs text-blue-700">
                    Automatically configure Cursor with ProjectFlow MCP. Cursor will open a browser window for OAuth authentication. Tokens refresh automatically!
                  </p>
                </div>
                <button
                  onClick={handleConnect}
                  disabled={!session}
                  className="ml-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  <span>Connect to Cursor</span>
                </button>
              </div>
            </div>

            {/* Manual Token Generation */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-orange-900 mb-1">
                    Manual Token Generation (Workaround)
                  </h3>
                  <p className="text-xs text-orange-700 mb-3">
                    If the automatic OAuth flow doesn&apos;t complete, you can generate a token manually and add it to your Cursor configuration.
                  </p>
                  <button
                    onClick={handleGenerateToken}
                    disabled={isGeneratingToken || !session}
                    className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-md hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {isGeneratingToken ? (
                      <>
                        <svg
                          className="animate-spin h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                          />
                        </svg>
                        <span>Generate Token & Config</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              {tokenConfig && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-orange-900">Configuration with token:</p>
                    <button
                      onClick={handleCopyTokenConfig}
                      className="px-3 py-1 text-xs font-medium text-orange-600 hover:text-orange-700 hover:bg-orange-100 rounded-md transition-colors flex items-center space-x-1"
                    >
                      {tokenCopied ? (
                        <>
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                          </svg>
                          <span>Copy Config</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="bg-gray-900 rounded-md p-4 overflow-x-auto">
                    <pre className="text-xs text-gray-100 font-mono whitespace-pre">
                      {tokenConfig}
                    </pre>
                  </div>
                  <p className="text-xs text-orange-700">
                    Copy this configuration and merge it into your Cursor settings file at:{' '}
                    <code className="bg-orange-100 px-1 rounded font-mono">
                      {getCursorSettingsPath()}
                    </code>
                  </p>
                </div>
              )}
            </div>

            {/* Manual Setup Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or set up manually (OAuth flow)</span>
              </div>
            </div>
          </div>

          {/* Step 1: Authorize in Cursor */}
          <div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-sm font-semibold text-blue-600">1</span>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900 mb-1">
                  OAuth Authentication Flow
                </h3>
                <p className="text-sm text-gray-600 mb-2">
                  After clicking &quot;Connect to Cursor&quot;, Cursor will open a browser window for OAuth authentication:
                </p>
                <ol className="text-sm text-gray-600 list-decimal list-inside space-y-1 ml-2 mb-2">
                  <li>You&apos;ll be redirected to the ProjectFlow login page (if not already logged in)</li>
                  <li>After logging in, you&apos;ll authorize Cursor to access your projects</li>
                  <li>Cursor will receive OAuth tokens automatically</li>
                  <li>Tokens refresh automatically - no manual reconnection needed!</li>
                </ol>
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mt-2">
                  <p className="text-xs text-yellow-800">
                    <strong>Note:</strong> If the OAuth flow doesn&apos;t complete (Cursor receives authorization codes but doesn&apos;t exchange them for tokens), use the &quot;Generate Token & Config&quot; button above for a manual workaround.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Verify Connection */}
          <div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-sm font-semibold text-blue-600">2</span>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900 mb-1">Verify Connection</h3>
                <p className="text-sm text-gray-600 mb-2">
                  After OAuth authorization completes, Cursor will automatically use the MCP tools. You can test the connection below to verify everything is working.
                </p>
              </div>
            </div>
          </div>

          {/* Manual Configuration (Alternative) */}
          <details className="bg-gray-50 rounded-lg p-4">
            <summary className="text-sm font-semibold text-gray-900 cursor-pointer mb-3">
              Manual Configuration (Alternative)
            </summary>
            <div className="space-y-3">
              <p className="text-xs text-gray-600">
                If you prefer to configure manually, place the configuration in your Cursor settings file:
              </p>
              <div className="bg-gray-100 rounded-md p-2 font-mono text-xs text-gray-800 break-all">
                {getCursorSettingsPath()}
              </div>
              <p className="text-xs text-gray-600">
                Copy the configuration below and merge it into the existing <code className="bg-gray-200 px-1 rounded">mcpServers</code> object:
              </p>
              <div className="flex items-center justify-end">
                <button
                  onClick={handleCopy}
                  className="px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors flex items-center space-x-1"
                >
                  {copied ? (
                    <>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                      <span>Copy Config</span>
                    </>
                  )}
                </button>
              </div>
              <div className="bg-gray-900 rounded-md p-4 overflow-x-auto">
                <pre className="text-xs text-gray-100 font-mono whitespace-pre">
                  {getMCPConfig()}
                </pre>
              </div>
            </div>
          </details>

          {/* Step 3: Test Connection */}
          <div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-sm font-semibold text-blue-600">3</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-900">Test Connection</h3>
                  <button
                    onClick={handleTestConnection}
                    disabled={isTesting}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {isTesting ? (
                      <>
                        <svg
                          className="animate-spin h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        <span>Testing...</span>
                      </>
                    ) : (
                      <span>Test Connection</span>
                    )}
                  </button>
                </div>
                {testResult && (
                  <div
                    className={`rounded-md p-3 ${
                      testResult.success
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-red-50 border border-red-200'
                    }`}
                  >
                    <div className="flex items-start space-x-2">
                      {testResult.success ? (
                        <svg
                          className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      )}
                      <div className="flex-1">
                        <p
                          className={`text-sm font-medium ${
                            testResult.success ? 'text-green-800' : 'text-red-800'
                          }`}
                        >
                          {testResult.message}
                        </p>
                        {testResult.error && (
                          <p className="text-xs text-red-600 mt-1">{testResult.error}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Click the button above to verify your MCP connection is working correctly.
                </p>
              </div>
            </div>
          </div>

          {/* Security Note */}
          <div className="bg-green-50 border border-green-200 rounded-md p-3">
            <div className="flex items-start space-x-2">
              <svg
                className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <p className="text-xs font-medium text-green-800">OAuth Security Benefits</p>
                <p className="text-xs text-green-700 mt-1">
                  OAuth authentication provides enhanced security: tokens are managed securely by Cursor, 
                  automatically refresh before expiration, and can be revoked at any time. No tokens are 
                  stored in your configuration file.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

