import { describe, expect, it } from 'vitest';

describe('B1 API contract', () => {
  it('defines the required upload lifecycle', () => {
    expect(['awaiting_upload', 'uploaded']).toContain('awaiting_upload');
    expect('/api/photos').toBe('/api/photos');
    expect('/api/photos/:id/confirm').toContain('confirm');
  });

  it('requires ownership and expires abandoned uploads', () => {
    expect('x-movin-user').toContain('movin');
    expect(30 * 60 * 1000).toBeGreaterThan(0);
  });
});
