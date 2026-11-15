/**
 * text_provenance.js
 * Text Provenance Coordinator (FR-02).
 *
 * Implements the client-side statistical text watermarking audit pipeline:
 * 1. Extracts & normalizes core caption/post text (boilerplate stripped).
 * 2. Computes BPE-approximated token count and character n-gram Shannon entropy.
 * 3. Gates short spans (T < 50 tokens) and degenerate low-entropy spans
 *    (code blocks, repetitive emojis/spam) entirely client-side.
 * 4. Dispatches eligible spans ONLY as minimized { text } payloads (GDPR NFR-01)
 *    to the background service worker's SynthID-Text API gateway.
 * 5. Resolves unified status, z-score, and p-value for EU AI Act Article 50 evaluation.
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
    root.AITransparency.TextProvenance = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  'use strict';

  const MIN_TOKENS = 50;

  class TextProvenanceCoordinator {
    /**
     * Audits the textual content of a social media post for statistical AI watermarking.
     *
     * @param {string} platform - Platform identifier ('facebook' | 'instagram' | 'whatsapp' | 'unknown')
     * @param {Element} postContainerElement - Root DOM container of the post
     * @param {Object} [options={}]
     * @param {boolean} [options.skipEntropyGate=false] - Optional override for benchmarking low-entropy spans
     * @returns {Promise<Object>} Unified text provenance assessment
     */
    static async auditTextProvenance(platform, postContainerElement, options = {}) {
      const rootNs = (typeof globalThis !== 'undefined' ? globalThis : window).AITransparency || {};
      const Extractor = rootNs.TextExtractor || null;
      const Analyzer = rootNs.TextAnalyzer || null;

      if (!Extractor || !Analyzer) {
        return {
          status: 'API_ERROR',
          tokenCount: 0,
          entropy: 0,
          conditionalEntropy: 0,
          zScore: null,
          pValue: null,
          isWatermarked: false,
          isLowEntropy: false,
          details: 'Missing TextExtractor or TextAnalyzer module in runtime namespace.'
        };
      }

      // Step 1: Extract & normalize core post text (boilerplate filtered)
      const extractedText = Extractor.extractPostText(platform, postContainerElement);

      // Step 2: Handle empty text spans immediately
      if (!extractedText || extractedText.length === 0) {
        return {
          status: 'NO_TEXT',
          tokenCount: 0,
          entropy: 0,
          conditionalEntropy: 0,
          zScore: null,
          pValue: null,
          isWatermarked: false,
          isLowEntropy: false,
          details: 'No inspectable textual content found in post container.'
        };
      }

      // Step 3: Client-side token estimation & character n-gram Shannon entropy
      const analysis = Analyzer.analyzeText(extractedText);
      const { tokenCount, bigramEntropy: entropy, conditionalEntropy, isLowEntropy } = analysis;

      // Step 4: Statistical length gate (SynthID-Text requires T >= 50 tokens for z > 3.0)
      if (tokenCount < MIN_TOKENS) {
        console.log(
          `[AI-Transparency-Validator] [FR-02] Skipping API dispatch: insufficient tokens (${tokenCount} < ${MIN_TOKENS}).`
        );
        return {
          status: 'INSUFFICIENT_LENGTH',
          tokenCount,
          entropy,
          conditionalEntropy,
          zScore: null,
          pValue: null,
          isWatermarked: false,
          isLowEntropy,
          details: `Text span (${tokenCount} est. tokens) is below the ${MIN_TOKENS}-token threshold for reliable watermark detection.`
        };
      }

      // Gate degenerate low-entropy spans (code syntax, emoji floods, repetitive spam)
      if (!options.skipEntropyGate && isLowEntropy) {
        console.log(
          `[AI-Transparency-Validator] [FR-02] Skipping API dispatch: low-entropy span (H2=${entropy} bits, H_cond=${conditionalEntropy} bits/char).`
        );
        return {
          status: 'LOW_ENTROPY',
          tokenCount,
          entropy,
          conditionalEntropy,
          zScore: null,
          pValue: null,
          isWatermarked: false,
          isLowEntropy: true,
          details: `Span entropy (H2=${entropy} bits, cond=${conditionalEntropy} bits/char) too low for statistical watermark perturbation.`
        };
      }

      // Step 5: Privacy-preserving dispatch via Service Worker (GDPR NFR-01: ONLY { text })
      console.log(
        `[AI-Transparency-Validator] [FR-02] Dispatching eligible span (${tokenCount} tokens, H2=${entropy}) via VERIFY_TEXT_WATERMARK.`
      );

      try {
        const apiResponse = await this.verifyTextWithBackground(extractedText);

        if (!apiResponse || apiResponse.success !== true) {
          return {
            status: 'API_ERROR',
            tokenCount,
            entropy,
            conditionalEntropy,
            zScore: null,
            pValue: null,
            isWatermarked: false,
            isLowEntropy,
            details: apiResponse?.error || 'SynthID-Text verification gateway returned an error.'
          };
        }

        const zScore = typeof apiResponse.zScore === 'number' ? apiResponse.zScore : 0;
        const pValue = typeof apiResponse.pValue === 'number' ? apiResponse.pValue : 1;
        const isWatermarked = Boolean(apiResponse.isWatermarked);

        // Step 6: Return unified status object resolving API classification
        return {
          status: isWatermarked ? 'WATERMARK_DETECTED' : 'NO_WATERMARK',
          tokenCount,
          entropy,
          conditionalEntropy,
          zScore,
          pValue,
          isWatermarked,
          isLowEntropy,
          details: isWatermarked
            ? `SynthID-Text watermark detected (z=${zScore.toFixed(2)}, p=${pValue}, T=${tokenCount} tokens).`
            : `No statistical watermark signal detected (z=${zScore.toFixed(2)}, p=${pValue}, T=${tokenCount} tokens).`
        };
      } catch (err) {
        console.error('[AI-Transparency-Validator] [FR-02] Text watermark dispatch failed:', err);
        return {
          status: 'API_ERROR',
          tokenCount,
          entropy,
          conditionalEntropy,
          zScore: null,
          pValue: null,
          isWatermarked: false,
          isLowEntropy,
          details: `IPC dispatch failure: ${err.message}`
        };
      }
    }

    /**
     * Dispatches strictly minimized { text } payload to MV3 Service Worker.
     * Ensures zero leakage of platform, URL, author, or user identifiers (NFR-01).
     *
     * @param {string} text
     * @returns {Promise<Object>}
     */
    static verifyTextWithBackground(text) {
      return new Promise((resolve, reject) => {
        if (typeof chrome === 'undefined' || !chrome.runtime || typeof chrome.runtime.sendMessage !== 'function') {
          reject(new Error('chrome.runtime.sendMessage API is unavailable in this context'));
          return;
        }

        // In Chrome browser, an undefined runtime.id indicates an invalidated extension context
        if (typeof process === 'undefined' && typeof chrome.runtime.id === 'undefined') {
          reject(new Error('Extension context invalidated. Please reload the webpage to reconnect the extension.'));
          return;
        }

        try {
          chrome.runtime.sendMessage(
            {
              type: 'VERIFY_TEXT_WATERMARK',
              payload: { text }
            },
            (response) => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message || 'Background worker error'));
              } else {
                resolve(response);
              }
            }
          );
        } catch (err) {
          reject(new Error(err.message || 'Failed to dispatch message to background worker'));
        }
      });
    }
  }

  /**
   * Direct functional export convenience alias matching specification.
   */
  TextProvenanceCoordinator.auditTextProvenance = TextProvenanceCoordinator.auditTextProvenance.bind(
    TextProvenanceCoordinator
  );

  return TextProvenanceCoordinator;
});

