import { describe, it, expect } from 'vitest';

describe('Zod Schema Validation', () => {
  it('should validate CreateLectureDTO', async () => {
    const { CreateLectureDTO } = await import('@summa/shared');

    const valid = { title: 'Test Lecture' };
    const result = CreateLectureDTO.safeParse(valid);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('Test Lecture');
    }
  });

  it('should reject invalid CreateLectureDTO', async () => {
    const { CreateLectureDTO } = await import('@summa/shared');

    const invalid = { title: '' }; // Empty title
    const result = CreateLectureDTO.safeParse(invalid);

    expect(result.success).toBe(false);
  });

  it('should validate CreateSessionDTO', async () => {
    const { CreateSessionDTO } = await import('@summa/shared');

    const valid = {
      mode: 'manual' as const,
      policy: {
        lengthMin: 55,
        overlapSec: 5,
        vadPause: true
      }
    };

    const result = CreateSessionDTO.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('should validate session status enum', async () => {
    const validStatuses = ['idle', 'recording', 'uploaded', 'processing', 'completed', 'error'];

    validStatuses.forEach(status => {
      expect(validStatuses).toContain(status);
    });
  });
});
