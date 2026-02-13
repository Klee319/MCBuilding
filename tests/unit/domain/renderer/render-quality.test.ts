/**
 * RenderQuality Value Object Tests
 *
 * TDD: RED phase - Write failing tests first
 *
 * RenderQuality represents rendering quality settings.
 */
import { describe, it, expect } from 'vitest';
import {
  RenderQuality,
  InvalidRenderQualityError,
  createRenderQuality,
  RENDER_QUALITY_PRESETS,
} from '../../../../src/domain/renderer/render-quality';

describe('RenderQuality Value Object', () => {
  // ========================================
  // Constants
  // ========================================
  describe('RENDER_QUALITY_PRESETS', () => {
    it('should contain low, medium, high, ultra presets', () => {
      expect(RENDER_QUALITY_PRESETS).toHaveProperty('low');
      expect(RENDER_QUALITY_PRESETS).toHaveProperty('medium');
      expect(RENDER_QUALITY_PRESETS).toHaveProperty('high');
      expect(RENDER_QUALITY_PRESETS).toHaveProperty('ultra');
    });
  });

  // ========================================
  // Static Factory Methods
  // ========================================
  describe('RenderQuality.create()', () => {
    it('should create RenderQuality with all options', () => {
      const quality = RenderQuality.create({
        shadows: true,
        ambientOcclusion: true,
        antialiasing: true,
        maxDrawDistance: 500,
      });

      expect(quality).toBeInstanceOf(RenderQuality);
      expect(quality.shadows).toBe(true);
      expect(quality.ambientOcclusion).toBe(true);
      expect(quality.antialiasing).toBe(true);
      expect(quality.maxDrawDistance).toBe(500);
    });

    it('should create RenderQuality with minimal options', () => {
      const quality = RenderQuality.create({
        shadows: false,
        ambientOcclusion: false,
        antialiasing: false,
        maxDrawDistance: 100,
      });

      expect(quality.shadows).toBe(false);
      expect(quality.ambientOcclusion).toBe(false);
      expect(quality.antialiasing).toBe(false);
      expect(quality.maxDrawDistance).toBe(100);
    });

    it('should throw InvalidRenderQualityError for negative maxDrawDistance', () => {
      expect(() =>
        RenderQuality.create({
          shadows: false,
          ambientOcclusion: false,
          antialiasing: false,
          maxDrawDistance: -100,
        })
      ).toThrow(InvalidRenderQualityError);
    });

    it('should throw InvalidRenderQualityError for zero maxDrawDistance', () => {
      expect(() =>
        RenderQuality.create({
          shadows: false,
          ambientOcclusion: false,
          antialiasing: false,
          maxDrawDistance: 0,
        })
      ).toThrow(InvalidRenderQualityError);
    });

    it('should throw InvalidRenderQualityError for NaN maxDrawDistance', () => {
      expect(() =>
        RenderQuality.create({
          shadows: false,
          ambientOcclusion: false,
          antialiasing: false,
          maxDrawDistance: NaN,
        })
      ).toThrow(InvalidRenderQualityError);
    });

    it('should throw InvalidRenderQualityError for non-boolean shadows', () => {
      expect(() =>
        RenderQuality.create({
          shadows: 'true' as unknown as boolean,
          ambientOcclusion: false,
          antialiasing: false,
          maxDrawDistance: 100,
        })
      ).toThrow(InvalidRenderQualityError);
    });
  });

  describe('RenderQuality.low()', () => {
    it('should return low quality preset', () => {
      const quality = RenderQuality.low();

      expect(quality.shadows).toBe(false);
      expect(quality.ambientOcclusion).toBe(false);
      expect(quality.antialiasing).toBe(false);
      expect(quality.maxDrawDistance).toBe(100);
    });
  });

  describe('RenderQuality.medium()', () => {
    it('should return medium quality preset', () => {
      const quality = RenderQuality.medium();

      expect(quality.shadows).toBe(false);
      expect(quality.ambientOcclusion).toBe(true);
      expect(quality.antialiasing).toBe(true);
      expect(quality.maxDrawDistance).toBe(200);
    });
  });

  describe('RenderQuality.high()', () => {
    it('should return high quality preset', () => {
      const quality = RenderQuality.high();

      expect(quality.shadows).toBe(true);
      expect(quality.ambientOcclusion).toBe(true);
      expect(quality.antialiasing).toBe(true);
      expect(quality.maxDrawDistance).toBe(400);
    });
  });

  describe('RenderQuality.ultra()', () => {
    it('should return ultra quality preset', () => {
      const quality = RenderQuality.ultra();

      expect(quality.shadows).toBe(true);
      expect(quality.ambientOcclusion).toBe(true);
      expect(quality.antialiasing).toBe(true);
      expect(quality.maxDrawDistance).toBe(800);
    });
  });

  describe('RenderQuality.fromPreset()', () => {
    it('should create RenderQuality from preset name', () => {
      const low = RenderQuality.fromPreset('low');
      const high = RenderQuality.fromPreset('high');

      expect(low.shadows).toBe(false);
      expect(high.shadows).toBe(true);
    });

    it('should throw for invalid preset name', () => {
      expect(() => RenderQuality.fromPreset('invalid' as 'low')).toThrow(InvalidRenderQualityError);
    });
  });

  // ========================================
  // Instance Getters
  // ========================================
  describe('shadows getter', () => {
    it('should return shadows setting', () => {
      const quality = RenderQuality.create({
        shadows: true,
        ambientOcclusion: false,
        antialiasing: false,
        maxDrawDistance: 100,
      });

      expect(quality.shadows).toBe(true);
    });
  });

  describe('ambientOcclusion getter', () => {
    it('should return ambientOcclusion setting', () => {
      const quality = RenderQuality.create({
        shadows: false,
        ambientOcclusion: true,
        antialiasing: false,
        maxDrawDistance: 100,
      });

      expect(quality.ambientOcclusion).toBe(true);
    });
  });

  describe('antialiasing getter', () => {
    it('should return antialiasing setting', () => {
      const quality = RenderQuality.create({
        shadows: false,
        ambientOcclusion: false,
        antialiasing: true,
        maxDrawDistance: 100,
      });

      expect(quality.antialiasing).toBe(true);
    });
  });

  describe('maxDrawDistance getter', () => {
    it('should return maxDrawDistance setting', () => {
      const quality = RenderQuality.create({
        shadows: false,
        ambientOcclusion: false,
        antialiasing: false,
        maxDrawDistance: 300,
      });

      expect(quality.maxDrawDistance).toBe(300);
    });
  });

  // ========================================
  // Instance Methods
  // ========================================
  describe('withShadows()', () => {
    it('should return new RenderQuality with updated shadows', () => {
      const original = RenderQuality.low();
      const updated = original.withShadows(true);

      expect(updated.shadows).toBe(true);
      expect(original.shadows).toBe(false);
    });
  });

  describe('withAmbientOcclusion()', () => {
    it('should return new RenderQuality with updated AO', () => {
      const original = RenderQuality.low();
      const updated = original.withAmbientOcclusion(true);

      expect(updated.ambientOcclusion).toBe(true);
      expect(original.ambientOcclusion).toBe(false);
    });
  });

  describe('withAntialiasing()', () => {
    it('should return new RenderQuality with updated antialiasing', () => {
      const original = RenderQuality.low();
      const updated = original.withAntialiasing(true);

      expect(updated.antialiasing).toBe(true);
      expect(original.antialiasing).toBe(false);
    });
  });

  describe('withMaxDrawDistance()', () => {
    it('should return new RenderQuality with updated distance', () => {
      const original = RenderQuality.low();
      const updated = original.withMaxDrawDistance(500);

      expect(updated.maxDrawDistance).toBe(500);
      expect(original.maxDrawDistance).toBe(100);
    });

    it('should throw for invalid distance', () => {
      const quality = RenderQuality.low();

      expect(() => quality.withMaxDrawDistance(0)).toThrow(InvalidRenderQualityError);
      expect(() => quality.withMaxDrawDistance(-100)).toThrow(InvalidRenderQualityError);
    });
  });

  describe('getPresetName()', () => {
    it('should return "low" for low preset', () => {
      const quality = RenderQuality.low();

      expect(quality.getPresetName()).toBe('low');
    });

    it('should return "medium" for medium preset', () => {
      const quality = RenderQuality.medium();

      expect(quality.getPresetName()).toBe('medium');
    });

    it('should return "high" for high preset', () => {
      const quality = RenderQuality.high();

      expect(quality.getPresetName()).toBe('high');
    });

    it('should return "ultra" for ultra preset', () => {
      const quality = RenderQuality.ultra();

      expect(quality.getPresetName()).toBe('ultra');
    });

    it('should return "custom" for non-preset configuration', () => {
      const quality = RenderQuality.create({
        shadows: true,
        ambientOcclusion: false,
        antialiasing: true,
        maxDrawDistance: 150,
      });

      expect(quality.getPresetName()).toBe('custom');
    });
  });

  describe('equals()', () => {
    it('should return true for identical quality settings', () => {
      const a = RenderQuality.high();
      const b = RenderQuality.high();

      expect(a.equals(b)).toBe(true);
    });

    it('should return false for different settings', () => {
      const a = RenderQuality.low();
      const b = RenderQuality.high();

      expect(a.equals(b)).toBe(false);
    });

    it('should return false for same everything but different maxDrawDistance', () => {
      const a = RenderQuality.create({
        shadows: true,
        ambientOcclusion: true,
        antialiasing: true,
        maxDrawDistance: 400,
      });
      const b = RenderQuality.create({
        shadows: true,
        ambientOcclusion: true,
        antialiasing: true,
        maxDrawDistance: 500,
      });

      expect(a.equals(b)).toBe(false);
    });
  });

  describe('toObject()', () => {
    it('should return serializable object', () => {
      const quality = RenderQuality.create({
        shadows: true,
        ambientOcclusion: true,
        antialiasing: false,
        maxDrawDistance: 300,
      });
      const obj = quality.toObject();

      expect(obj).toEqual({
        shadows: true,
        ambientOcclusion: true,
        antialiasing: false,
        maxDrawDistance: 300,
      });
    });
  });

  describe('toString()', () => {
    it('should return human-readable string for presets', () => {
      const quality = RenderQuality.high();

      expect(quality.toString()).toBe('RenderQuality(high)');
    });

    it('should return detailed string for custom settings', () => {
      const quality = RenderQuality.create({
        shadows: true,
        ambientOcclusion: false,
        antialiasing: true,
        maxDrawDistance: 150,
      });

      expect(quality.toString()).toBe('RenderQuality(custom)');
    });
  });

  // ========================================
  // Immutability
  // ========================================
  describe('Immutability', () => {
    it('should be frozen (Object.isFrozen)', () => {
      const quality = RenderQuality.high();

      expect(Object.isFrozen(quality)).toBe(true);
    });

    it('should not allow property modification', () => {
      const quality = RenderQuality.high();

      expect(() => {
        (quality as { _shadows: boolean })._shadows = false;
      }).toThrow();
    });
  });

  // ========================================
  // Standalone Functions
  // ========================================
  describe('createRenderQuality()', () => {
    it('should create RenderQuality (alias)', () => {
      const quality = createRenderQuality({
        shadows: true,
        ambientOcclusion: true,
        antialiasing: true,
        maxDrawDistance: 400,
      });

      expect(quality).toBeInstanceOf(RenderQuality);
    });
  });

  // ========================================
  // InvalidRenderQualityError
  // ========================================
  describe('InvalidRenderQualityError', () => {
    it('should be an instance of Error', () => {
      const error = new InvalidRenderQualityError('test');

      expect(error).toBeInstanceOf(Error);
    });

    it('should have correct name', () => {
      const error = new InvalidRenderQualityError('test');

      expect(error.name).toBe('InvalidRenderQualityError');
    });

    it('should preserve the message', () => {
      const error = new InvalidRenderQualityError('custom message');

      expect(error.message).toBe('custom message');
    });
  });
});
