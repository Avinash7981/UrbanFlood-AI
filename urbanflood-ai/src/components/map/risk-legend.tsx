import { cn } from '@/lib/utils';
import { ShieldAlert, AlertTriangle, AlertOctagon, CheckCircle } from 'lucide-react';
import { RiskLevel, RISK_LABELS } from '@/types';

const RISK_CONFIG: Record<RiskLevel, { color: string; bgColor: string; icon: React.ElementType }> = {
  low: { color: 'text-risk-low', bgColor: 'bg-risk-low/15', icon: CheckCircle },
  moderate: { color: 'text-risk-watch', bgColor: 'bg-risk-watch/10', icon: ShieldAlert },
  high: { color: 'text-risk-high', bgColor: 'bg-risk-high/15', icon: AlertTriangle },
  critical: { color: 'text-risk-critical', bgColor: 'bg-risk-critical/15', icon: AlertOctagon },
};

interface RiskBadgeProps {
  level: RiskLevel;
  showIcon?: boolean;
  showLabel?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function RiskBadge({ level, showIcon = true, showLabel = true, size = 'md', className }: RiskBadgeProps) {
  const config = RISK_CONFIG[level];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md font-semibold',
        config.bgColor,
        config.color,
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs',
        className
      )}
    >
      {showIcon && <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />}
      {showLabel && RISK_LABELS[level]}
    </span>
  );
}

export function RiskLegend({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      {(['low', 'moderate', 'high', 'critical'] as RiskLevel[]).map((level) => (
        <RiskBadge key={level} level={level} size="sm" />
      ))}
    </div>
  );
}
