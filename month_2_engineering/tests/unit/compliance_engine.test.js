/**
 * compliance_engine.test.js
 * Unit test suite for Week 4 EU AI Act Article 50 Compliance Engine (FR-03)
 * and Web Component UI Overlay (FR-04).
 */

import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.AITransparency = globalThis.AITransparency || {};
await import('../../src/modules/compliance_engine.js');
await import('../../src/ui/drawer_component.js');
await import('../../src/ui/badge_component.js');

const { ComplianceEngine, BadgeComponent, DrawerComponent } = globalThis.AITransparency;

test('ComplianceEngine: EU AI Act Article 50 Legal-Technical Matrix (FR-03)', async (t) => {
  await t.test('Case 1 (Verified): Valid C2PA + Platform Label -> All Articles COMPLIANT & VERIFIED pill', () => {
    const imageRes = { c2paStatus: 'VALID', platformLabel: true, claimGenerator: 'Adobe Firefly' };
    const textRes = { status: 'NO_TEXT', tokenCount: 0, zScore: null, isWatermarked: false };

    const res = ComplianceEngine.evaluateCompliance(imageRes, textRes, true);

    assert.equal(res.overallState, 'VERIFIED');
    assert.equal(res.articles.article50_2.status, 'COMPLIANT');
    assert.equal(res.articles.article50_4.status, 'COMPLIANT');
    assert.equal(res.articles.article50_5.status, 'COMPLIANT');
  });

  await t.test('Case 2 (Verified Text): SynthID z > 3.0 + Platform Label -> All Articles COMPLIANT & VERIFIED pill', () => {
    const imageRes = null;
    const textRes = { status: 'WATERMARK_DETECTED', tokenCount: 68, zScore: 4.15, pValue: 0.000016, isWatermarked: true };

    const res = ComplianceEngine.evaluateCompliance(imageRes, textRes, true);

    assert.equal(res.overallState, 'VERIFIED');
    assert.equal(res.articles.article50_2.status, 'COMPLIANT');
    assert.equal(res.articles.article50_4.status, 'COMPLIANT');
    assert.equal(res.articles.article50_5.status, 'COMPLIANT');
  });

  await t.test('Case 3 (Platform Ingestion Trap): C2PA Stripped + Platform Label -> Art. 50(2) NON_COMPLIANT, 50(4) COMPLIANT, PLATFORM_TAGGED pill', () => {
    const imageRes = { c2paStatus: 'STRIPPED', platformLabel: true };
    const textRes = { status: 'INSUFFICIENT_LENGTH', tokenCount: 14, zScore: null, isWatermarked: false };

    const res = ComplianceEngine.evaluateCompliance(imageRes, textRes, true);

    assert.equal(res.overallState, 'PLATFORM_TAGGED');
    assert.equal(res.articles.article50_2.status, 'NON_COMPLIANT');
    assert.equal(res.articles.article50_4.status, 'COMPLIANT');
    assert.equal(res.articles.article50_5.status, 'COMPLIANT');
  });

  await t.test('Case 4 (Undisclosed AI Text): SynthID z > 3.0 + NO Platform Label -> Art. 50(2) COMPLIANT, 50(4) NON_COMPLIANT, UNDISCLOSED_AI pill', () => {
    const imageRes = null;
    const textRes = { status: 'WATERMARK_DETECTED', tokenCount: 74, zScore: 4.42, pValue: 0.0000049, isWatermarked: true };

    const res = ComplianceEngine.evaluateCompliance(imageRes, textRes, false);

    assert.equal(res.overallState, 'UNDISCLOSED_AI');
    assert.equal(res.articles.article50_2.status, 'COMPLIANT');
    assert.equal(res.articles.article50_4.status, 'NON_COMPLIANT');
    assert.equal(res.articles.article50_5.status, 'COMPLIANT');
  });

  await t.test('Case 5 (Undisclosed C2PA Image): Valid C2PA + NO Platform Label -> Art. 50(4) NON_COMPLIANT, UNDISCLOSED_AI pill', () => {
    const imageRes = { c2paStatus: 'VALID', platformLabel: false };
    const textRes = { status: 'NO_TEXT', tokenCount: 0, zScore: null, isWatermarked: false };

    const res = ComplianceEngine.evaluateCompliance(imageRes, textRes, false);

    assert.equal(res.overallState, 'UNDISCLOSED_AI');
    assert.equal(res.articles.article50_2.status, 'COMPLIANT');
    assert.equal(res.articles.article50_4.status, 'NON_COMPLIANT');
    assert.equal(res.articles.article50_5.status, 'COMPLIANT');
  });

  await t.test('Case 6 (No Signal / Micro-span): No label, z <= 3.0 or T < 50 -> Art. 50(2) & 50(4) UNKNOWN, 50(5) COMPLIANT, NO_SIGNAL pill', () => {
    const imageRes = { c2paStatus: 'STRIPPED', platformLabel: false };
    const textRes = { status: 'INSUFFICIENT_LENGTH', tokenCount: 12, zScore: null, isWatermarked: false };

    const res = ComplianceEngine.evaluateCompliance(imageRes, textRes, false);

    assert.equal(res.overallState, 'NO_SIGNAL');
    assert.equal(res.articles.article50_2.status, 'UNKNOWN');
    assert.equal(res.articles.article50_4.status, 'UNKNOWN');
    assert.equal(res.articles.article50_5.status, 'COMPLIANT');
  });
});

test('Web Components: <ai-transparency-badge> & <ai-audit-drawer> Structure (FR-04)', async (t) => {
  await t.test('defines all 4 required visual pill themes plus SCANNING state', () => {
    assert.ok(BadgeComponent.PILL_THEMES.VERIFIED);
    assert.ok(BadgeComponent.PILL_THEMES.PLATFORM_TAGGED);
    assert.ok(BadgeComponent.PILL_THEMES.UNDISCLOSED_AI);
    assert.ok(BadgeComponent.PILL_THEMES.NO_SIGNAL);
    assert.ok(BadgeComponent.PILL_THEMES.SCANNING);
  });

  await t.test('AiAuditDrawer renders reversed hierarchy with plain English verdicts at top and technical diagnostics collapsible at bottom', () => {
    const fakeShadow = {
      innerHTML: '',
      querySelector: () => null
    };

    const drawer = new DrawerComponent();
    drawer._shadow = fakeShadow;
    drawer._isOpen = true;
    drawer.complianceData = ComplianceEngine.evaluateCompliance(
      { c2paStatus: 'STRIPPED', platformLabel: true },
      { status: 'WATERMARK_DETECTED', tokenCount: 65, entropy: 6.9, conditionalEntropy: 2.5, zScore: 3.85, pValue: 0.000059, isWatermarked: true },
      true
    );

    assert.ok(fakeShadow.innerHTML.includes('65 est. tokens'));
    assert.ok(fakeShadow.innerHTML.includes('z = 3.850'));
    assert.ok(fakeShadow.innerHTML.includes('Art. 50(2) · AI Creator Marking'));
    assert.ok(fakeShadow.innerHTML.includes('Art. 50(4) · Publisher Disclosure'));
    assert.ok(fakeShadow.innerHTML.includes('Art. 50(5) · Clear User Visibility'));
    assert.ok(fakeShadow.innerHTML.includes('COMPLIANT'));
    assert.ok(fakeShadow.innerHTML.includes('technical-collapsible'));

    // Hierarchy test: Legal Compliance Verdicts MUST appear BEFORE Technical Diagnostics
    const legalIndex = fakeShadow.innerHTML.indexOf('Legal Compliance Verdicts');
    const techIndex = fakeShadow.innerHTML.indexOf('Technical Diagnostics · For AI Engineers');
    assert.ok(legalIndex !== -1, 'Legal Compliance Verdicts section must be present');
    assert.ok(techIndex !== -1, 'Technical Diagnostics section must be present');
    assert.ok(legalIndex < techIndex, 'Legal Compliance Verdicts must appear at TOP, above Technical Diagnostics');
  });

  await t.test('AiTransparencyBadge resolves simplified, jargon-free pill labels without raw stats', () => {
    const badge = new BadgeComponent();

    // 1. Undisclosed AI: returns clean label without raw z-score
    badge.complianceData = ComplianceEngine.evaluateCompliance(
      null,
      { status: 'WATERMARK_DETECTED', tokenCount: 75, zScore: 4.8, pValue: 0.000001, isWatermarked: true },
      false
    );
    assert.equal(badge.resolvePillLabel('UNDISCLOSED_AI'), '🔴 Undisclosed AI');

    // 2. Verified AI (C2PA): returns clean verified label
    badge.complianceData = ComplianceEngine.evaluateCompliance(
      { c2paStatus: 'VALID', platformLabel: true },
      null,
      true
    );
    assert.equal(badge.resolvePillLabel('VERIFIED'), '🟢 Verified (C2PA)');

    // 3. Platform Tagged: clean label
    badge.complianceData = ComplianceEngine.evaluateCompliance(
      { c2paStatus: 'STRIPPED', platformLabel: true },
      null,
      true
    );
    assert.equal(badge.resolvePillLabel('PLATFORM_TAGGED'), '🟡 Platform Tagged');

    // 4. Micro-span / Insufficient length: returns human-friendly "Unverifiable" without token count
    badge.complianceData = ComplianceEngine.evaluateCompliance(
      null,
      { status: 'INSUFFICIENT_LENGTH', tokenCount: 15, zScore: null, isWatermarked: false },
      false
    );
    assert.equal(badge.resolvePillLabel('NO_SIGNAL'), '⚪ Unverifiable');
  });
});

