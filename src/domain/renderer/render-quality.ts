/**
 * RenderQuality Value Object
 *
 * Represents rendering quality settings for 3D visualization.
 * This is an immutable value object following DDD principles.
 *
 * @example
 * const quality = RenderQuality.high();
 * const custom = quality.withShadows(false);
 */

/**
 * Render quality options interface
 */
export interface RenderQualityOptions {
  readonly shadows: boolean;
  readonly ambientOcclusion: boolean;
  readonly antialiasing: boolean;
  readonly maxDrawDistance: number;
}

/**
 * Preset names type
 */
export type RenderQualityPresetName = 'low' | 'medium' | 'high' | 'ultra';

/**
 * Render quality presets
 */
export const RENDER_QUALITY_PRESETS: Record<RenderQualityPresetName, RenderQualityOptions> = {
  low: {
    shadows: false,
    ambientOcclusion: false,
    antialiasing: false,
    maxDrawDistance: 100,
  },
  medium: {
    shadows: false,
    ambientOcclusion: true,
    antialiasing: true,
    maxDrawDistance: 200,
  },
  high: {
    shadows: true,
    ambientOcclusion: true,
    antialiasing: true,
    maxDrawDistance: 400,
  },
  ultra: {
    shadows: true,
    ambientOcclusion: true,
    antialiasing: true,
    maxDrawDistance: 800,
  },
};

/**
 * Custom error for invalid render quality values
 */
export class InvalidRenderQualityError extends Error {
  public override readonly name = 'InvalidRenderQualityError';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, InvalidRenderQualityError.prototype);
  }
}

/**
 * Validates max draw distance
 */
function isValidMaxDrawDistance(distance: number): boolean {
  if (typeof distance !== 'number') {
    return false;
  }
  if (!Number.isFinite(distance)) {
    return false;
  }
  return distance > 0;
}

/**
 * Validates boolean value
 */
function isValidBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * RenderQuality Value Object
 *
 * Immutable value object representing rendering quality settings.
 * Uses private constructor pattern - instantiate via static factory methods.
 */
export class RenderQuality {
  private readonly _shadows: boolean;
  private readonly _ambientOcclusion: boolean;
  private readonly _antialiasing: boolean;
  private readonly _maxDrawDistance: number;

  /**
   * Private constructor - use static factory methods instead
   */
  private constructor(options: RenderQualityOptions) {
    this._shadows = options.shadows;
    this._ambientOcclusion = options.ambientOcclusion;
    this._antialiasing = options.antialiasing;
    this._maxDrawDistance = options.maxDrawDistance;

    Object.freeze(this);
  }

  /**
   * Creates a RenderQuality instance
   *
   * @param options - Quality options
   * @returns RenderQuality instance
   * @throws InvalidRenderQualityError if options are invalid
   */
  public static create(options: RenderQualityOptions): RenderQuality {
    if (!isValidBoolean(options.shadows)) {
      throw new InvalidRenderQualityError(
        `Invalid shadows value: "${options.shadows}". Must be a boolean.`
      );
    }
    if (!isValidBoolean(options.ambientOcclusion)) {
      throw new InvalidRenderQualityError(
        `Invalid ambientOcclusion value: "${options.ambientOcclusion}". Must be a boolean.`
      );
    }
    if (!isValidBoolean(options.antialiasing)) {
      throw new InvalidRenderQualityError(
        `Invalid antialiasing value: "${options.antialiasing}". Must be a boolean.`
      );
    }
    if (!isValidMaxDrawDistance(options.maxDrawDistance)) {
      throw new InvalidRenderQualityError(
        `Invalid maxDrawDistance value: "${options.maxDrawDistance}". Must be a positive number.`
      );
    }

    return new RenderQuality(options);
  }

  /**
   * Returns low quality preset
   */
  public static low(): RenderQuality {
    return new RenderQuality(RENDER_QUALITY_PRESETS.low);
  }

  /**
   * Returns medium quality preset
   */
  public static medium(): RenderQuality {
    return new RenderQuality(RENDER_QUALITY_PRESETS.medium);
  }

  /**
   * Returns high quality preset
   */
  public static high(): RenderQuality {
    return new RenderQuality(RENDER_QUALITY_PRESETS.high);
  }

  /**
   * Returns ultra quality preset
   */
  public static ultra(): RenderQuality {
    return new RenderQuality(RENDER_QUALITY_PRESETS.ultra);
  }

  /**
   * Creates RenderQuality from preset name
   *
   * @param presetName - Preset name
   * @returns RenderQuality instance
   * @throws InvalidRenderQualityError if preset name is invalid
   */
  public static fromPreset(presetName: RenderQualityPresetName): RenderQuality {
    const preset = RENDER_QUALITY_PRESETS[presetName];
    if (!preset) {
      throw new InvalidRenderQualityError(
        `Invalid preset name: "${presetName}". Valid presets are: low, medium, high, ultra.`
      );
    }
    return new RenderQuality(preset);
  }

  /**
   * Gets shadows setting
   */
  public get shadows(): boolean {
    return this._shadows;
  }

  /**
   * Gets ambient occlusion setting
   */
  public get ambientOcclusion(): boolean {
    return this._ambientOcclusion;
  }

  /**
   * Gets antialiasing setting
   */
  public get antialiasing(): boolean {
    return this._antialiasing;
  }

  /**
   * Gets max draw distance setting
   */
  public get maxDrawDistance(): number {
    return this._maxDrawDistance;
  }

  /**
   * Returns new RenderQuality with updated shadows setting
   *
   * @param shadows - New shadows value
   * @returns New RenderQuality instance
   */
  public withShadows(shadows: boolean): RenderQuality {
    return new RenderQuality({
      shadows,
      ambientOcclusion: this._ambientOcclusion,
      antialiasing: this._antialiasing,
      maxDrawDistance: this._maxDrawDistance,
    });
  }

  /**
   * Returns new RenderQuality with updated ambient occlusion setting
   *
   * @param ambientOcclusion - New ambient occlusion value
   * @returns New RenderQuality instance
   */
  public withAmbientOcclusion(ambientOcclusion: boolean): RenderQuality {
    return new RenderQuality({
      shadows: this._shadows,
      ambientOcclusion,
      antialiasing: this._antialiasing,
      maxDrawDistance: this._maxDrawDistance,
    });
  }

  /**
   * Returns new RenderQuality with updated antialiasing setting
   *
   * @param antialiasing - New antialiasing value
   * @returns New RenderQuality instance
   */
  public withAntialiasing(antialiasing: boolean): RenderQuality {
    return new RenderQuality({
      shadows: this._shadows,
      ambientOcclusion: this._ambientOcclusion,
      antialiasing,
      maxDrawDistance: this._maxDrawDistance,
    });
  }

  /**
   * Returns new RenderQuality with updated max draw distance
   *
   * @param maxDrawDistance - New max draw distance
   * @returns New RenderQuality instance
   * @throws InvalidRenderQualityError if distance is invalid
   */
  public withMaxDrawDistance(maxDrawDistance: number): RenderQuality {
    if (!isValidMaxDrawDistance(maxDrawDistance)) {
      throw new InvalidRenderQualityError(
        `Invalid maxDrawDistance value: "${maxDrawDistance}". Must be a positive number.`
      );
    }

    return new RenderQuality({
      shadows: this._shadows,
      ambientOcclusion: this._ambientOcclusion,
      antialiasing: this._antialiasing,
      maxDrawDistance,
    });
  }

  /**
   * Gets the preset name if this matches a preset, or "custom"
   *
   * @returns Preset name or "custom"
   */
  public getPresetName(): RenderQualityPresetName | 'custom' {
    for (const [name, preset] of Object.entries(RENDER_QUALITY_PRESETS)) {
      if (
        this._shadows === preset.shadows &&
        this._ambientOcclusion === preset.ambientOcclusion &&
        this._antialiasing === preset.antialiasing &&
        this._maxDrawDistance === preset.maxDrawDistance
      ) {
        return name as RenderQualityPresetName;
      }
    }
    return 'custom';
  }

  /**
   * Compares equality with another RenderQuality
   *
   * @param other - RenderQuality to compare with
   * @returns true if quality settings are equal
   */
  public equals(other: RenderQuality): boolean {
    return (
      this._shadows === other._shadows &&
      this._ambientOcclusion === other._ambientOcclusion &&
      this._antialiasing === other._antialiasing &&
      this._maxDrawDistance === other._maxDrawDistance
    );
  }

  /**
   * Converts to serializable object
   *
   * @returns Plain object representation
   */
  public toObject(): RenderQualityOptions {
    return {
      shadows: this._shadows,
      ambientOcclusion: this._ambientOcclusion,
      antialiasing: this._antialiasing,
      maxDrawDistance: this._maxDrawDistance,
    };
  }

  /**
   * Returns human-readable string representation
   *
   * @returns String description
   */
  public toString(): string {
    const presetName = this.getPresetName();
    return `RenderQuality(${presetName})`;
  }
}

// ========================================
// Standalone Helper Functions
// ========================================

/**
 * Creates a RenderQuality (alias for RenderQuality.create)
 */
export function createRenderQuality(options: RenderQualityOptions): RenderQuality {
  return RenderQuality.create(options);
}
