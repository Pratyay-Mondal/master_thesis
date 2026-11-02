/**
 * content_script.js
 * Main DOM observer and provenance evaluation coordinator.
 *
 * Employs a dual-observer architecture (MutationObserver + IntersectionObserver)
 * to intercept dynamically inserted React Virtual DOM nodes on Facebook, Instagram,
 * and WhatsApp Web without degrading scrolling performance (60 FPS / NFR-02).
 *
 * Thesis: "AI Transparency in the Wild: Bridging Technical Provenance
 * and Legal Compliance under the EU AI Act on Social Media Platforms"
 */

import { PLATFORMS, MESSAGE_TYPES, COMPLIANCE_STATUS, EXTENSION_CONFIG } from '../common/constants.js';
import { PlatformAdapters } from './platform_adapters.js';
import { UIInjector } from './ui_injector.js';
import { Logger } from '../common/logger.js';

class AITransparencyContentScript {
  constructor() {
    this.platform = PlatformAdapters.detectPlatform();
    this.intersectionObserver = null;
    this.mutationObserver = null;
    this.mutationTimeout = null;
    this.inspectedCount = 0;
  }

  /**
   * Initializes the content script pipeline.
   */
  init() {
    if (this.platform === PLATFORMS.UNKNOWN) {
      Logger.debug('Active domain is not a target Meta platform. Content script idle.');
      return;
    }

    Logger.info(`Initialized AI Transparency Validator on platform: [${this.platform.toUpperCase()}]`);

    this.setupIntersectionObserver();
    this.setupMutationObserver();

    // Process initial DOM snapshot
    this.scanAndQueuePosts(document.body);
  }

  /**
   * Sets up IntersectionObserver to ensure only visible posts are processed.
   * Prevents premature analysis of offscreen virtualized nodes.
   */
  setupIntersectionObserver() {
    const options = {
      root: null, // Viewport
      rootMargin: EXTENSION_CONFIG.VIEWPORT_ROOT_MARGIN,
      threshold: EXTENSION_CONFIG.INTERSECTION_THRESHOLD
    };

    this.intersectionObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const postElement = entry.target;
          
          // Unobserve immediately to prevent duplicate evaluations
          observer.unobserve(postElement);

          // Mark inspected to avoid re-querying
          postElement.setAttribute(EXTENSION_CONFIG.INSPECTION_ATTRIBUTE, 'true');

          // Dispatch to inspection pipeline
          this.processVisiblePost(postElement);
        }
      });
    }, options);
  }

  /**
   * Sets up throttled MutationObserver watching for newly appended feed items.
   */
  setupMutationObserver() {
    this.mutationObserver = new MutationObserver(mutations => {
      let hasSignificantAdditions = false;

      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Ignore our own injected Shadow DOM hosts
              if (node.classList && node.classList.contains(EXTENSION_CONFIG.CONTAINER_CLASS)) {
                continue;
              }
              hasSignificantAdditions = true;
              break;
            }
          }
        }
        if (hasSignificantAdditions) break;
      }

      if (hasSignificantAdditions) {
        // Debounce scan calls to prevent lockup during rapid scrolling
        clearTimeout(this.mutationTimeout);
        this.mutationTimeout = setTimeout(() => {
          this.scanAndQueuePosts(document.body);
        }, EXTENSION_CONFIG.THROTTLE_DEBOUNCE_MS);
      }
    });

    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Discovers uninspected posts and registers them with IntersectionObserver.
   */
  scanAndQueuePosts(root) {
    if (!root) return;

    const uninspectedPosts = PlatformAdapters.queryUninspectedPosts(this.platform, root);
    if (uninspectedPosts.length === 0) return;

    Logger.debug(`Queued ${uninspectedPosts.length} newly discovered post(s) for viewport evaluation.`);

    uninspectedPosts.forEach(postElement => {
      this.intersectionObserver.observe(postElement);
    });
  }

  /**
   * Executes provenance extraction and UI injection for a visible post.
   */
  async processVisiblePost(postElement) {
    this.inspectedCount++;
    const postIndex = this.inspectedCount;

    Logger.debug(`Processing post #${postIndex} in viewport.`);

    // 1. Extract Target Elements
    const mediaElements = PlatformAdapters.extractMediaElements(this.platform, postElement);
    const textContent = PlatformAdapters.extractTextContent(this.platform, postElement);
    const hasPlatformNativeLabel = PlatformAdapters.detectPlatformNativeLabel(this.platform, postElement);

    // 2. Identify UI Badge Anchor
    const anchor = PlatformAdapters.findBadgeAnchor(this.platform, postElement);

    // 3. Inject Initial Shadow DOM Badge Placeholder
    const initialMetadata = {
      postId: postIndex,
      platform: this.platform,
      mediaCount: mediaElements.length,
      textLength: textContent.length,
      hasPlatformNativeLabel
    };

    const shadowRoot = UIInjector.injectBadgeContainer(anchor, initialMetadata);

    // 4. Dispatch Evaluation Tasks (Boilerplate integration ready for Weeks 2-4)
    try {
      const evaluationResult = await this.evaluateProvenanceSignals({
        mediaElements,
        textContent,
        hasPlatformNativeLabel,
        platform: this.platform
      });

      // 5. Update Badge to Reflect Article 50 Compliance Status
      UIInjector.updateBadgeState(shadowRoot, evaluationResult);
    } catch (err) {
      Logger.error(`Error processing post #${postIndex}:`, err);
      UIInjector.updateBadgeState(shadowRoot, {
        status: COMPLIANCE_STATUS.INSUFFICIENT_DATA,
        label: 'Audit Error',
        details: err.message
      });
    }
  }

  /**
   * Synthesizes available signals into an initial compliance assessment.
   * (Serves as scaffolding for Weeks 2–4 modules).
   */
  async evaluateProvenanceSignals({ mediaElements, textContent, hasPlatformNativeLabel, platform }) {
    // If Meta's upstream label is present (server-side detection on upload)
    if (hasPlatformNativeLabel) {
      return {
        status: COMPLIANCE_STATUS.PLATFORM_MEDIATED,
        label: 'Platform Labelled (AI)',
        details: 'Meta "Made with AI" marker detected. Underlying C2PA manifest was stripped during CDN re-encoding.'
      };
    }

    // Check media targets
    if (mediaElements.length > 0) {
      // In Week 2, this dispatches to WASM C2PA extractor
      return {
        status: COMPLIANCE_STATUS.INSUFFICIENT_DATA,
        label: 'Image Unverified',
        details: `${mediaElements.length} media element(s) queued for C2PA manifest / watermark scan.`
      };
    }

    // Check text target
    if (textContent.length > 0) {
      // In Week 3, this checks token count and dispatches to SynthID router
      const estimatedTokens = Math.round(textContent.split(/\s+/).length * 1.3);
      if (estimatedTokens < 50) {
        return {
          status: COMPLIANCE_STATUS.INSUFFICIENT_DATA,
          label: 'Micro-Span (No Signal)',
          details: `Post contains ~${estimatedTokens} tokens (< 50 token threshold). Statistical watermarking is inconclusive.`
        };
      }

      return {
        status: COMPLIANCE_STATUS.INSUFFICIENT_DATA,
        label: 'Text Unverified',
        details: `Text span (~${estimatedTokens} tokens) queued for statistical watermark audit.`
      };
    }

    return {
      status: COMPLIANCE_STATUS.INSUFFICIENT_DATA,
      label: 'No AI Markers',
      details: 'No synthetic media or text provenance detected.'
    };
  }
}

// Instantiate and launch
const validator = new AITransparencyContentScript();
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => validator.init());
} else {
  validator.init();
}
