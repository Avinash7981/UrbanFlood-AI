import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DemoBadge } from '@/components/shared/demo-badge';
import { RiskBadge } from '@/components/map/risk-legend';
import { FloodZoneProperties } from '@/types';
import { X, Clock, Target, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RiskZonePopupProps {
  zone: FloodZoneProperties;
  onClose: () => void;
}

export function RiskZonePopup({ zone, onClose }: RiskZonePopupProps) {
  return (
    <Card className="bg-card border-border w-80">
      <CardHeader className="px-4 py-3 flex flex-row items-start justify-between space-y-0">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-semibold">{zone.name}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <RiskBadge level={zone.riskLevel} size="sm" />
            {zone.isDemo && <DemoBadge />}
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 space-y-3">
        {/* Key metrics */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-md bg-muted p-2 text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <Target className="h-3 w-3 text-muted-foreground" />
            </div>
            <div className="text-lg font-bold tabular-nums">{zone.probability}%</div>
            <div className="text-[10px] text-muted-foreground">Probability</div>
          </div>
          <div className="rounded-md bg-muted p-2 text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <Clock className="h-3 w-3 text-muted-foreground" />
            </div>
            <div className="text-lg font-bold tabular-nums">~{zone.estimatedOnsetMinutes}</div>
            <div className="text-[10px] text-muted-foreground">Onset (min)</div>
          </div>
          <div className="rounded-md bg-muted p-2 text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <Brain className="h-3 w-3 text-muted-foreground" />
            </div>
            <div className="text-lg font-bold tabular-nums">{zone.confidence}%</div>
            <div className="text-[10px] text-muted-foreground">Confidence</div>
          </div>
        </div>

        {/* Contributing factors */}
        <div>
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
            Contributing Factors
          </p>
          <div className="space-y-1.5">
            {zone.factors.map((factor, i) => (
              <div key={i} className="flex items-start gap-2 rounded-md bg-muted/50 p-2">
                <span className="text-sm leading-none mt-0.5">{factor.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-foreground">{factor.label}</div>
                  <div className="text-[10px] text-muted-foreground">{factor.description}</div>
                </div>
                <Badge
                  variant="outline"
                  className={`text-[9px] shrink-0 ${
                    factor.contribution === 'high'
                      ? 'border-risk-critical/30 text-risk-critical'
                      : factor.contribution === 'medium'
                        ? 'border-risk-high/30 text-risk-high'
                        : 'border-risk-watch/30 text-risk-watch'
                  }`}
                >
                  {factor.contribution}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
