'use client';

import React from 'react';
import { NowcastTimeStep, RiskLevel, RISK_COLORS } from '@/types';
import { cn } from '@/lib/utils';

interface RiskTimelineProps {
  timeline: NowcastTimeStep[];
  className?: string;
}

export function RiskTimeline({ timeline, className }: RiskTimelineProps) {
  return (
    <div className={cn('flex items-center gap-0', className)}>
      {timeline.map((step, i) => (
        <React.Fragment key={step.offsetMinutes}>
          {/* Node */}
          <div className="flex flex-col items-center gap-1">
            <div
              className="h-8 w-8 rounded-full border-2 flex items-center justify-center text-[10px] font-bold"
              style={{
                borderColor: RISK_COLORS[step.riskLevel],
                backgroundColor: `${RISK_COLORS[step.riskLevel]}20`,
                color: RISK_COLORS[step.riskLevel],
              }}
            >
              {step.riskLevel === 'critical' ? '!' : step.riskLevel === 'high' ? '▲' : step.riskLevel === 'moderate' ? '~' : '✓'}
            </div>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">{step.label}</span>
          </div>
          {/* Connector */}
          {i < timeline.length - 1 && (
            <div
              className="h-0.5 flex-1 min-w-6"
              style={{
                background: `linear-gradient(to right, ${RISK_COLORS[step.riskLevel]}, ${RISK_COLORS[timeline[i + 1].riskLevel]})`,
                opacity: 0.5,
              }}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
