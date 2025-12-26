'use client';

import { useEffect, useState } from 'react';
import type { Event } from '@projectflow/core';

interface EventTimelineProps {
  projectId: string;
  limit?: number;
}

const eventTypeColors: Record<string, string> = {
  ProjectCreated: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200',
  TaskCreated: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
  TaskStarted: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200',
  TaskBlocked: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200',
  TaskCompleted: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200',
  TaskCancelled: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
  ArtifactProduced: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200',
  GateEvaluated: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200',
  CheckpointCreated: 'bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-200',
  DecisionRecorded: 'bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-200',
  ScopeAsserted: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-200',
};

const eventTypeLabels: Record<string, string> = {
  ProjectCreated: 'Project Created',
  TaskCreated: 'Task Created',
  TaskStarted: 'Task Started',
  TaskBlocked: 'Task Blocked',
  TaskCompleted: 'Task Completed',
  TaskCancelled: 'Task Cancelled',
  ArtifactProduced: 'Artifact Produced',
  GateEvaluated: 'Gate Evaluated',
  CheckpointCreated: 'Checkpoint Created',
  DecisionRecorded: 'Decision Recorded',
  ScopeAsserted: 'Scope Asserted',
};

export function EventTimeline({ projectId, limit = 50 }: EventTimelineProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEventType, setSelectedEventType] = useState<string | null>(null);

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
        setEvents(data.events || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load events');
        console.error('Error loading events:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadEvents();
  }, [projectId, limit]);

  const filteredEvents = selectedEventType
    ? events.filter((e) => e.event_type === selectedEventType)
    : events;

  const uniqueEventTypes = Array.from(new Set(events.map((e) => e.event_type)));

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const groupEventsByDate = (events: Event[]) => {
    const groups: Record<string, Event[]> = {};
    events.forEach((event) => {
      const date = new Date(event.created_at);
      const dateKey = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(event);
    });
    return groups;
  };

  const groupedEvents = groupEventsByDate(filteredEvents);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 h-16 rounded" />
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
      {/* Event Type Filter */}
      {uniqueEventTypes.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedEventType(null)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              selectedEventType === null
                ? 'bg-blue-500 dark:bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            All ({events.length})
          </button>
          {uniqueEventTypes.map((type) => {
            const count = events.filter((e) => e.event_type === type).length;
            return (
              <button
                key={type}
                onClick={() => setSelectedEventType(type)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedEventType === type
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {eventTypeLabels[type] || type} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-6">
        {Object.entries(groupedEvents).map(([dateKey, dateEvents]) => (
          <div key={dateKey}>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 sticky top-0 bg-gray-50 dark:bg-gray-800 py-1">
              {dateKey}
            </h3>
            <div className="space-y-3">
              {dateEvents.map((event) => (
                <div
                  key={event.id}
                  className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          eventTypeColors[event.event_type]?.split(' ')[0] || 'bg-gray-400'
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded ${
                            eventTypeColors[event.event_type] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                          }`}
                        >
                          {eventTypeLabels[event.event_type] || event.event_type}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {formatDate(event.created_at)}
                        </span>
                      </div>
                      {event.payload && Object.keys(event.payload).length > 0 && (
                        <details className="mt-2">
                          <summary className="text-sm text-gray-600 dark:text-gray-300 cursor-pointer hover:text-gray-900 dark:hover:text-white">
                            View details
                          </summary>
                          <pre className="mt-2 text-xs bg-gray-50 dark:bg-gray-900 p-2 rounded overflow-x-auto text-gray-800 dark:text-gray-200">
                            {JSON.stringify(event.payload, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

