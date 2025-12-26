'use client';

import { useEffect, useState } from 'react';

interface Gate {
  id: string;
  name: string;
  is_required: boolean;
  runner_mode: 'manual' | 'command';
  command: string | null;
}

interface GateRun {
  id: string;
  status: 'passing' | 'failing';
  created_at: string;
  stdout: string | null;
  stderr: string | null;
  exit_code: number | null;
}

interface GateStatusSummary {
  gate_id: string;
  gate_name: string;
  is_required: boolean;
  runner_mode: 'manual' | 'command';
  latest_run: GateRun | null;
}

interface GatePanelProps {
  projectId: string;
}

export function GatePanel({ projectId }: GatePanelProps) {
  const [gates, setGates] = useState<GateStatusSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runningGate, setRunningGate] = useState<string | null>(null);

  const loadGates = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ projectId });
      const response = await fetch(`/api/gates?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to load gates');
      
      const data = await response.json();
      setGates(data.gates || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load gates');
      console.error('Error loading gates:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGates();
  }, [projectId]);

  const handleRunGate = async (gateName: string) => {
    setRunningGate(gateName);
    try {
      const response = await fetch('/api/gates/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, gateName }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to run gate');
      }

      await loadGates(); // Reload to show new status
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run gate');
    } finally {
      setRunningGate(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 h-24 rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
        <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (gates.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <p className="text-gray-500 dark:text-gray-400">No gates configured for this project</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
          Gates verify that code quality checks pass before work is considered complete.
        </p>
      </div>
    );
  }

  // Count gates
  const requiredGates = gates.filter(g => g.is_required);
  const passingRequired = requiredGates.filter(g => g.latest_run?.status === 'passing').length;
  const allRequiredPassing = requiredGates.length > 0 && passingRequired === requiredGates.length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      {requiredGates.length > 0 && (
        <div className={`rounded-lg p-4 ${allRequiredPassing ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800'}`}>
          <p className={`text-sm font-medium ${allRequiredPassing ? 'text-green-800 dark:text-green-300' : 'text-orange-800 dark:text-orange-300'}`}>
            {allRequiredPassing ? '✓ All required gates passing' : `${passingRequired}/${requiredGates.length} required gates passing`}
          </p>
        </div>
      )}

      {/* Gates List */}
      {gates.map((gate) => (
        <div
          key={gate.gate_id}
          className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {gate.gate_name}
                </h3>
                {gate.is_required && (
                  <span className="text-xs px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 rounded">
                    Required
                  </span>
                )}
                <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded">
                  {gate.runner_mode === 'manual' ? '👤 Manual' : '⚙️ Automated'}
                </span>
              </div>
              {gate.latest_run && (
                <div className="flex items-center gap-2 text-sm">
                  <span className={`font-medium ${gate.latest_run.status === 'passing' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {gate.latest_run.status === 'passing' ? '✓ Passing' : '✗ Failing'}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    {new Date(gate.latest_run.created_at).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
            {gate.runner_mode === 'command' && (
              <button
                onClick={() => handleRunGate(gate.gate_name)}
                disabled={runningGate === gate.gate_name}
                className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {runningGate === gate.gate_name ? 'Running...' : 'Run'}
              </button>
            )}
          </div>
          {gate.latest_run?.stdout && (
            <details className="mt-2">
              <summary className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                Show output
              </summary>
              <pre className="mt-2 text-xs bg-gray-50 dark:bg-gray-900 p-2 rounded overflow-x-auto">
                {gate.latest_run.stdout}
              </pre>
            </details>
          )}
          {gate.latest_run?.stderr && (
            <details className="mt-2">
              <summary className="text-sm text-red-600 dark:text-red-400 cursor-pointer">
                Show errors
              </summary>
              <pre className="mt-2 text-xs bg-red-50 dark:bg-red-900/20 p-2 rounded overflow-x-auto text-red-700 dark:text-red-300">
                {gate.latest_run.stderr}
              </pre>
            </details>
          )}
        </div>
      ))}
    </div>
  );
}

