/**
 * Unit tests for reservation expiry job logic.
 */

describe('Reservation Expiry Eligibility', () => {
  const isExpired = (expiresAt, status) => {
    if (status !== 'ACTIVE') return false;
    return new Date(expiresAt) < new Date();
  };

  test('should flag active reservation past expiry', () => {
    const pastDate = new Date(Date.now() - 60000).toISOString();
    expect(isExpired(pastDate, 'ACTIVE')).toBe(true);
  });

  test('should not flag active reservation before expiry', () => {
    const futureDate = new Date(Date.now() + 60000).toISOString();
    expect(isExpired(futureDate, 'ACTIVE')).toBe(false);
  });

  test('should not flag already cancelled reservation', () => {
    const pastDate = new Date(Date.now() - 60000).toISOString();
    expect(isExpired(pastDate, 'CANCELLED')).toBe(false);
  });

  test('should not flag converted reservation', () => {
    const pastDate = new Date(Date.now() - 60000).toISOString();
    expect(isExpired(pastDate, 'CONVERTED')).toBe(false);
  });

  test('should not flag already expired reservation', () => {
    const pastDate = new Date(Date.now() - 60000).toISOString();
    expect(isExpired(pastDate, 'EXPIRED')).toBe(false);
  });
});
