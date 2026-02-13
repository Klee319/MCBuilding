/**
 * Structure Schemas Unit Tests
 *
 * TDD tests for structure-related validation schemas.
 */

import { describe, it, expect } from 'vitest';
import {
  uploadStructureSchema,
  downloadStructureQuerySchema,
  structureIdParamSchema,
  getRenderDataQuerySchema,
} from '../../../../src/interface/validators/structure-schemas';

// ========================================
// uploadStructureSchema Tests
// ========================================
describe('uploadStructureSchema', () => {
  describe('valid input parsing', () => {
    it('should accept java edition with version 1.12', () => {
      const input = {
        originalEdition: 'java',
        originalVersion: '1.12',
      };

      const result = uploadStructureSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.originalEdition).toBe('java');
        expect(result.data.originalVersion).toBe('1.12');
      }
    });

    it('should accept bedrock edition with version 1.19', () => {
      const input = {
        originalEdition: 'bedrock',
        originalVersion: '1.19',
      };

      const result = uploadStructureSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.originalEdition).toBe('bedrock');
        expect(result.data.originalVersion).toBe('1.19');
      }
    });

    it('should accept version with patch number', () => {
      const input = {
        originalEdition: 'java',
        originalVersion: '1.20.4',
      };

      const result = uploadStructureSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.originalVersion).toBe('1.20.4');
      }
    });

    it('should accept version 1.99', () => {
      const input = {
        originalEdition: 'java',
        originalVersion: '1.99',
      };

      const result = uploadStructureSchema.safeParse(input);

      expect(result.success).toBe(true);
    });
  });

  describe('invalid input rejection', () => {
    it('should reject invalid edition', () => {
      const input = {
        originalEdition: 'invalid',
        originalVersion: '1.19',
      };

      const result = uploadStructureSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('java または bedrock');
      }
    });

    it('should reject version below 1.12', () => {
      const input = {
        originalEdition: 'java',
        originalVersion: '1.11',
      };

      const result = uploadStructureSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('1.12以上');
      }
    });

    it('should reject version 1.9', () => {
      const input = {
        originalEdition: 'java',
        originalVersion: '1.9',
      };

      const result = uploadStructureSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject version 1.10', () => {
      const input = {
        originalEdition: 'java',
        originalVersion: '1.10',
      };

      const result = uploadStructureSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject version 1.11', () => {
      const input = {
        originalEdition: 'java',
        originalVersion: '1.11',
      };

      const result = uploadStructureSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject version starting with 2', () => {
      const input = {
        originalEdition: 'java',
        originalVersion: '2.0',
      };

      const result = uploadStructureSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject invalid version format', () => {
      const input = {
        originalEdition: 'java',
        originalVersion: 'invalid',
      };

      const result = uploadStructureSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject version without minor number', () => {
      const input = {
        originalEdition: 'java',
        originalVersion: '1.',
      };

      const result = uploadStructureSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject missing edition', () => {
      const input = {
        originalVersion: '1.19',
      };

      const result = uploadStructureSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject missing version', () => {
      const input = {
        originalEdition: 'java',
      };

      const result = uploadStructureSchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should accept minimum valid version 1.12', () => {
      const input = {
        originalEdition: 'java',
        originalVersion: '1.12',
      };

      const result = uploadStructureSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should accept version 1.13 (just above minimum)', () => {
      const input = {
        originalEdition: 'java',
        originalVersion: '1.13',
      };

      const result = uploadStructureSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should accept version 1.19 with patch', () => {
      const input = {
        originalEdition: 'bedrock',
        originalVersion: '1.19.0',
      };

      const result = uploadStructureSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should accept high minor version number', () => {
      const input = {
        originalEdition: 'java',
        originalVersion: '1.50',
      };

      const result = uploadStructureSchema.safeParse(input);

      expect(result.success).toBe(true);
    });
  });
});

// ========================================
// downloadStructureQuerySchema Tests
// ========================================
describe('downloadStructureQuerySchema', () => {
  describe('valid input parsing', () => {
    it('should accept java edition with valid version', () => {
      const input = {
        edition: 'java',
        version: '1.20',
      };

      const result = downloadStructureQuerySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.edition).toBe('java');
        expect(result.data.version).toBe('1.20');
      }
    });

    it('should accept bedrock edition with valid version', () => {
      const input = {
        edition: 'bedrock',
        version: '1.19.4',
      };

      const result = downloadStructureQuerySchema.safeParse(input);

      expect(result.success).toBe(true);
    });
  });

  describe('invalid input rejection', () => {
    it('should reject invalid edition', () => {
      const input = {
        edition: 'pocket',
        version: '1.19',
      };

      const result = downloadStructureQuerySchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('java または bedrock');
      }
    });

    it('should reject version below 1.12', () => {
      const input = {
        edition: 'java',
        version: '1.8',
      };

      const result = downloadStructureQuerySchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('1.12以上');
      }
    });

    it('should reject missing edition', () => {
      const input = {
        version: '1.19',
      };

      const result = downloadStructureQuerySchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject missing version', () => {
      const input = {
        edition: 'java',
      };

      const result = downloadStructureQuerySchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });
});

// ========================================
// structureIdParamSchema Tests
// ========================================
describe('structureIdParamSchema', () => {
  describe('valid input parsing', () => {
    it('should accept valid structure ID', () => {
      const input = {
        id: 'struct-abc-123',
      };

      const result = structureIdParamSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('struct-abc-123');
      }
    });

    it('should accept UUID format', () => {
      const input = {
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      };

      const result = structureIdParamSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should accept numeric string ID', () => {
      const input = {
        id: '12345',
      };

      const result = structureIdParamSchema.safeParse(input);

      expect(result.success).toBe(true);
    });
  });

  describe('invalid input rejection', () => {
    it('should reject empty id', () => {
      const input = {
        id: '',
      };

      const result = structureIdParamSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Structure ID is required');
      }
    });

    it('should reject missing id', () => {
      const input = {};

      const result = structureIdParamSchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should accept single character ID', () => {
      const input = {
        id: 'a',
      };

      const result = structureIdParamSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should accept ID with special characters', () => {
      const input = {
        id: 'struct_123-abc.xyz',
      };

      const result = structureIdParamSchema.safeParse(input);

      expect(result.success).toBe(true);
    });
  });
});

// ========================================
// getRenderDataQuerySchema Tests
// ========================================
describe('getRenderDataQuerySchema', () => {
  describe('valid input parsing', () => {
    it('should accept empty query (all optional)', () => {
      const input = {};

      const result = getRenderDataQuerySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.lodLevel).toBeUndefined();
      }
    });

    it('should accept lodLevel full', () => {
      const input = {
        lodLevel: 'full',
      };

      const result = getRenderDataQuerySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.lodLevel).toBe('full');
      }
    });

    it('should accept lodLevel high', () => {
      const input = {
        lodLevel: 'high',
      };

      const result = getRenderDataQuerySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.lodLevel).toBe('high');
      }
    });

    it('should accept lodLevel medium', () => {
      const input = {
        lodLevel: 'medium',
      };

      const result = getRenderDataQuerySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.lodLevel).toBe('medium');
      }
    });

    it('should accept lodLevel low', () => {
      const input = {
        lodLevel: 'low',
      };

      const result = getRenderDataQuerySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.lodLevel).toBe('low');
      }
    });

    it('should accept lodLevel preview', () => {
      const input = {
        lodLevel: 'preview',
      };

      const result = getRenderDataQuerySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.lodLevel).toBe('preview');
      }
    });
  });

  describe('invalid input rejection', () => {
    it('should reject invalid lodLevel value', () => {
      const input = {
        lodLevel: 'ultra',
      };

      const result = getRenderDataQuerySchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject numeric lodLevel', () => {
      const input = {
        lodLevel: '1',
      };

      const result = getRenderDataQuerySchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject empty string lodLevel', () => {
      const input = {
        lodLevel: '',
      };

      const result = getRenderDataQuerySchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });
});
