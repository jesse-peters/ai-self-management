'use client';

import { useEffect, useState } from 'react';
import type { Event } from '@projectflow/core';
import { TimelineEvent } from './TimelineEvent';

interface WorkItemTimelineProps {
  projectId: string;
  workItemId: string;
  taskIds?: string[]; // Task IDs that belong to this work item
  limit?: number;
}

// Event type categories for filtering
const eventCategories: Record<string, string[]> = {
  'All': [],
  'Task Changes': [
    'AgentTaskCreated',
    'AgentTaskStarted',
    'AgentTaskBlocked',
    'AgentTaskCompleted',
    'TaskCreated',
    'TaskStarted',
    'TaskBlocked',
    'TaskCompleted',
    'TaskCancelled',
  ],
  'Gates': [
    'GateExecuted',
    'GateEvaluated',
    'GateConfigured',
  ],
  'Evidence': [
    'EvidenceAdded',
  ],
  'Decisions': [
    'DecisionRecorded',
    'OutcomeRecorded',
  ],
  'Other': [
    'WorkItemCreated',
    'WorkItemStatusChanged',
    'ScopeAsserted',
    'ArtifactProduced',
    'CheckpointCreated',
    'ConstraintCreated',
    'ConstraintDeleted',
  ],
};

export function WorkItemTimeline({ 
  projectId, 
  workItemId, 
  taskIds = [], 
  limit = 100 
}: WorkItemTimelineProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  useEffect(() => {
    if (!projectId) return;

    const loadEvents = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ projectId });
        if (limit) {
          params.append('limit', limit.toString());
        }
        
        const response = await fetch(`/api/events?${params.toString()}`);
        if (!response.ok) {
          throw new Error('Failed to load events');
        }
        const data = await response.json();
        let allEvents = (data.events || []) as Event[];
        
        // Filter events by work item - either directly related or through tasks
        const filteredEvents = allEvents.filter((event) => {
          // If event has task_id, check if it belongs to this work item
          if (event.task_id && taskIds.length > 0) {
            return taskIds.includes(event.task_id);
          }
          // Check if event is directly related to work item
          if (event.payload && typeof event.payload === 'object' && !Array.isArray(event.payload)) {
            const p = event.payload as Record<string, any>;
            // WorkItemCreated or WorkItemStatusChanged events
            if (event.event_type === 'WorkItemCreated' || event.event_type === 'WorkItemStatusChanged') {
              return p.work_item_id === workItemId;
            }
          }
          return false;
        });
        
        setEvents(filteredEvents);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load events');
        console.error('Error loading events:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadEvents();
    
    // Poll for new events every 30 seconds
    const interval = setInterval(() => {
      loadEvents();
    }, 30000);

    return () => clearInterval(interval);
  }, [projectId, workItemId, taskIds, limit]);

  // Filter events by category
  const filteredEvents = selectedCategory === 'All'
    ? events
    : events.filter((e) => {
        const categoryTypes = eventCategories[selectedCategory] || [];
        return categoryTypes.includes(e.event_type);
      });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 h-20 rounded" />
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

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400 text-lg">No events yet</p>
        <p className="text-gray-400 dark:text-gray-500 text-sm">Events will appear here as work progresses</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter:</span>
        {Object.keys(eventCategories).map((category) => {
          const count = category === 'All'
            ? events.length
            : events.filter((e) => {
                const categoryTypes = eventCategories[category] || [];
                return categoryTypes.includes(e.event_type);
              }).length;
          
          return (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-blue-500 dark:bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {category} ({count})
            </button>
          );
        })}
      </div>

      {/* Timeline */}
      <div className="relative">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">No events match the selected filter</p>
          </div>
        ) : (
          <div className="space-y-0">
            {filteredEvents.map((event) => (
              <TimelineEvent key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

