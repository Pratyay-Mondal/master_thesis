/**
 * compliance_engine.js
 * EU AI Act Article 50 Legal-Technical Compliance Engine (FR-03).
 *
 * Maps multimodal technical provenance signals (FR-01 C2PA image status,
 * FR-02 SynthID-Text z-scores, and platform-native disclosure labels)
 * directly to legal compliance verdicts under Regulation (EU) 2024/1689:
 * - Article 50(2): Provider machine-readable marking & detectability
 * - Article 50(4): Deployer user-facing disclosure obligations
 * - Article 50(5): Clear & distinguishable UI presentation at first exposure
 *
 * Thesis: "AI Transparency in the Wild: Bridging Technical Provenance
 * and Legal Compliance under the EU AI Act on Social Media Platforms"
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AITransparency = root.AITransparency || {};
    root.AITransparency.ComplianceEngine = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  'use strict';

  const COMPLIANCE_VERDICT = {
    COMPLIANT: 'COMPLIANT',
    NON_COMPLIANT: 'NON_COMPLIANT',
    UNKNOWN: 'UNKNOWN'
  };

  const OVERALL_BADGE_STATE = {
    VERIFIED: 'VERIFIED',
    PLATFORM_TAGGED: 'PLATFORM_TAGGED',
    UNDISCLOSED_AI: 'UNDISCLOSED_AI',
    NO_SIGNAL: 'NO_SIGNAL'
  };

  const Z_SCORE_THRESHOLD = 3.0;

  class ComplianceEngine {
    /**
     * Evaluates EU AI Act Article 50 compliance from multimodal technical signals.
     *
     * @param {Object|null} imageResult - Output from ImageProvenance.auditImageProvenance()
     * @param {Object|null} textResult - Output from TextProvenance.auditTextProvenance()
     * @param {boolean} platformLabelPresent - Whether Meta's native "Made with AI" label exists in DOM
     * @returns {Object} Structured Article 50 compliance verdict & UI state
     */
    static evaluateCompliance(imageResult, textResult, platformLabelPresent) {
      const hasPlatformLabel = Boolean(platformLabelPresent || imageResult?.platformLabel);

      // Technical signal flags (FR-01 & FR-02)
      const c2paStatus = imageResult?.c2paStatus || 'NONE';
      const hasValidC2PA = c2paStatus === 'VALID';
      const isC2PAStripped = c2paStatus === 'STRIPPED';
      const isC2PAInvalid = c2paStatus === 'INVALID';

      const zScore = typeof textResult?.zScore === 'number' ? textResult.zScore : null;
      const hasTextWatermark = Boolean(
        textResult?.isWatermarked || (zScore !== null && zScore > Z_SCORE_THRESHOLD)
      );

      const hasTechnicalAISignal = hasValidC2PA || hasTextWatermark;

      // -----------------------------------------------------------------------
      // 1. Article 50(2): Provider Marking (Machine-Readable & Detectable)
      //    - COMPLIANT if valid C2PA manifest exists OR text watermark z > 3.0
      //    - NON_COMPLIANT if C2PA was stripped/damaged while platform label admits AI origin
      //    - UNKNOWN otherwise (no detectable machine-readable provenance)
      // -----------------------------------------------------------------------
      let art50_2;
      if (hasValidC2PA || hasTextWatermark) {
        art50_2 = {
          status: COMPLIANCE_VERDICT.COMPLIANT,
          rationale:
            'This content includes a verified digital watermark or cryptographic signature embedded by the AI system that generated it.'
        };
      } else if ((isC2PAStripped || isC2PAInvalid) && hasPlatformLabel) {
        art50_2 = {
          status: COMPLIANCE_VERDICT.NON_COMPLIANT,
          rationale: isC2PAInvalid
            ? 'The platform labeled this as AI, but the original digital authenticity signature from the AI creator is damaged or tampered.'
            : 'The platform labeled this as AI, but the original digital authenticity signature from the AI creator is missing or was stripped during upload.'
        };
      } else {
        art50_2 = {
          status: COMPLIANCE_VERDICT.UNKNOWN,
          rationale:
            'No digital authenticity mark from an AI creator was detected.'
        };
      }

      // -----------------------------------------------------------------------
      // 2. Article 50(4): Deployer Disclosure (User-Facing Transparency Label)
      //    - COMPLIANT if platform label is present on AI content (or platform-tagged AI)
      //    - NON_COMPLIANT if AI content is detected (z > 3.0 or valid C2PA) WITHOUT platform label
      //    - UNKNOWN if no AI content or platform label is detected
      // -----------------------------------------------------------------------
      let art50_4;
      if (hasPlatformLabel) {
        art50_4 = {
          status: COMPLIANCE_VERDICT.COMPLIANT,
          rationale:
            'The publisher or platform clearly informed viewers that this content was created using AI.'
        };
      } else if (hasTechnicalAISignal) {
        art50_4 = {
          status: COMPLIANCE_VERDICT.NON_COMPLIANT,
          rationale:
            'AI-generated content was detected, but the publisher did not disclose this to viewers.'
        };
      } else {
        art50_4 = {
          status: COMPLIANCE_VERDICT.UNKNOWN,
          rationale:
            'No AI disclosure was found, and no verified AI signals were detected.'
        };
      }

      // -----------------------------------------------------------------------
      // 3. Article 50(5): User Visibility & Accessibility
      //    - COMPLIANT unconditionally: our isolated Shadow DOM badge + drawer
      //      surfaces provenance and legal status clearly at first exposure.
      // -----------------------------------------------------------------------
      const art50_5 = {
        status: COMPLIANCE_VERDICT.COMPLIANT,
        rationale:
          'Transparency information and legal compliance details are displayed clearly at first view.'
      };

      // -----------------------------------------------------------------------
      // 4. Unified Visual Pill State (for <ai-transparency-badge>)
      // -----------------------------------------------------------------------
      let overallState = OVERALL_BADGE_STATE.NO_SIGNAL;
      if (hasTechnicalAISignal && !hasPlatformLabel) {
        // AI detected (z > 3.0 or valid C2PA), but NO platform label -> Red Alert
        overallState = OVERALL_BADGE_STATE.UNDISCLOSED_AI;
      } else if (hasTechnicalAISignal && hasPlatformLabel) {
        // Both technical provenance and platform disclosure satisfied -> Green Verified
        overallState = OVERALL_BADGE_STATE.VERIFIED;
      } else if (hasPlatformLabel) {
        // Platform label exists, but C2PA stripped / z <= 3.0 -> Amber Platform Tagged
        overallState = OVERALL_BADGE_STATE.PLATFORM_TAGGED;
      } else {
        // No label, z <= 3.0, or T < 50 -> Grey No Signal / Micro-span
        overallState = OVERALL_BADGE_STATE.NO_SIGNAL;
      }

      return {
        overallState,
        platformLabelPresent: hasPlatformLabel,
        articles: {
          article50_2: art50_2,
          article50_4: art50_4,
          article50_5: art50_5
        },
        signals: {
          image: {
            c2paStatus,
            aiGenerator: imageResult?.aiGenerator || null,
            claimGenerator: imageResult?.claimGenerator || null,
            byteLength: imageResult?.byteLength || 0,
            details: imageResult?.details || 'No image inspected.'
          },
          text: {
            status: textResult?.status || 'NO_TEXT',
            tokenCount: textResult?.tokenCount ?? 0,
            entropy: textResult?.entropy ?? 0,
            conditionalEntropy: textResult?.conditionalEntropy ?? 0,
            zScore,
            pValue: textResult?.pValue ?? null,
            isWatermarked: hasTextWatermark,
            isLowEntropy: Boolean(textResult?.isLowEntropy),
            details: textResult?.details || 'No text inspected.'
          }
        },
        evaluatedAt: new Date().toISOString()
      };
    }
  }

  ComplianceEngine.COMPLIANCE_VERDICT = COMPLIANCE_VERDICT;
  ComplianceEngine.OVERALL_BADGE_STATE = OVERALL_BADGE_STATE;
  ComplianceEngine.evaluateCompliance = ComplianceEngine.evaluateCompliance.bind(ComplianceEngine);

  return ComplianceEngine;
});

