import { describe, it, expect } from '@jest/globals';
import { calculateFloodRisk } from '../risk-engine';

describe('Flood Risk Engine', () => {
  it('should return low risk for low rainfall and low saturation', () => {
    const result = calculateFloodRisk(0, 0, 0, 0, 0, 459);
    expect(result.score).toBe(0);
    expect(result.level).toBe('low');
    expect(result.explanation).toHaveLength(0);
  });

  it('should return higher risk for heavy rainfall and high saturation', () => {
    const result = calculateFloodRisk(50, 100, 1.0, 0, 0, 459);
    // rainfall(0.3) + rainProb(0.05) + saturation(0.2) = 0.55 => 55 score
    expect(result.score).toBeCloseTo(55, 5);
    expect(result.level).toBe('high');
    expect(result.explanation).toContain("High rainfall intensity");
    expect(result.explanation).toContain("High soil moisture");
  });

  it('should include drainage constraint correctly', () => {
    const result = calculateFloodRisk(50, 100, 1.0, 10, 0, 459);
    // 0.55 + 0.20 (drainage) = 0.75 => 75 score (Critical)
    expect(result.score).toBe(75);
    expect(result.level).toBe('critical');
    expect(result.explanation).toContain("Drainage constraint detected");
  });

  it('should gracefully handle missing DEM and water body data', () => {
    // Both terrain and waterBody missing
    // Weights: rain 30, prob 5, sat 20, drain 20 => total active = 75
    // Renormalized: rain(30/75)=0.4, prob(5/75)=0.066, sat(20/75)=0.266, drain(20/75)=0.266
    const result = calculateFloodRisk(50, 100, 1.0, 10, null, null);
    
    // Total score should be 100 because 0.4 + 0.066 + 0.266 + 0.266 = 1.0
    expect(result.score).toBe(100);
    expect(result.level).toBe('critical');
  });

  it('clamps score between 0 and 100', () => {
    const result = calculateFloodRisk(100, 100, 2.0, 20, 2, 400); // Exceed max normalized values
    expect(result.score).toBe(100);
    expect(result.level).toBe('critical');
  });
});
