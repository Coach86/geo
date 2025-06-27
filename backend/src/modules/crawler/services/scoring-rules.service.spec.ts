import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ScoringRulesService } from './scoring-rules.service';
import { DEFAULT_SCORING_RULES } from '../config/default-scoring-rules';

describe('ScoringRulesService', () => {
  let service: ScoringRulesService;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScoringRulesService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ScoringRulesService>(ScoringRulesService);
    configService = module.get(ConfigService);
  });

  describe('getRules', () => {
    it('should return default rules when no custom rules are configured', () => {
      configService.get.mockReturnValue(undefined);

      const rules = service.getRules();

      expect(rules).toEqual(DEFAULT_SCORING_RULES);
      expect(configService.get).toHaveBeenCalledWith('SCORING_RULES_PATH');
    });

    it('should merge custom rules with default rules', () => {
      const customRules = {
        dimensions: {
          authority: {
            thresholds: [
              { min: 0, max: 50, score: 50, description: 'Custom low' },
              { min: 51, max: 100, score: 100, description: 'Custom high' },
            ],
          },
        },
        weights: {
          authority: 2.0,
        },
      };

      configService.get.mockReturnValue(JSON.stringify(customRules));

      const rules = service.getRules();

      // Custom authority thresholds should override default
      expect(rules.dimensions.authority.thresholds).toEqual(customRules.dimensions.authority.thresholds);
      
      // Other dimensions should remain default
      expect(rules.dimensions.freshness).toEqual(DEFAULT_SCORING_RULES.dimensions.freshness);
      
      // Custom weight should override default
      expect(rules.weights.authority).toBe(2.0);
      
      // Other weights should remain default
      expect(rules.weights.freshness).toBe(DEFAULT_SCORING_RULES.weights.freshness);
    });

    it('should handle invalid JSON gracefully', () => {
      configService.get.mockReturnValue('invalid json');

      const rules = service.getRules();

      expect(rules).toEqual(DEFAULT_SCORING_RULES);
    });

    it('should validate threshold ranges', () => {
      const invalidRules = {
        dimensions: {
          authority: {
            thresholds: [
              { min: 0, max: 40, score: 40, description: 'Low' },
              { min: 60, max: 100, score: 100, description: 'High' }, // Gap between 40-60
            ],
          },
        },
      };

      configService.get.mockReturnValue(JSON.stringify(invalidRules));

      const rules = service.getRules();

      // Should fall back to default due to invalid thresholds
      expect(rules.dimensions.authority.thresholds).toEqual(DEFAULT_SCORING_RULES.dimensions.authority.thresholds);
    });
  });

  describe('updateRules', () => {
    it('should update rules and emit event', () => {
      const newRules = {
        dimensions: {
          freshness: {
            criteria: {
              maxDaysForVeryFresh: 14, // Changed from default 30
            },
          },
        },
      };

      service.updateRules(newRules);

      const rules = service.getRules();
      expect(rules.dimensions.freshness.criteria.maxDaysForVeryFresh).toBe(14);
    });

    it('should validate rules before updating', () => {
      const invalidRules = {
        dimensions: {
          invalidDimension: {}, // Invalid dimension name
        },
      };

      expect(() => service.updateRules(invalidRules as any)).toThrow();
    });
  });

  describe('getDimensionWeight', () => {
    it('should return weight for valid dimension', () => {
      configService.get.mockReturnValue(undefined);

      expect(service.getDimensionWeight('freshness')).toBe(2.5);
      expect(service.getDimensionWeight('authority')).toBe(1.0);
      expect(service.getDimensionWeight('structure')).toBe(1.5);
    });

    it('should return default weight for invalid dimension', () => {
      expect(service.getDimensionWeight('invalid' as any)).toBe(1.0);
    });
  });

  describe('getDimensionThresholds', () => {
    it('should return thresholds for valid dimension', () => {
      configService.get.mockReturnValue(undefined);

      const thresholds = service.getDimensionThresholds('authority');

      expect(thresholds).toEqual(DEFAULT_SCORING_RULES.dimensions.authority.thresholds);
      expect(thresholds).toHaveLength(5);
    });

    it('should return empty array for invalid dimension', () => {
      const thresholds = service.getDimensionThresholds('invalid' as any);

      expect(thresholds).toEqual([]);
    });
  });

  describe('getDimensionCriteria', () => {
    it('should return criteria for valid dimension', () => {
      configService.get.mockReturnValue(undefined);

      const criteria = service.getDimensionCriteria('freshness');

      expect(criteria).toEqual(DEFAULT_SCORING_RULES.dimensions.freshness.criteria);
      expect(criteria.maxDaysForVeryFresh).toBe(30);
    });

    it('should return empty object for invalid dimension', () => {
      const criteria = service.getDimensionCriteria('invalid' as any);

      expect(criteria).toEqual({});
    });
  });

  describe('calculateScore', () => {
    it('should calculate score based on thresholds', () => {
      configService.get.mockReturnValue(undefined);

      // Test authority dimension
      expect(service.calculateScore('authority', 10)).toBe(20);  // 0-20 range
      expect(service.calculateScore('authority', 30)).toBe(40);  // 21-40 range
      expect(service.calculateScore('authority', 50)).toBe(60);  // 41-60 range
      expect(service.calculateScore('authority', 70)).toBe(80);  // 61-80 range
      expect(service.calculateScore('authority', 90)).toBe(100); // 81-100 range
    });

    it('should handle edge cases', () => {
      configService.get.mockReturnValue(undefined);

      expect(service.calculateScore('authority', 0)).toBe(20);   // Minimum
      expect(service.calculateScore('authority', 100)).toBe(100); // Maximum
      expect(service.calculateScore('authority', -10)).toBe(20);  // Below minimum
      expect(service.calculateScore('authority', 150)).toBe(100); // Above maximum
    });

    it('should return 0 for invalid dimension', () => {
      expect(service.calculateScore('invalid' as any, 50)).toBe(0);
    });
  });

  describe('exportRules', () => {
    it('should export current rules as JSON string', () => {
      configService.get.mockReturnValue(undefined);

      const exported = service.exportRules();
      const parsed = JSON.parse(exported);

      expect(parsed).toEqual(DEFAULT_SCORING_RULES);
    });

    it('should format JSON with proper indentation', () => {
      const exported = service.exportRules();

      expect(exported).toContain('\n');
      expect(exported).toContain('  '); // Check for indentation
    });
  });

  describe('validateRules', () => {
    it('should validate correct rules structure', () => {
      const validRules = {
        dimensions: {
          authority: {
            thresholds: [
              { min: 0, max: 100, score: 100, description: 'Valid' },
            ],
            criteria: {},
          },
        },
        weights: {
          authority: 1.0,
        },
      };

      expect(() => service['validateRules'](validRules)).not.toThrow();
    });

    it('should throw for missing required fields', () => {
      const invalidRules = {
        dimensions: {
          authority: {
            // Missing thresholds
            criteria: {},
          },
        },
      };

      expect(() => service['validateRules'](invalidRules as any)).toThrow();
    });

    it('should throw for invalid threshold structure', () => {
      const invalidRules = {
        dimensions: {
          authority: {
            thresholds: [
              { min: 0, max: 50 }, // Missing score and description
            ],
          },
        },
      };

      expect(() => service['validateRules'](invalidRules as any)).toThrow();
    });
  });
});