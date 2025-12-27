'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface NewProjectWizardProps {
  onComplete: (projectId: string) => void;
  onCancel: () => void;
}

interface WizardData {
  // Step 1: Basics
  name?: string;
  description?: string;
  repo_url?: string;
  main_branch?: string;
  language?: string;
  framework?: string;
  
  // Step 2: Goals & DoD
  goals?: string;
  definition_of_done?: string;
  deliverables?: Array<{
    name: string;
    description: string;
    acceptance_criteria?: string[];
  }>;
  
  // Step 3: Risks & Constraints
  risk_areas?: string[];
  do_not_touch?: string[];
  preferences?: {
    coding_style?: string;
    testing_approach?: string;
    documentation?: string;
  };
  
  // Step 4: Gates
  gate_pack_id?: string;
  custom_gates?: Array<{
    type: string;
    config?: Record<string, any>;
  }>;
}

export function NewProjectWizard({ onComplete, onCancel }: NewProjectWizardProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [wizardData, setWizardData] = useState<WizardData>({
    main_branch: 'main',
    deliverables: [],
    risk_areas: [],
    do_not_touch: [],
    preferences: {},
    custom_gates: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalSteps = 5;

  // Initialize wizard session
  const startWizard = async () => {
    if (sessionId) return sessionId;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/wizard/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to start wizard');
      }

      const data = await response.json();
      setSessionId(data.sessionId);
      return data.sessionId;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start wizard');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const submitStep = async (stepId: number, payload: Record<string, any>) => {
    const sid = sessionId || await startWizard();
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/wizard/step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid, stepId, payload }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit step');
      }

      const data = await response.json();
      
      if (data.nextStep === 'complete') {
        // All steps done, now finish wizard
        return 'complete';
      }
      
      setCurrentStep(data.nextStep);
      return data.nextStep;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit step');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const finishWizard = async () => {
    if (!sessionId) {
      throw new Error('No wizard session');
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/wizard/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to finish wizard');
      }

      const data = await response.json();
      onComplete(data.project.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to finish wizard');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = async () => {
    let payload: Record<string, any> = {};
    
    switch (currentStep) {
      case 1:
        if (!wizardData.name || wizardData.name.trim().length < 3) {
          setError('Project name must be at least 3 characters');
          return;
        }
        payload = {
          name: wizardData.name,
          description: wizardData.description,
          repo_url: wizardData.repo_url,
          main_branch: wizardData.main_branch,
          language: wizardData.language,
          framework: wizardData.framework,
        };
        break;
        
      case 2:
        if (!wizardData.goals || !wizardData.definition_of_done) {
          setError('Goals and Definition of Done are required');
          return;
        }
        payload = {
          goals: wizardData.goals,
          definition_of_done: wizardData.definition_of_done,
          deliverables: wizardData.deliverables || [],
        };
        break;
        
      case 3:
        payload = {
          risk_areas: wizardData.risk_areas || [],
          do_not_touch: wizardData.do_not_touch || [],
          preferences: wizardData.preferences || {},
        };
        break;
        
      case 4:
        payload = {
          gate_pack_id: wizardData.gate_pack_id,
          custom_gates: wizardData.custom_gates || [],
        };
        break;
        
      case 5:
        // Review step, finish wizard
        await finishWizard();
        return;
    }
    
    try {
      const result = await submitStep(currentStep, payload);
      if (result === 'complete') {
        // Move to review step
        setCurrentStep(5);
      }
    } catch (err) {
      // Error already set in submitStep
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError(null);
    }
  };

  const updateData = (updates: Partial<WizardData>) => {
    setWizardData({ ...wizardData, ...updates });
    setError(null);
  };

  const addDeliverable = () => {
    updateData({
      deliverables: [...(wizardData.deliverables || []), { name: '', description: '' }],
    });
  };

  const updateDeliverable = (index: number, updates: Partial<{ name: string; description: string; acceptance_criteria: string[] }>) => {
    const deliverables = [...(wizardData.deliverables || [])];
    deliverables[index] = { ...deliverables[index], ...updates };
    updateData({ deliverables });
  };

  const removeDeliverable = (index: number) => {
    const deliverables = [...(wizardData.deliverables || [])];
    deliverables.splice(index, 1);
    updateData({ deliverables });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          New Project Wizard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Step {currentStep} of {totalSteps}: {getStepTitle(currentStep)}
        </p>
        
        {/* Progress bar */}
        <div className="mt-4 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-500 dark:bg-blue-400 h-2 rounded-full transition-all"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-red-50 dark:bg-red-900/20 p-4">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="mb-8">
        {currentStep === 1 && (
          <Step1Basics wizardData={wizardData} updateData={updateData} />
        )}
        {currentStep === 2 && (
          <Step2Goals
            wizardData={wizardData}
            updateData={updateData}
            addDeliverable={addDeliverable}
            updateDeliverable={updateDeliverable}
            removeDeliverable={removeDeliverable}
          />
        )}
        {currentStep === 3 && (
          <Step3Risks wizardData={wizardData} updateData={updateData} />
        )}
        {currentStep === 4 && (
          <Step4Gates wizardData={wizardData} updateData={updateData} />
        )}
        {currentStep === 5 && (
          <Step5Review wizardData={wizardData} />
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={currentStep === 1 ? onCancel : handleBack}
          disabled={isLoading}
          className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors disabled:opacity-50"
        >
          {currentStep === 1 ? 'Cancel' : 'Back'}
        </button>
        
        <button
          onClick={handleNext}
          disabled={isLoading}
          className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors disabled:opacity-50 flex items-center"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Processing...
            </>
          ) : currentStep === totalSteps ? (
            'Create Project'
          ) : (
            'Next'
          )}
        </button>
      </div>
    </div>
  );
}

function getStepTitle(step: number): string {
  switch (step) {
    case 1: return 'Project Basics';
    case 2: return 'Goals & Deliverables';
    case 3: return 'Risks & Constraints';
    case 4: return 'Quality Gates';
    case 5: return 'Review & Create';
    default: return '';
  }
}

// Step 1: Basics
function Step1Basics({ wizardData, updateData }: {
  wizardData: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Project Name *
        </label>
        <input
          type="text"
          value={wizardData.name || ''}
          onChange={(e) => updateData({ name: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="My Awesome Project"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Description
        </label>
        <textarea
          value={wizardData.description || ''}
          onChange={(e) => updateData({ description: e.target.value })}
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Brief description of your project"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Repository URL
        </label>
        <input
          type="text"
          value={wizardData.repo_url || ''}
          onChange={(e) => updateData({ repo_url: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="https://github.com/user/repo"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Main Branch
          </label>
          <input
            type="text"
            value={wizardData.main_branch || 'main'}
            onChange={(e) => updateData({ main_branch: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Language
          </label>
          <input
            type="text"
            value={wizardData.language || ''}
            onChange={(e) => updateData({ language: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="TypeScript"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Framework
        </label>
        <input
          type="text"
          value={wizardData.framework || ''}
          onChange={(e) => updateData({ framework: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Next.js, React, etc."
        />
      </div>
    </div>
  );
}

// Step 2: Goals & Deliverables
function Step2Goals({ wizardData, updateData, addDeliverable, updateDeliverable, removeDeliverable }: {
  wizardData: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
  addDeliverable: () => void;
  updateDeliverable: (index: number, updates: any) => void;
  removeDeliverable: (index: number) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Project Goals *
        </label>
        <textarea
          value={wizardData.goals || ''}
          onChange={(e) => updateData({ goals: e.target.value })}
          rows={4}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="What are you trying to achieve with this project?"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Definition of Done *
        </label>
        <textarea
          value={wizardData.definition_of_done || ''}
          onChange={(e) => updateData({ definition_of_done: e.target.value })}
          rows={4}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="How will you know when this project is finished?"
        />
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Deliverables (Optional)
          </label>
          <button
            onClick={addDeliverable}
            className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400"
          >
            + Add Deliverable
          </button>
        </div>
        
        {wizardData.deliverables && wizardData.deliverables.length > 0 && (
          <div className="space-y-4">
            {wizardData.deliverables.map((deliverable, index) => (
              <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-md">
                <div className="flex justify-between items-start mb-2">
                  <input
                    type="text"
                    value={deliverable.name}
                    onChange={(e) => updateDeliverable(index, { name: e.target.value })}
                    className="flex-1 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    placeholder="Deliverable name"
                  />
                  <button
                    onClick={() => removeDeliverable(index)}
                    className="ml-2 text-red-500 hover:text-red-600 text-sm"
                  >
                    Remove
                  </button>
                </div>
                <textarea
                  value={deliverable.description}
                  onChange={(e) => updateDeliverable(index, { description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  placeholder="Description"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Step 3: Risks & Constraints
function Step3Risks({ wizardData, updateData }: {
  wizardData: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
}) {
  const [riskInput, setRiskInput] = useState('');
  const [doNotTouchInput, setDoNotTouchInput] = useState('');

  const addRiskArea = () => {
    if (riskInput.trim()) {
      updateData({ risk_areas: [...(wizardData.risk_areas || []), riskInput.trim()] });
      setRiskInput('');
    }
  };

  const removeRiskArea = (index: number) => {
    const risk_areas = [...(wizardData.risk_areas || [])];
    risk_areas.splice(index, 1);
    updateData({ risk_areas });
  };

  const addDoNotTouch = () => {
    if (doNotTouchInput.trim()) {
      updateData({ do_not_touch: [...(wizardData.do_not_touch || []), doNotTouchInput.trim()] });
      setDoNotTouchInput('');
    }
  };

  const removeDoNotTouch = (index: number) => {
    const do_not_touch = [...(wizardData.do_not_touch || [])];
    do_not_touch.splice(index, 1);
    updateData({ do_not_touch });
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Risk Areas
        </label>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
          Areas of the codebase that are risky or fragile
        </p>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={riskInput}
            onChange={(e) => setRiskInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addRiskArea()}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="e.g., auth/, database migrations"
          />
          <button
            onClick={addRiskArea}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md"
          >
            Add
          </button>
        </div>
        {wizardData.risk_areas && wizardData.risk_areas.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {wizardData.risk_areas.map((area, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300"
              >
                {area}
                <button
                  onClick={() => removeRiskArea(index)}
                  className="ml-2 text-yellow-600 hover:text-yellow-800 dark:text-yellow-400"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Do Not Touch
        </label>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
          Files or directories that should not be modified
        </p>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={doNotTouchInput}
            onChange={(e) => setDoNotTouchInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addDoNotTouch()}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="e.g., config/production.yml"
          />
          <button
            onClick={addDoNotTouch}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md"
          >
            Add
          </button>
        </div>
        {wizardData.do_not_touch && wizardData.do_not_touch.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {wizardData.do_not_touch.map((item, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
              >
                {item}
                <button
                  onClick={() => removeDoNotTouch(index)}
                  className="ml-2 text-red-600 hover:text-red-800 dark:text-red-400"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Preferences (Optional)
        </label>
        
        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
            Coding Style
          </label>
          <input
            type="text"
            value={wizardData.preferences?.coding_style || ''}
            onChange={(e) =>
              updateData({
                preferences: { ...wizardData.preferences, coding_style: e.target.value },
              })
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            placeholder="e.g., Follow Airbnb style guide"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
            Testing Approach
          </label>
          <input
            type="text"
            value={wizardData.preferences?.testing_approach || ''}
            onChange={(e) =>
              updateData({
                preferences: { ...wizardData.preferences, testing_approach: e.target.value },
              })
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            placeholder="e.g., Write unit tests for all services"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
            Documentation
          </label>
          <input
            type="text"
            value={wizardData.preferences?.documentation || ''}
            onChange={(e) =>
              updateData({
                preferences: { ...wizardData.preferences, documentation: e.target.value },
              })
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            placeholder="e.g., JSDoc for all public APIs"
          />
        </div>
      </div>
    </div>
  );
}

// Step 4: Gates
function Step4Gates({ wizardData, updateData }: {
  wizardData: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
}) {
  const defaultGatePacks = [
    { id: 'standard', name: 'Standard', description: 'Has artifacts (min 1) + Acceptance criteria met' },
    { id: 'comprehensive', name: 'Comprehensive', description: 'Standard + Has tests + Has docs' },
    { id: 'minimal', name: 'Minimal', description: 'Just acceptance criteria' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
          Quality Gates Configuration
        </label>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Gates are quality checks that must pass before a task can be completed. Choose a preset or customize.
        </p>
        
        <div className="space-y-3">
          {defaultGatePacks.map((pack) => (
            <button
              key={pack.id}
              onClick={() => updateData({ gate_pack_id: pack.id, custom_gates: [] })}
              className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                wizardData.gate_pack_id === pack.id
                  ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="font-medium text-gray-900 dark:text-white">{pack.name}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{pack.description}</div>
            </button>
          ))}
          
          <button
            onClick={() => updateData({ gate_pack_id: undefined })}
            className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
              !wizardData.gate_pack_id
                ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div className="font-medium text-gray-900 dark:text-white">None (Skip gates for now)</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              You can configure gates later from project settings
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

// Step 5: Review
function Step5Review({ wizardData }: { wizardData: WizardData }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Review Your Project Configuration
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Please review the details below. Click "Create Project" to finalize.
        </p>
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <h4 className="font-medium text-gray-900 dark:text-white mb-2">Project Basics</h4>
          <dl className="space-y-1 text-sm">
            <div><span className="text-gray-600 dark:text-gray-400">Name:</span> <span className="text-gray-900 dark:text-white">{wizardData.name}</span></div>
            {wizardData.description && <div><span className="text-gray-600 dark:text-gray-400">Description:</span> <span className="text-gray-900 dark:text-white">{wizardData.description}</span></div>}
            {wizardData.repo_url && <div><span className="text-gray-600 dark:text-gray-400">Repository:</span> <span className="text-gray-900 dark:text-white">{wizardData.repo_url}</span></div>}
            {wizardData.language && <div><span className="text-gray-600 dark:text-gray-400">Language:</span> <span className="text-gray-900 dark:text-white">{wizardData.language}</span></div>}
          </dl>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <h4 className="font-medium text-gray-900 dark:text-white mb-2">Goals & Deliverables</h4>
          <dl className="space-y-2 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Goals:</span>
              <p className="text-gray-900 dark:text-white mt-1">{wizardData.goals}</p>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Definition of Done:</span>
              <p className="text-gray-900 dark:text-white mt-1">{wizardData.definition_of_done}</p>
            </div>
            {wizardData.deliverables && wizardData.deliverables.length > 0 && (
              <div>
                <span className="text-gray-600 dark:text-gray-400">Deliverables:</span>
                <ul className="list-disc list-inside text-gray-900 dark:text-white mt-1">
                  {wizardData.deliverables.map((d, i) => (
                    <li key={i}>{d.name}</li>
                  ))}
                </ul>
              </div>
            )}
          </dl>
        </div>

        {((wizardData.risk_areas && wizardData.risk_areas.length > 0) ||
          (wizardData.do_not_touch && wizardData.do_not_touch.length > 0)) && (
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Risks & Constraints</h4>
            {wizardData.risk_areas && wizardData.risk_areas.length > 0 && (
              <div className="mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Risk Areas:</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {wizardData.risk_areas.map((area, i) => (
                    <span key={i} className="text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded">
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {wizardData.do_not_touch && wizardData.do_not_touch.length > 0 && (
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Do Not Touch:</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {wizardData.do_not_touch.map((item, i) => (
                    <span key={i} className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <h4 className="font-medium text-gray-900 dark:text-white mb-2">Quality Gates</h4>
          <p className="text-sm text-gray-900 dark:text-white">
            {wizardData.gate_pack_id
              ? `${wizardData.gate_pack_id.charAt(0).toUpperCase() + wizardData.gate_pack_id.slice(1)} gate pack`
              : 'No gates configured'}
          </p>
        </div>
      </div>
    </div>
  );
}


