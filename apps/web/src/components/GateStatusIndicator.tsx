'use client';

import { STATUS_COLORS, GATE_STATUS_ICONS, getGateStatusClass } from '@/lib/colors';

export type GateStatus = 'passing' | 'failing' | 'not_run';

interface GateStatusIndicatorProps {
  status: GateStatus;
  gateName?: string;
  size?: 'sm' | 'md' | 'lg';
  inline?: boolean;
  onClick?: () => void;
  showLabel?: boolean;
  className?: string;
}

/**
 * GateStatusIndicator component - displays gate status with icon
 * ⚡ for passing, ❌ for failing, ⚪ for not run
 * Can be displayed inline or as a badge
 */
export function GateStatusIndicator({
  status,
  gateName,
  size = 'md',
  inline = false,
  onClick,
  showLabel = false,
  className = '',
}: GateStatusIndicatorProps) {
  const iconSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-lg',
  };

  const badgeSizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  const icon = GATE_STATUS_ICONS[status];
  const statusLabel = status === 'passing' ? 'Passing' : status === 'failing' ? 'Failing' : 'Not Run';
  const badgeClass = getGateStatusClass(status);

  if (inline) {
    return (
      <span
        className={`inline-flex items-center gap-1 ${onClick ? 'cursor-pointer' : ''} ${className}`}
        onClick={onClick}
        title={`Gate: ${gateName || 'Unknown'} - ${statusLabel}`}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
      >
        <span className={iconSizeClasses[size]}>{icon}</span>
        {showLabel && <span className="font-medium text-xs text-gray-700 dark:text-gray-300">{gateName}</span>}
      </span>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-2 rounded ${badgeSizeClasses[size]} ${badgeClass} ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      title={`Gate: ${gateName || 'Unknown'} - ${statusLabel}`}
    >
      <span className={iconSizeClasses[size]}>{icon}</span>
      <span className="font-medium">{statusLabel}</span>
    </div>
  );
}

/**
 * GateStatusRow component - displays multiple gate statuses in a row
 */
interface GateStatusRowProps {
  gates: Array<{
    name: string;
    status: GateStatus;
  }>;
  size?: 'sm' | 'md' | 'lg';
  inlineIcons?: boolean;
  className?: string;
}

export function GateStatusRow({ gates, size = 'md', inlineIcons = true, className = '' }: GateStatusRowProps) {
  if (gates.length === 0) {
    return <span className="text-xs text-gray-500 dark:text-gray-400">No gates configured</span>;
  }

  return (
    <div className={`inline-flex items-center gap-2 flex-wrap ${className}`}>
      {gates.map((gate) => (
        <GateStatusIndicator
          key={gate.name}
          status={gate.status}
          gateName={gate.name}
          size={size}
          inline={inlineIcons}
          showLabel={true}
        />
      ))}
    </div>
  );
}

/**
 * GateStatusCompact component - displays multiple gate statuses as a compact bar
 * Shows multiple gates side by side with minimal space
 */
interface GateStatusCompactProps {
  gates: Array<{
    name: string;
    status: GateStatus;
  }>;
  maxDisplay?: number;
  onClick?: (gateName: string) => void;
  className?: string;
}

export function GateStatusCompact({ gates, maxDisplay = 5, onClick, className = '' }: GateStatusCompactProps) {
  const displayGates = gates.slice(0, maxDisplay);
  const remaining = gates.length - displayGates.length;

  if (gates.length === 0) {
    return null;
  }

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      {displayGates.map((gate) => (
        <GateStatusIndicator
          key={gate.name}
          status={gate.status}
          gateName={gate.name}
          size="sm"
          inline
          onClick={() => onClick?.(gate.name)}
        />
      ))}
      {remaining > 0 && (
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium ml-1">
          +{remaining}
        </span>
      )}
    </div>
  );
}

