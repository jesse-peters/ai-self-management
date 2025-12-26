'use client';

import { useState } from 'react';

interface OutcomeFormProps {
  projectId: string;
  subjectType: 'work_item' | 'agent_task' | 'gate_run';
  subjectId: string;
  onSuccess?: () => void;
}

export function OutcomeForm({ projectId, subjectType, subjectId, onSuccess }: OutcomeFormProps) {
  const [result, setResult] = useState<'worked' | 'didnt_work' | 'mixed' | 'unknown'>('worked');
  const [summary, setSummary] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!summary.trim()) {
      setError('Summary is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/outcomes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          subjectType,
          subjectId,
          result,
          summary: summary.trim(),
          recommendation: recommendation.trim() || undefined,
          createdBy: 'human',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create outcome');
      }

      // Reset form
      setSummary('');
      setRecommendation('');
      setResult('worked');
      
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create outcome');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        Record Learning
      </h3>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Result
        </label>
        <select
          value={result}
          onChange={(e) => setResult(e.target.value as any)}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="worked">✅ Worked</option>
          <option value="didnt_work">❌ Didn't Work</option>
          <option value="mixed">⚖️ Mixed Results</option>
          <option value="unknown">❓ Unknown</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Summary *
        </label>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="What happened? What did you learn?"
          rows={3}
          required
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Recommendation (Optional)
        </label>
        <textarea
          value={recommendation}
          onChange={(e) => setRecommendation(e.target.value)}
          placeholder="What would you do differently next time?"
          rows={2}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting || !summary.trim()}
        className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting ? 'Recording...' : 'Record Learning'}
      </button>
    </form>
  );
}

