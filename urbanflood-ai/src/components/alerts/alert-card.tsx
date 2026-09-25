import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FloodAlert, AlertSeverity } from '@/types';
import { AlertOctagon, AlertTriangle, Info, ShieldAlert, MapPin, Clock, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const SEVERITY_CONFIG: Record<AlertSeverity, {
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ElementType;
  label: string;
}> = {
  critical: { color: 'text-risk-critical', bgColor: 'bg-risk-critical/10', borderColor: 'border-risk-critical/30', icon: AlertOctagon, label: 'Critical' },
  warning: { color: 'text-risk-high', bgColor: 'bg-risk-high/10', borderColor: 'border-risk-high/30', icon: AlertTriangle, label: 'Warning' },
  watch: { color: 'text-risk-watch', bgColor: 'bg-risk-watch/10', borderColor: 'border-risk-watch/30', icon: ShieldAlert, label: 'Watch' },
  advisory: { color: 'text-chart-blue', bgColor: 'bg-chart-blue/10', borderColor: 'border-chart-blue/30', icon: Info, label: 'Advisory' },
};

interface AlertCardProps {
  alert: FloodAlert;
  compact?: boolean;
  onViewOnMap?: () => void;
  onAcknowledge?: () => void;
}

export function AlertCard({ alert, compact = false, onViewOnMap, onAcknowledge }: AlertCardProps) {
  const config = SEVERITY_CONFIG[alert.severity];
  const Icon = config.icon;
  const timeAgo = getTimeAgo(alert.timestamp);

  if (compact) {
    return (
      <div className={cn('flex items-start gap-2.5 rounded-md border p-2.5', config.borderColor, config.bgColor)}>
        <Icon className={cn('h-4 w-4 shrink-0 mt-0.5', config.color)} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground truncate">{alert.title}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{timeAgo}</p>
        </div>
        <Badge variant="outline" className={cn('text-[9px] shrink-0', config.borderColor, config.color)}>
          {config.label}
        </Badge>
      </div>
    );
  }

  return (
    <Card className={cn('border', config.borderColor)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', config.bgColor)}>
            <Icon className={cn('h-5 w-5', config.color)} />
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{alert.title}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>
              </div>
              <Badge variant="outline" className={cn('text-[10px] shrink-0', config.borderColor, config.color)}>
                {config.label}
              </Badge>
            </div>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
              {alert.zoneName && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {alert.zoneName}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {timeAgo}
              </span>
              {alert.escalationMinutes !== null && (
                <span>Escalation: ~{alert.escalationMinutes} min</span>
              )}
              {alert.status === 'acknowledged' && (
                <span className="flex items-center gap-1 text-risk-low">
                  <Check className="h-3 w-3" />
                  Acknowledged
                </span>
              )}
            </div>

            {/* Factors */}
            {alert.contributingFactors.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {alert.contributingFactors.map((factor, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px] font-normal">
                    {factor}
                  </Badge>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1">
              {onViewOnMap && alert.location && (
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onViewOnMap}>
                  <MapPin className="h-3 w-3 mr-1" />
                  View on Map
                </Button>
              )}
              {onAcknowledge && alert.status === 'active' && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onAcknowledge}>
                  <Check className="h-3 w-3 mr-1" />
                  Acknowledge
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getTimeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
