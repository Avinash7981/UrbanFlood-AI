import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { DemoBadge } from '@/components/shared/demo-badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'stable';
  trendLabel?: string;
  badgeText?: string;
  className?: string;
  valueClassName?: string;
}

export function MetricCard({
  label,
  value,
  unit,
  icon,
  trend,
  trendLabel,
  badgeText,
  className,
  valueClassName,
}: MetricCardProps) {
  return (
    <Card className={cn('bg-card border-border', className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-xs font-medium text-muted-foreground truncate">{label}</p>
              {badgeText && <DemoBadge label={badgeText} />}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className={cn('text-2xl font-bold text-foreground tabular-nums', valueClassName)}>
                {value}
              </span>
              {unit && (
                <span className="text-sm text-muted-foreground">{unit}</span>
              )}
            </div>
            {trend && trendLabel && (
              <div className="flex items-center gap-1 mt-1.5">
                {trend === 'up' && <TrendingUp className="h-3 w-3 text-risk-critical" />}
                {trend === 'down' && <TrendingDown className="h-3 w-3 text-risk-low" />}
                {trend === 'stable' && <Minus className="h-3 w-3 text-muted-foreground" />}
                <span className={cn(
                  'text-[11px]',
                  trend === 'up' && 'text-risk-critical',
                  trend === 'down' && 'text-risk-low',
                  trend === 'stable' && 'text-muted-foreground'
                )}>
                  {trendLabel}
                </span>
              </div>
            )}
          </div>
          {icon && (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
