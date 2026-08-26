/**
 * Unit Tests for Construction Dust Audit Catalog Utilities
 */

import { describe, it, expect } from 'vitest';
import { calculateSiteAuditScore, CPCB_DUST_AUDIT_CHECKLIST } from './constructionDustAuditCatalog';

describe('ConstructionDustAuditCatalog', () => {
  it('should calculate site compliance audit score percentage', () => {
    const score = calculateSiteAuditScore([true, true, true, true, false]);
    expect(score).toBe(80);
  });

  it('should contain 5 mandatory CPCB dust audit requirements', () => {
    expect(CPCB_DUST_AUDIT_CHECKLIST.length).toBe(5);
    expect(CPCB_DUST_AUDIT_CHECKLIST[0].requirement).toContain('Wind-breaking tin sheets');
  });
});
