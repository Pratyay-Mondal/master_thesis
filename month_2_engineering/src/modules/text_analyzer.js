/**
 * text_analyzer.js
 * Client-Side Token Estimator & Character N-Gram Entropy Gatekeeper (FR-02).
 *
 * Implements lightweight client-side pre-filtering prior to dispatching text
 * to the SynthID-Text statistical watermark verification service:
 * 1. Subword / BPE-approximated token estimation (~1.3 tokens/word multiplier).
 * 2. Unicode-safe character n-gram Shannon entropy & conditional entropy to
 *    flag deterministic code blocks, repetitive spam, or emoji-heavy captions
 *    that lack sufficient "nudgeable" logit entropy for watermarking.
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
    root.AITransparency.TextAnalyzer = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  'use strict';

  const MIN_WATERMARK_TOKENS = 50;
  const LOW_BIGRAM_ENTROPY_THRESHOLD = 4.5;      // Bits over bigram distribution
  const LOW_CONDITIONAL_ENTROPY_THRESHOLD = 1.9; // Bits/char given (n-1) context

  class TextAnalyzer {
    /**
     * Estimates subword token count (SentencePiece / BPE approximation).
     * Combines a calibrated ~1.3 tokens-per-word heuristic with subword splitting
     * for long unspaced tokens (e.g. URLs, code identifiers) and extra weight
     * for non-ASCII / emoji symbols.
     *
     * @param {string} text
     * @returns {number} Estimated integer token count
     */
    static estimateTokenCount(text) {
      if (!text || typeof text !== 'string') return 0;

      const trimmed = text.trim();
      if (trimmed.length === 0) return 0;

      // Extract alphanumeric/Unicode words and standalone symbol/emoji clusters
      const wordMatches = trimmed.match(/[\p{L}\p{N}]+/gu) || [];
      const emojiMatches = trimmed.match(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu) || [];
      const standalonePunctMatches = trimmed.match(/[^\s\p{L}\p{N}\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu) || [];

      let estimated = 0;

      for (const word of wordMatches) {
        if (word.length > 10) {
          // Long identifiers, hashes, or compound German nouns split into ~4-char BPE pieces
          estimated += Math.ceil(word.length / 4.2);
        } else {
          // Empirically calibrated ~1.3 BPE tokens per typical natural-language word
          estimated += 1.3;
        }
      }

      // Emojis routinely serialize into 2-3 UTF-8 byte tokens in LLM tokenizers
      estimated += emojiMatches.length * 2;

      // Dense punctuation/code syntax operators beyond normal prose cadence
      if (standalonePunctMatches.length > wordMatches.length * 0.35) {
        estimated += Math.round((standalonePunctMatches.length - wordMatches.length * 0.35) * 0.8);
      }

      return Math.max(1, Math.round(estimated));
    }

    /**
     * Computes character n-gram Shannon entropy H_n = -sum(p(g) * log2(p(g)))
     * over Unicode code points (preventing surrogate-pair splitting on emojis).
     *
     * Low values indicate repetitive sequences, boilerplate, emoji floods, or
     * rigid syntactic templates where statistical watermarking degrades.
     *
     * @param {string} text
     * @param {number} [n=2] N-gram order (defaults to character bigrams)
     * @returns {number} Shannon entropy in bits (rounded to 4 decimal places)
     */
    static calculateEntropy(text, n = 2) {
      if (!text || typeof text !== 'string') return 0;

      const codePoints = Array.from(text.trim());
      const order = Math.max(1, Math.floor(n));

      if (codePoints.length === 0) return 0;

      // Fallback to unigram entropy if string is shorter than n-gram window
      const effectiveOrder = codePoints.length < order ? 1 : order;
      const totalGrams = codePoints.length - effectiveOrder + 1;
      const counts = new Map();

      for (let i = 0; i < totalGrams; i++) {
        const gram = codePoints.slice(i, i + effectiveOrder).join('');
        counts.set(gram, (counts.get(gram) || 0) + 1);
      }

      let entropy = 0;
      for (const count of counts.values()) {
        const p = count / totalGrams;
        entropy -= p * Math.log2(p);
      }

      return Number(entropy.toFixed(4));
    }

    /**
     * Computes conditional character entropy H(C_t | C_{t-1}) = H_2 - H_1,
     * quantifying average residual uncertainty per next character.
     *
     * @param {string} text
     * @returns {number} Conditional entropy in bits/character
     */
    static calculateConditionalEntropy(text) {
      if (!text || typeof text !== 'string' || Array.from(text.trim()).length < 2) {
        return 0;
      }
      const h1 = this.calculateEntropy(text, 1);
      const h2 = this.calculateEntropy(text, 2);
      return Number(Math.max(0, h2 - h1).toFixed(4));
    }

    /**
     * Performs full client-side feasibility assessment for SynthID-Text auditing.
     *
     * @param {string} text
     * @returns {Object} Detailed token & entropy telemetry
     */
    static analyzeText(text) {
      const normalized = typeof text === 'string' ? text.trim() : '';
      const tokenCount = this.estimateTokenCount(normalized);
      const unigramEntropy = this.calculateEntropy(normalized, 1);
      const bigramEntropy = this.calculateEntropy(normalized, 2);
      const conditionalEntropy = Number(Math.max(0, bigramEntropy - unigramEntropy).toFixed(4));

      const isSufficientLength = tokenCount >= MIN_WATERMARK_TOKENS;
      const isLowEntropy =
        normalized.length > 0 &&
        (bigramEntropy < LOW_BIGRAM_ENTROPY_THRESHOLD ||
          conditionalEntropy < LOW_CONDITIONAL_ENTROPY_THRESHOLD);

      return {
        charCount: Array.from(normalized).length,
        tokenCount,
        unigramEntropy,
        bigramEntropy,
        conditionalEntropy,
        isSufficientLength,
        isLowEntropy,
        eligibleForApi: isSufficientLength && !isLowEntropy
      };
    }
  }

  TextAnalyzer.MIN_WATERMARK_TOKENS = MIN_WATERMARK_TOKENS;
  TextAnalyzer.LOW_BIGRAM_ENTROPY_THRESHOLD = LOW_BIGRAM_ENTROPY_THRESHOLD;
  TextAnalyzer.LOW_CONDITIONAL_ENTROPY_THRESHOLD = LOW_CONDITIONAL_ENTROPY_THRESHOLD;

  return TextAnalyzer;
});

