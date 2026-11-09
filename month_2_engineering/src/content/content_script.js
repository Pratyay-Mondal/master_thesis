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

      // Scan already rendered DOM nodes immediately
      this.queueUninspectedPosts(document.body);

      // Listen for client-side SPA navigation events (Meta React router)
      window.addEventListener('popstate', () => this.handleNavigationChange());
      window.addEventListener('hashchange', () => this.handleNavigationChange());
    }

    /**
     * Handles single-page app route changes (e.g. clicking from FB Feed to Profile).
     */
    handleNavigationChange() {
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
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const postElement = entry.target;

            // 1. Unobserve immediately to prevent duplicate runs
            observer.unobserve(postElement);

            // 2. Mark element with permanent attribute
            postElement.setAttribute('data-ai-transparency-inspected', 'true');

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
      if (!root) return;

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
     * Executes provenance inspection and UI injection.
     */
    async handleVisiblePost(postNode) {
      this.processedCount++;
      const id = this.processedCount;

      console.log(`${PREFIX} [Process] Post #${id} is now VISIBLE in viewport.`);

      // 1. Locate safe anchor element in post header
      const anchor = Adapters.getAnchorElement(this.platform, postNode);
      if (!anchor) {
        console.warn(`${PREFIX} [Process] Post #${id} has no valid anchor element. Skipping injection.`);
        return;
      }

      // 2. Perform initial heuristic checks (Platform native label)
      const hasNativeLabel = Adapters.detectPlatformNativeLabel(this.platform, postNode);
      const media = Adapters.extractMediaElements(this.platform, postNode);
      const text = Adapters.extractTextContent(this.platform, postNode);

      console.log(
        `${PREFIX} [Audit] Post #${id} parsed: ${media.length} image(s), ${text.length} chars text, NativeLabel: ${hasNativeLabel}`
      );

      // 3. Inject initial Shadow DOM badge into post header
      let shadowRoot = null;

      if (media.length > 0 && ImageProv) {
        // Initial scanning indicator while asynchronous binary fetch & JUMBF scan run
        shadowRoot = Injector.injectBadge(anchor, {
          status: 'SCANNING',
          label: '🔍 AI: Auditing Media...'
        });

        try {
          const audit = await ImageProv.auditImageProvenance(media[0], postNode);
          console.log(`${PREFIX} [FR-01 Result] Post #${id}:`, audit);

          let finalStatus = 'INSUFFICIENT';
          let finalLabel = '⚪ No Provenance Found';

          if (audit.c2paStatus === 'VALID') {
            finalStatus = 'VERIFIED';
            finalLabel = audit.aiGenerator
              ? `🛡️ AI: Verified (${audit.aiGenerator})`
              : '🛡️ AI: Verified Provenance';
          } else if (audit.platformLabel) {
            // Platform "Made with AI" label present, but underlying C2PA was stripped or absent
            finalStatus = 'PLATFORM_TAG';
            finalLabel = '⚠️ AI: Platform Tagged';
          } else if (audit.c2paStatus === 'STRIPPED') {
            finalStatus = 'STRIPPED';
            finalLabel = '⚪ AI: Manifest Stripped';
          } else if (audit.c2paStatus === 'INVALID') {
            finalStatus = 'UNLABELED_AI';
            finalLabel = '🚨 AI: Tampered Manifest';
          }

          Injector.updateBadge(shadowRoot, {
            status: finalStatus,
            label: finalLabel
          });
        } catch (err) {
          console.error(`${PREFIX} [Error] Audit failed for Post #${id}:`, err);
          Injector.updateBadge(shadowRoot, {
            status: hasNativeLabel ? 'PLATFORM_TAG' : 'INSUFFICIENT',
            label: hasNativeLabel ? '⚠️ AI: Platform Tagged' : '⚪ Audit Error'
          });
        }
      } else {
        // Text-only or fallback post
        let initialStatus = 'INSUFFICIENT';
        let initialLabel = '⚪ No Provenance Found';

        if (hasNativeLabel) {
          initialStatus = 'PLATFORM_TAG';
          initialLabel = '⚠️ AI: Platform Tagged';
        } else if (text.length > 0) {
          initialStatus = text.length < 80 ? 'INSUFFICIENT' : 'VERIFIED';
          initialLabel = initialStatus === 'VERIFIED' ? '🛡️ AI: Verified Provenance' : '⚪ AI: Short Text';
        }

        shadowRoot = Injector.injectBadge(anchor, {
          status: initialStatus,
          label: initialLabel
        });
      }

      if (shadowRoot) {
        console.log(`${PREFIX} [Success] Badge successfully mounted for Post #${id}.`);
      }
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
