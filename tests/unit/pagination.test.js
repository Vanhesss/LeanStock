const { parsePagination, buildPaginationMeta, decodeCursor } = require('../../src/utils/pagination');

describe('Pagination Utils', () => {
  describe('parsePagination', () => {
    test('should use defaults when no params provided', () => {
      const result = parsePagination({});
      expect(result.limit).toBe(20);
      expect(result.cursor).toBeUndefined();
    });

    test('should parse limit correctly', () => {
      const result = parsePagination({ limit: '50' });
      expect(result.limit).toBe(50);
    });

    test('should cap limit at 100', () => {
      const result = parsePagination({ limit: '500' });
      expect(result.limit).toBe(100);
    });

    test('should floor limit at 1', () => {
      const result = parsePagination({ limit: '0' });
      expect(result.limit).toBe(1);
    });
  });

  describe('buildPaginationMeta', () => {
    test('should return null cursor when fewer items than limit', () => {
      const items = [{ id: '1' }, { id: '2' }];
      const meta = buildPaginationMeta(items, 2, 20);
      expect(meta.cursor).toBeNull();
      expect(meta.total).toBe(2);
    });

    test('should return cursor when items equal limit', () => {
      const items = [{ id: '1' }, { id: '2' }];
      const meta = buildPaginationMeta(items, 10, 2);
      expect(meta.cursor).not.toBeNull();
    });
  });

  describe('decodeCursor', () => {
    test('should decode valid cursor', () => {
      const encoded = Buffer.from(JSON.stringify({ id: 'abc' })).toString('base64');
      const result = decodeCursor(encoded);
      expect(result).toEqual({ id: 'abc' });
    });

    test('should return null for invalid cursor', () => {
      const result = decodeCursor('not-valid-base64!!!');
      expect(result).toBeNull();
    });
  });
});
