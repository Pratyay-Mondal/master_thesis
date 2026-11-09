/**
 * image_provenance.js
 * Image Provenance Coordinator (FR-01).
 *
 * Implements the complete multi-tiered image inspection pipeline:
 * 1. Checks DOM for Meta's platform-native "Made with AI" disclosure badges.
 * 2. Fetches image binary stream via MV3 background worker (bypassing CORS).
 * 3. Executes high-speed pre-scan (<0.1ms) for JUMBF / C2PA container markers.
 * 4. Dispatches surviving manifests to the C2PA WebAssembly verification engine.
 * 5. Returns unified compliance status for Article 50 evaluation.
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
    root.AITransparency.ImageProvenance = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  'use strict';

  class ImageProvenanceCoordinator {
    /**
     * Audits an individual image element and its enclosing post container.
     *
     * @param {HTMLImageElement} imageElement - The rendered image DOM node
     * @param {Element} postContainerElement - Parent article or post container
     * @returns {Promise<Object>} Unified provenance assessment object:
     *   {
     *     c2paStatus: 'VALID' | 'STRIPPED' | 'NONE' | 'INVALID' | 'FETCH_FAILED',
     *     platformLabel: boolean,
     *     aiGenerator: string|null,
     *     claimGenerator: string|null,
     *     details: string,
     *     byteLength: number
     *   }
     */
    static async auditImageProvenance(imageElement, postContainerElement) {
      const Adapters = (window.AITransparency && window.AITransparency.PlatformAdapters) || null;
      const Scanner = (window.AITransparency && window.AITransparency.JumbfScanner) || null;
      const WasmLoader = (window.AITransparency && window.AITransparency.WasmLoader) || null;

      // 1. Step 1: Detect Meta platform-native "Made with AI" label in DOM
      const platform = Adapters ? Adapters.detectPlatform() : 'facebook';
      const hasPlatformLabel = Adapters
        ? Adapters.detectPlatformNativeLabel(platform, postContainerElement)
        : false;

      // 2. Step 2: Extract target image URL
      const imageUrl = (imageElement && (imageElement.currentSrc || imageElement.src)) || '';

      if (!imageUrl || imageUrl.startsWith('data:image/svg')) {
        return {
          c2paStatus: 'NONE',
          platformLabel: hasPlatformLabel,
          aiGenerator: null,
          claimGenerator: null,
          details: 'Image source is SVG or empty.',
          byteLength: 0
        };
      }

      console.log('[AI-Transparency-Validator] [FR-01] Auditing image provenance for:', imageUrl.slice(0, 80));

      // 3. Step 3: Fetch binary buffer via background service worker (CORS bypass)
      let fetchResult = null;
      try {
        fetchResult = await this.fetchImageBufferFromBackground(imageUrl);
      } catch (err) {
        console.warn('[AI-Transparency-Validator] [FR-01] Background fetch failed:', err.message);
        return {
          c2paStatus: 'FETCH_FAILED',
          platformLabel: hasPlatformLabel,
          aiGenerator: null,
          claimGenerator: null,
          details: `Failed to fetch binary asset: ${err.message}`,
          byteLength: 0
        };
      }

      if (!fetchResult || !fetchResult.success || !fetchResult.base64) {
        return {
          c2paStatus: 'FETCH_FAILED',
          platformLabel: hasPlatformLabel,
          aiGenerator: null,
          claimGenerator: null,
          details: fetchResult?.error || 'Empty response from background fetcher',
          byteLength: 0
        };
      }

      const totalBytes = fetchResult.byteLength || 0;
      const uint8Buffer = this.base64ToUint8Array(fetchResult.base64);

      // 4. Step 4: High-speed JUMBF header pre-scan
      const hasMetadata = Scanner ? Scanner.hasPossibleC2PAMetadata(uint8Buffer) : true;

      if (!hasMetadata) {
        console.log(
          `[AI-Transparency-Validator] [FR-01] JUMBF scan NEGATIVE (${totalBytes} bytes). Manifest stripped by Meta CDN.`
        );

        return {
          c2paStatus: 'STRIPPED',
          platformLabel: hasPlatformLabel,
          aiGenerator: null,
          claimGenerator: null,
          details: hasPlatformLabel
            ? 'Meta "Made with AI" label present; underlying C2PA manifest stripped by CDN re-encoding.'
            : 'Image binary contains no C2PA JUMBF metadata (stripped by CDN).',
          byteLength: totalBytes
        };
      }

      // 5. Step 5: JUMBF detected! Invoke C2PA WASM Verification Engine
      console.log(
        `[AI-Transparency-Validator] [FR-01] JUMBF container DETECTED! Invoking WebAssembly verification engine...`
      );

      let validationResult = { status: 'NO_MANIFEST', valid: false };

      if (WasmLoader) {
        try {
          validationResult = await WasmLoader.verifyBuffer(uint8Buffer);
        } catch (wasmErr) {
          console.error('[AI-Transparency-Validator] [WASM] Verification execution failed:', wasmErr);
          validationResult = { status: 'INVALID', error: wasmErr.message };
        }
      }

      const isValid = validationResult.valid === true;
      const statusKey = isValid ? 'VALID' : validationResult.status || 'INVALID';

      return {
        c2paStatus: statusKey,
        platformLabel: hasPlatformLabel,
        aiGenerator: validationResult.ai_generator || null,
        claimGenerator: validationResult.claim_generator || null,
        details: isValid
          ? `Verified C2PA manifest. Generator: ${validationResult.claim_generator || 'Standard C2PA'}`
          : `Manifest invalid or damaged: ${validationResult.error || 'Signature check failed'}`,
        byteLength: totalBytes
      };
    }

    /**
     * Dispatches IPC message to background service worker to fetch binary asset.
     */
    static fetchImageBufferFromBackground(url) {
      return new Promise((resolve, reject) => {
        if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
          reject(new Error('chrome.runtime API is unavailable in this context'));
          return;
        }

        chrome.runtime.sendMessage(
          {
            type: 'FETCH_IMAGE_BUFFER',
            payload: { url }
          },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(response);
            }
          }
        );
      });
    }

    /**
     * Converts a Base64 string to a Uint8Array.
     */
    static base64ToUint8Array(base64) {
      const binary = atob(base64);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    }
  }

  return ImageProvenanceCoordinator;
});
