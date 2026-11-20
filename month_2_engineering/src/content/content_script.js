/**
 * content_script.js
 * Dual-Observer Architecture for Meta React Virtual DOM Feeds.
 *
 * Coordinates:
 * 1. MutationObserver: Captures dynamically mounted React post nodes on Facebook, Instagram, and WhatsApp.
 * 2. IntersectionObserver: Throttles evaluation so only visible posts trigger UI injection (preventing browser freezes).
 * 3. PlatformAdapters: Locates resilient anchors using ARIA/data attributes.
 * 4. UIInjector: Injects isolated Shadow DOM badges into the feed.
 *
 * Thesis: "AI Transparency in the Wild: Bridging Technical Provenance
 * and Legal Compliance under the EU AI Act on Social Media Platforms"
 */

(function () {
  'use strict';

  // Retrieve dependencies from namespace (or modules if bundled)
  const Adapters = (window.AITransparency && window.AITransparency.PlatformAdapters) || null;
  const Injector = (window.AITransparency && window.AITransparency.UIInjector) || null;
  const ImageProv = (window.AITransparency && window.AITransparency.ImageProvenance) || null;
  const TextProv = (window.AITransparency && window.AITransparency.TextProvenance) || null;
  const Compliance = (window.AITransparency && window.AITransparency.ComplianceEngine) || null;

  if (!Adapters || !Injector) {
    console.error(
      '[AI-Transparency-Validator] [Bootstrap] Missing PlatformAdapters or UIInjector dependencies in global scope.'
    );
    return;
  }

  const PREFIX = '[AI-Transparency-Validator]';

  class ContentScriptCoordinator {
    constructor() {
      this.platform = Adapters.detectPlatform();
      this.intersectionObserver = null;
      this.mutationObserver = null;
      this.debounceTimer = null;
      this.processedCount = 0;
      this.isTornDown = false;
    }

    /**
     * Entry point. Initializes observers if running on a recognized platform.
     */
    start() {
      console.log(`${PREFIX} [Init] Detected platform: [${this.platform.toUpperCase()}] at URL: ${window.location.href}`);

      if (this.platform === Adapters.PLATFORMS.UNKNOWN) {
        console.warn(`${PREFIX} [Init] Not a supported Meta platform or mock page. Standing by.`);
        return;
      }

      this.initIntersectionObserver();
      this.initMutationObserver();

      // Immediate initial scan for pre-rendered static HTML mock pages & server-rendered feeds
      this.scanExistingPosts();

      // Listen for client-side SPA navigation events (Meta React router)
      window.addEventListener('popstate', () => this.handleNavigationChange());
      window.addEventListener('hashchange', () => this.handleNavigationChange());
    }

    /**
     * Performs an immediate scan of all existing posts in the DOM.
     * Essential for static HTML mock pages and server-side rendered feeds.
     */
    scanExistingPosts() {
      const root = (typeof document !== 'undefined' ? (document.body || document.documentElement) : null);
      if (root) {
        this.queueUninspectedPosts(root);
      }
    }

    /**
     * Verifies that the Chrome extension context is still alive.
     */
    isContextValid() {
      if (this.isTornDown) return false;
      try {
        if (typeof chrome === 'undefined' || !chrome || !chrome.runtime || !chrome.runtime.id) {
          return false;
        }
        if (typeof chrome.runtime.getManifest === 'function') {
          chrome.runtime.getManifest();
        }
        return true;
      } catch (e) {
        return false;
      }
    }

    /**
     * Tears down observers silently if the extension was reloaded in chrome://extensions.
     */
    teardownObservers() {
      if (this.isTornDown) return;
      this.isTornDown = true;
      if (this.mutationObserver) {
        try {
          this.mutationObserver.disconnect();
        } catch (_) {}
        this.mutationObserver = null;
      }
      if (this.intersectionObserver) {
        try {
          this.intersectionObserver.disconnect();
        } catch (_) {}
        this.intersectionObserver = null;
      }
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }
      console.info(
        `${PREFIX} [Lifecycle] Extension reloaded or context disconnected. Observers gracefully unmounted until page refresh.`
      );
    }

    checkContextOrTeardown() {
      if (!this.isContextValid()) {
        this.teardownObservers();
        return false;
      }
      return true;
    }

    /**
     * Handles single-page app route changes (e.g. clicking from FB Feed to Profile).
     */
    handleNavigationChange() {
      if (!this.checkContextOrTeardown()) return;
      const currentPlatform = Adapters.detectPlatform();
      if (currentPlatform !== this.platform) {
        this.platform = currentPlatform;
        console.log(`${PREFIX} [Navigation] Platform context shifted to: [${this.platform.toUpperCase()}]`);
      }
      setTimeout(() => this.queueUninspectedPosts(document.body), 500);
    }

    /**
     * IntersectionObserver: Defers injection until post actually enters viewport.
     * Prevents overhead if Meta pre-loads 50 offscreen feed units.
     */
    initIntersectionObserver() {
      const options = {
        root: null, // Viewport
        rootMargin: '100px 0px 100px 0px', // Pre-fetch slightly before it scrolls into view
        threshold: 0 // Trigger as soon as 1px is visible
      };

      this.intersectionObserver = new IntersectionObserver((entries, observer) => {
        if (!this.checkContextOrTeardown()) return;
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const postElement = entry.target;

            // 1. Unobserve immediately to prevent duplicate runs
            observer.unobserve(postElement);

            // Skip if this element, its ancestor, or any child was already inspected
            if (
              postElement.getAttribute('data-ai-transparency-inspected') === 'true' ||
              (postElement.parentElement &&
                typeof postElement.parentElement.closest === 'function' &&
                postElement.parentElement.closest('[data-ai-transparency-inspected="true"]')) ||
              (typeof postElement.querySelector === 'function' &&
                postElement.querySelector('[data-ai-transparency-inspected="true"]'))
            ) {
              return;
            }

            // 2. Mark element (and enclosing row for WhatsApp) with permanent attribute
            postElement.setAttribute('data-ai-transparency-inspected', 'true');
            if (typeof postElement.closest === 'function') {
              const enclosingRow = postElement.closest('[role="row"]');
              if (enclosingRow) {
                enclosingRow.setAttribute('data-ai-transparency-inspected', 'true');
              }
            }

            // 3. Process and inject badge
            this.handleVisiblePost(postElement);
          }
        });
      }, options);

      console.log(`${PREFIX} [Observer] IntersectionObserver armed.`);
    }

    /**
     * MutationObserver: Watches document for newly mounted React virtual DOM trees.
     */
    initMutationObserver() {
      this.mutationObserver = new MutationObserver((mutations) => {
        if (!this.checkContextOrTeardown()) return;
        let shouldScan = false;

        for (const m of mutations) {
          if (m.type === 'childList' && m.addedNodes.length > 0) {
            for (const node of m.addedNodes) {
              if (node.nodeType === Node.ELEMENT_NODE) {
                // Ignore mutations triggered by our own injected Shadow DOM host
                if (node.classList && node.classList.contains('ai-transparency-badge-host')) {
                  continue;
                }
                shouldScan = true;
                break;
              }
            }
          }
          if (shouldScan) break;
        }

        if (shouldScan) {
          // Throttled scan to keep 60 FPS scrolling smooth
          clearTimeout(this.debounceTimer);
          this.debounceTimer = setTimeout(() => {
            this.queueUninspectedPosts(document.body);
          }, 120);
        }
      });

      this.mutationObserver.observe(document.body, {
        childList: true,
        subtree: true
      });

      console.log(`${PREFIX} [Observer] MutationObserver attached to document.body.`);
    }

    /**
     * Queries DOM for uninspected posts and hands them to the IntersectionObserver.
     */
    queueUninspectedPosts(root) {
      if (!root || !this.checkContextOrTeardown()) return;

      const posts = Adapters.queryUninspectedPosts(this.platform, root);
      if (posts.length === 0) return;

      console.log(`${PREFIX} [Queue] Found ${posts.length} new candidate post(s). Passing to IntersectionObserver.`);

      posts.forEach((postNode) => {
        // Tag as queued to avoid re-querying in rapid succession
        postNode.setAttribute('data-ai-transparency-queued', 'true');
        this.intersectionObserver.observe(postNode);
      });
    }

    /**
     * Triggered when a post enters the visible viewport.
     * Executes parallel FR-01 (Image C2PA) and FR-02 (Text SynthID) provenance audits.
     */
    async handleVisiblePost(postNode) {
      if (!this.checkContextOrTeardown()) return;
      this.processedCount++;
      const id = this.processedCount;

      console.log(`${PREFIX} [Process] Post #${id} is now VISIBLE in viewport.`);

      // 1. Locate safe anchor element in post header
      const anchor = Adapters.getAnchorElement(this.platform, postNode);
      if (!anchor) {
        console.warn(`${PREFIX} [Process] Post #${id} has no valid anchor element. Skipping injection.`);
        return;
      }

      // Guard against duplicate injection if anchor or postNode already contains a badge
      if (
        (typeof anchor.querySelector === 'function' && anchor.querySelector('.ai-transparency-badge-host')) ||
        (typeof postNode.querySelector === 'function' && postNode.querySelector('.ai-transparency-badge-host'))
      ) {
        return;
      }

      // 2. Inspect DOM for native labels & media elements
      const hasNativeLabel = Adapters.detectPlatformNativeLabel(this.platform, postNode);
      const media = Adapters.extractMediaElements(this.platform, postNode);

      // 3. Mount <ai-transparency-badge> Custom Element immediately in SCANNING state
      const badgeElement = Injector.mountComplianceBadge(anchor);

      try {
        // 4. Run Image (FR-01) and Text (FR-02) provenance pipelines concurrently
        const imageAuditPromise =
          media.length > 0 && ImageProv
            ? ImageProv.auditImageProvenance(media[0], postNode)
            : Promise.resolve(null);

        const textAuditPromise = TextProv
          ? TextProv.auditTextProvenance(this.platform, postNode)
          : Promise.resolve(null);

        const [imageAudit, textAudit] = await Promise.all([imageAuditPromise, textAuditPromise]);

        // If either audit detected an invalidated extension context, shut down observers immediately
        if (
          imageAudit?.contextInvalidated ||
          textAudit?.contextInvalidated ||
          (imageAudit?.details && imageAudit.details.includes('invalidated')) ||
          (textAudit?.details && textAudit.details.includes('invalidated'))
        ) {
          this.teardownObservers();
          return;
        }

        // 5. Evaluate EU AI Act Article 50 compliance (FR-03) and bind to Web Component (FR-04)
        if (Compliance && badgeElement) {
          const complianceVerdict = Compliance.evaluateCompliance(imageAudit, textAudit, hasNativeLabel);
          badgeElement.complianceData = complianceVerdict;
          console.log(
            `${PREFIX} [FR-03/04] Post #${id} Verdict [${complianceVerdict.overallState}]:`,
            complianceVerdict
          );
        } else {
          // Legacy fallback if ComplianceEngine is unavailable
          const fallbackShadow = Injector.injectBadge(anchor, this.resolveCombinedBadgeState({
            imageAudit,
            textAudit,
            hasNativeLabel
          }));
          if (fallbackShadow) {
            console.log(`${PREFIX} [Fallback] Legacy badge updated for Post #${id}.`);
          }
        }
      } catch (err) {
        const errorMsg = String(err?.message || err || '');
        const isInvalidated =
          errorMsg.toLowerCase().includes('invalidat') || errorMsg.toLowerCase().includes('closed');
        if (isInvalidated) {
          this.teardownObservers();
          return;
        }
        console.error(`${PREFIX} [Error] Multimodal audit failed for Post #${id}:`, err);
        if (badgeElement) {
          badgeElement.complianceData = Compliance
            ? Compliance.evaluateCompliance(null, null, hasNativeLabel)
            : { overallState: hasNativeLabel ? 'PLATFORM_TAGGED' : 'NO_SIGNAL' };
        }
      }
    }

    /**
     * Synthesizes FR-01 (Image C2PA) and FR-02 (Text Watermark) signals with
     * EU AI Act Article 50 disclosure checks to produce the unified badge state.
     *
     * @param {{ imageAudit: Object|null, textAudit: Object|null, hasNativeLabel: boolean }} params
     * @returns {{ status: string, label: string, details: string }}
     */
    resolveCombinedBadgeState({ imageAudit, textAudit, hasNativeLabel }) {
      const detailParts = [];
      if (imageAudit) detailParts.push(`Image: ${imageAudit.details}`);
      if (textAudit) detailParts.push(`Text: ${textAudit.details}`);
      const combinedDetails = detailParts.join(' | ') || 'No inspectable media or text found.';

      // Case 1: Tampered cryptographic manifest -> critical alert
      if (imageAudit?.c2paStatus === 'INVALID') {
        return {
          status: 'UNLABELED_AI',
          label: '🚨 AI: Tampered Manifest',
          details: combinedDetails
        };
      }

      // Case 2: Statistical AI text watermark detected WITHOUT visible Art. 50(4) disclosure
      if (textAudit?.isWatermarked && !hasNativeLabel) {
        return {
          status: 'UNLABELED_AI',
          label: `🚨 AI: Undisclosed AI Text (z=${textAudit.zScore.toFixed(1)})`,
          details: combinedDetails
        };
      }

      // Case 3: Verified C2PA provenance OR disclosed watermarked AI text
      if (imageAudit?.c2paStatus === 'VALID' || (textAudit?.isWatermarked && hasNativeLabel)) {
        const label =
          imageAudit?.c2paStatus === 'VALID'
            ? imageAudit.aiGenerator
              ? `🛡️ AI: Verified (${imageAudit.aiGenerator})`
              : '🛡️ AI: Verified Provenance'
            : `🛡️ AI: Watermarked & Disclosed (z=${textAudit.zScore.toFixed(1)})`;

        return {
          status: 'VERIFIED',
          label,
          details: combinedDetails
        };
      }

      // Case 4: Platform Ingestion Trap (Meta "Made with AI" present, but C2PA stripped & no text watermark)
      if (hasNativeLabel || imageAudit?.platformLabel) {
        return {
          status: 'PLATFORM_TAG',
          label: '⚠️ AI: Platform Tagged',
          details: combinedDetails
        };
      }

      // Case 5: Image manifest stripped without platform tag
      if (imageAudit?.c2paStatus === 'STRIPPED') {
        return {
          status: 'STRIPPED',
          label: '⚪ AI: Manifest Stripped',
          details: combinedDetails
        };
      }

      // Case 6: Text evaluated cleanly and found free of statistical watermark
      if (textAudit?.status === 'NO_WATERMARK') {
        return {
          status: 'NO_WATERMARK',
          label: `⚪ No AI Signal (z=${textAudit.zScore.toFixed(1)})`,
          details: combinedDetails
        };
      }

      // Case 7: Short or low-entropy text span (T < 50 tokens or low Shannon entropy)
      if (textAudit?.status === 'LOW_ENTROPY') {
        return {
          status: 'INSUFFICIENT',
          label: '⚪ AI: Low-Entropy Span',
          details: combinedDetails
        };
      }

      if (textAudit?.status === 'INSUFFICIENT_LENGTH') {
        return {
          status: 'INSUFFICIENT',
          label: `⚪ AI: Short Text (${textAudit.tokenCount} tok)`,
          details: combinedDetails
        };
      }

      return {
        status: 'INSUFFICIENT',
        label: '⚪ No Provenance Found',
        details: combinedDetails
      };
    }
  }

  // Initialize once DOM is ready
  const coordinator = new ContentScriptCoordinator();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => coordinator.start());
  } else {
    coordinator.start();
  }

  // Expose for manual DevTools console testing
  window.AITransparency.coordinator = coordinator;
})();
