import { describe, it, expect } from '@jest/globals';
import { generateAlertsFromNowcast } from '../alert-engine';
import { NowcastZone, RiskLevel, NowcastTimeStep } from '@/types';

function createMockTimeline(levels: RiskLevel[], scores: number[]) {
  return levels.map((level, i) => ({
    offsetMinutes: i * 15,
    label: `+${i * 15}m`,
    riskScore: scores[i],
    riskLevel: level,
    explanation: ['Mock factor']
  }));
}

function createMockZone(timeline: NowcastTimeStep[]): NowcastZone {
  return {
    zoneId: 'z1',
    zoneName: 'Test Zone',
    currentRisk: timeline[0]?.riskLevel || 'low',
    estimatedOnsetMinutes: 30,
    severity: 'low',
    timeline,
    factors: [],
    isDemo: false
  };
}

describe('Alert Engine', () => {
  it('1. should return no alert for low risk timeline', () => {
    const zone = createMockZone(createMockTimeline(['low', 'low'], [10, 10]));
    const alerts = generateAlertsFromNowcast([zone]);
    expect(alerts.length).toBe(0);
  });

  it('2. should return advisory for moderate risk', () => {
    const zone = createMockZone(createMockTimeline(['moderate', 'moderate'], [35, 35]));
    const alerts = generateAlertsFromNowcast([zone]);
    expect(alerts.length).toBe(1);
    expect(alerts[0].severity).toBe('advisory');
  });

  it('3. should return warning for current high risk', () => {
    const zone = createMockZone(createMockTimeline(['high', 'high'], [70, 70]));
    const alerts = generateAlertsFromNowcast([zone]);
    expect(alerts.length).toBe(1);
    expect(alerts[0].severity).toBe('warning');
  });

  it('4. should return critical for current critical risk', () => {
    const zone = createMockZone(createMockTimeline(['critical', 'critical'], [90, 90]));
    const alerts = generateAlertsFromNowcast([zone]);
    expect(alerts.length).toBe(1);
    expect(alerts[0].severity).toBe('critical');
    expect(alerts[0].title).toBe('Critical Flood Risk Predicted');
  });

  it('5. should detect escalation from moderate to high', () => {
    const zone = createMockZone(createMockTimeline(['moderate', 'moderate', 'high'], [35, 45, 70]));
    const alerts = generateAlertsFromNowcast([zone]);
    expect(alerts.length).toBe(1);
    expect(alerts[0].severity).toBe('watch');
    expect(alerts[0].escalationMinutes).toBe(30);
  });

  it('6. should detect critical escalation from high to critical', () => {
    const zone = createMockZone(createMockTimeline(['high', 'high', 'critical'], [70, 70, 89]));
    const alerts = generateAlertsFromNowcast([zone]);
    expect(alerts.length).toBe(1);
    expect(alerts[0].severity).toBe('critical');
    expect(alerts[0].escalationMinutes).toBe(30);
    expect(alerts[0].title).toBe('Critical Flood Risk Escalation Predicted');
  });

  it('7. should deduplicate moderate -> high -> critical to a single critical alert', () => {
    const zone = createMockZone(createMockTimeline(['moderate', 'high', 'critical'], [40, 70, 90]));
    const alerts = generateAlertsFromNowcast([zone]);
    expect(alerts.length).toBe(1);
    expect(alerts[0].severity).toBe('critical');
    expect(alerts[0].escalationMinutes).toBe(30); 
  });

  it('8. should return one critical alert if zone remains at critical', () => {
    const zone = createMockZone(createMockTimeline(['critical', 'critical', 'critical'], [90, 92, 95]));
    const alerts = generateAlertsFromNowcast([zone]);
    expect(alerts.length).toBe(1);
    expect(alerts[0].severity).toBe('critical');
    expect(alerts[0].escalationMinutes).toBeNull(); // No escalation, it's just critical
  });

  it('9. should prioritize earlier escalation', () => {
    const zone1 = createMockZone(createMockTimeline(['high', 'critical'], [70, 90])); // esc at 15
    zone1.zoneId = 'z1';
    
    const zone2 = createMockZone(createMockTimeline(['high', 'high', 'high', 'critical'], [70, 70, 70, 90])); // esc at 45
    zone2.zoneId = 'z2';

    const alerts = generateAlertsFromNowcast([zone1, zone2]);
    expect(alerts.length).toBe(2);
    expect(alerts[0].zoneId).toBe('z1');
    expect(alerts[1].zoneId).toBe('z2');
  });

  it('10. should include actual explanation factors', () => {
    const timeline = createMockTimeline(['moderate', 'high'], [40, 70]);
    timeline[1].explanation = ['Heavy rainfall', 'High soil moisture'];
    const zone = createMockZone(timeline);
    
    const alerts = generateAlertsFromNowcast([zone]);
    expect(alerts[0].contributingFactors).toEqual(['Heavy rainfall', 'High soil moisture']);
  });

  it('11. should handle missing or empty timeline gracefully', () => {
    const zone: NowcastZone = { ...createMockZone([]), timeline: [] };
    const alerts = generateAlertsFromNowcast([zone]);
    expect(alerts.length).toBe(0);
  });

  it('12. should sort alerts by severity order', () => {
    const zoneMod = createMockZone(createMockTimeline(['moderate', 'moderate'], [30, 30])); zoneMod.zoneId = 'zmod';
    const zoneCrit = createMockZone(createMockTimeline(['critical', 'critical'], [90, 90])); zoneCrit.zoneId = 'zcrit';
    const zoneHigh = createMockZone(createMockTimeline(['high', 'high'], [70, 70])); zoneHigh.zoneId = 'zhigh';

    const alerts = generateAlertsFromNowcast([zoneMod, zoneCrit, zoneHigh]);
    expect(alerts.length).toBe(3);
    expect(alerts[0].severity).toBe('critical');
    expect(alerts[1].severity).toBe('warning');
    expect(alerts[2].severity).toBe('advisory');
  });

  it('13. should return correct escalation minutes', () => {
    const timeline = createMockTimeline(['moderate', 'moderate', 'moderate', 'high'], [30, 30, 30, 75]);
    const zone = createMockZone(timeline);
    const alerts = generateAlertsFromNowcast([zone]);
    expect(alerts[0].escalationMinutes).toBe(45); // index 3 * 15 = 45
  });

});
