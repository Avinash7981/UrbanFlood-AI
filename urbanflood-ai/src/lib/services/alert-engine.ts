import { NowcastZone, FloodAlert, RiskLevel, AlertSeverity } from '@/types';

export interface AlertConfig {
  rapidEscalationScoreDelta: number;
  rapidEscalationWindowMinutes: number;
}

const DEFAULT_CONFIG: AlertConfig = {
  rapidEscalationScoreDelta: 20,
  rapidEscalationWindowMinutes: 60,
};

const RISK_LEVEL_ORDER: Record<RiskLevel, number> = {
  low: 0,
  moderate: 1, 
  high: 2,
  critical: 3,
};

function getSeverity(currentLevel: RiskLevel, predictedLevel: RiskLevel): AlertSeverity {
  const current = RISK_LEVEL_ORDER[currentLevel];
  const predicted = RISK_LEVEL_ORDER[predictedLevel];

  // Critical escalation or current critical
  if (predicted === 3) return 'critical';
  
  // High current -> warning
  if (current === 2 && predicted <= 2) return 'warning';

  // Escalating to high -> watch
  if (current < 2 && predicted === 2) return 'watch';

  // Moderate current or predicted
  if (current === 1 || predicted === 1) return 'advisory';

  return 'advisory';
}

function getTitle(severity: AlertSeverity, isEscalation: boolean, isRapid: boolean): string {
  if (isRapid && severity === 'critical') return 'Rapid Critical Flood Escalation Predicted';
  if (isRapid && severity === 'watch') return 'Rapid Flood Risk Escalation Predicted';
  
  if (severity === 'critical') return isEscalation ? 'Critical Flood Risk Escalation Predicted' : 'Critical Flood Risk Predicted';
  if (severity === 'warning') return 'High Flood Risk Predicted';
  if (severity === 'watch') return 'Flood Risk Escalation Predicted';
  return 'Elevated Flood Risk Predicted'; // advisory
}

function getMessage(zoneName: string, severity: AlertSeverity, currentLevel: RiskLevel, predictedLevel: RiskLevel, escalationMinutes: number | null): string {
  const currentStr = currentLevel.charAt(0).toUpperCase() + currentLevel.slice(1);
  const predictedStr = predictedLevel.charAt(0).toUpperCase() + predictedLevel.slice(1);

  if (escalationMinutes !== null && currentLevel !== predictedLevel) {
    return `Zone ${zoneName} is modelled to escalate from ${currentStr} to ${predictedStr} risk within approximately ${escalationMinutes} minutes.`;
  }
  
  if (severity === 'critical') {
    return `Zone ${zoneName} is modelled to remain at Critical flood risk. Immediate response assessment is recommended.`;
  }
  
  if (severity === 'warning') {
    return `Zone ${zoneName} is modelled to remain at High flood risk. Response teams should prepare.`;
  }

  return `Flood risk in Zone ${zoneName} is elevated (${currentStr}) and should be monitored.`;
}

export function generateAlertsFromNowcast(zones: NowcastZone[], config: AlertConfig = DEFAULT_CONFIG): FloodAlert[] {
  const alerts: FloodAlert[] = [];

  for (const zone of zones) {
    if (!zone.timeline || zone.timeline.length === 0) continue;

    const currentStep = zone.timeline.find(t => t.offsetMinutes === 0) || zone.timeline[0];
    const currentLevel = currentStep.riskLevel;
    const currentScore = currentStep.riskScore || 0;

    let bestEscalationStep = currentStep;
    let isEscalation = false;
    let isRapid = false;
    
    // Find the maximum meaningful escalation
    for (const t of zone.timeline) {
      if (t.offsetMinutes === 0) continue;
      
      const tScore = t.riskScore || 0;
      const tLevel = t.riskLevel;
      
      const scoreDiff = tScore - currentScore;

      const isRapidCondition = scoreDiff >= config.rapidEscalationScoreDelta && t.offsetMinutes <= config.rapidEscalationWindowMinutes;

      // Update best escalation if it's a higher level, or same level but earlier time
      if (RISK_LEVEL_ORDER[tLevel] > RISK_LEVEL_ORDER[bestEscalationStep.riskLevel]) {
        bestEscalationStep = t;
        isEscalation = true;
        isRapid = isRapidCondition;
      } else if (RISK_LEVEL_ORDER[tLevel] === RISK_LEVEL_ORDER[bestEscalationStep.riskLevel] && isEscalation) {
         // Keep the earlier one
         if (t.offsetMinutes < bestEscalationStep.offsetMinutes) {
             bestEscalationStep = t;
             isRapid = isRapidCondition;
         }
      } else if (isRapidCondition && !isEscalation) {
        // Rapid score escalation without category change
        if (tScore > (bestEscalationStep.riskScore || 0)) {
           bestEscalationStep = t;
           isRapid = true;
        }
      }
    }

    // Determine if we need an alert
    // Low -> no alert (unless rapid escalation pushing it high, handled above)
    if (RISK_LEVEL_ORDER[bestEscalationStep.riskLevel] === 0) {
      continue;
    }

    const predictedLevel = bestEscalationStep.riskLevel;
    const predictedScore = bestEscalationStep.riskScore || 0;
    const escalationMinutes = isEscalation || isRapid ? bestEscalationStep.offsetMinutes : null;

    const severity = getSeverity(currentLevel, predictedLevel);
    const title = getTitle(severity, isEscalation, isRapid);
    const message = getMessage(zone.zoneName, severity, currentLevel, predictedLevel, escalationMinutes);

    // format factors
    const rawFactors = bestEscalationStep.explanation || [];

    const alert: FloodAlert = {
      id: `alert-${zone.zoneId}-${Date.now()}`,
      zoneId: zone.zoneId,
      zoneName: zone.zoneName,
      severity,
      riskLevel: predictedLevel,
      currentScore,
      predictedScore,
      currentLevel,
      predictedLevel,
      escalationMinutes,
      title,
      message,
      contributingFactors: rawFactors,
      createdAt: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      status: 'active',
      isDemo: zone.isDemo
    };

    alerts.push(alert);
  }

  // Sort alerts by priority
  // 1. Critical, 2. Warning, 3. Watch, 4. Advisory
  const SEVERITY_WEIGHT: Record<AlertSeverity, number> = {
    critical: 4,
    warning: 3,
    watch: 2,
    advisory: 1,
  };

  alerts.sort((a, b) => {
    const weightA = SEVERITY_WEIGHT[a.severity];
    const weightB = SEVERITY_WEIGHT[b.severity];

    if (weightA !== weightB) {
      return weightB - weightA;
    }

    // Earlier escalation first
    const escA = a.escalationMinutes ?? 999;
    const escB = b.escalationMinutes ?? 999;
    return escA - escB;
  });

  return alerts;
}
