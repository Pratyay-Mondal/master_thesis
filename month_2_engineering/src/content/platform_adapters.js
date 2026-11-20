/**
 * platform_adapters.js
 * Resilient Semantic ARIA & Data Attribute Selectors for Meta Platforms.
 *
 * Designed specifically for Meta's dynamic React Virtual DOM:
 * - Scrambled utility classes (e.g., .x1yzt...) are strictly avoided.
 * - Prioritizes W3C Semantic ARIA roles (`role="article"`, `role="feed"`, `role="row"`).
 * - Implements platform-specific `getAnchorElement()` for safe UI badge insertion.
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
    const adapters = factory();
    root.AITransparency.PlatformAdapters = adapters;
    root.AITransparency.InstagramAdapter = adapters.InstagramAdapter;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  'use strict';

  const PLATFORMS = {
    FACEBOOK: 'facebook',
    INSTAGRAM: 'instagram',
    WHATSAPP: 'whatsapp',
    UNKNOWN: 'unknown'
  };

  class PlatformAdapters {
    /**
     * Determines the active social media platform based on DOM dataset or window.location.href.
     * Order of precedence:
     * 1. Explicit document.body.dataset.platform (e.g. data-platform="instagram|facebook|whatsapp")
     * 2. Full window.location.href string matching 'instagram', 'facebook', 'whatsapp' (supports localhost & file://)
     * 3. Fallback for localhost or 127.0.0.1 development servers
     *
     * @returns {string} One of PLATFORMS enum
     */
    static detectPlatform() {
      // 1. Check explicit DOM override on body (supports mock pages & test harnesses)
      if (typeof document !== 'undefined' && document.body && document.body.dataset && document.body.dataset.platform) {
        const bodyPlatform = String(document.body.dataset.platform).toLowerCase().trim();
        if (bodyPlatform === 'instagram' || bodyPlatform === PLATFORMS.INSTAGRAM) {
          return PLATFORMS.INSTAGRAM;
        }
        if (bodyPlatform === 'facebook' || bodyPlatform === PLATFORMS.FACEBOOK) {
          return PLATFORMS.FACEBOOK;
        }
        if (bodyPlatform === 'whatsapp' || bodyPlatform === PLATFORMS.WHATSAPP) {
          return PLATFORMS.WHATSAPP;
        }
      }

      // 2. Inspect full window.location.href string (matches live domains, pathnames, and mock filenames)
      const loc = typeof window !== 'undefined' && window.location ? window.location : null;
      const href = (loc?.href || '').toLowerCase();
      const host = (loc?.hostname || '').toLowerCase();

      if (href.includes('instagram')) {
        return PLATFORMS.INSTAGRAM;
      }
      if (href.includes('facebook')) {
        return PLATFORMS.FACEBOOK;
      }
      if (href.includes('whatsapp')) {
        return PLATFORMS.WHATSAPP;
      }

      // 3. Fallback for generic localhost or 127.0.0.1 development servers without platform in URL
      if (host === 'localhost' || host === '127.0.0.1' || host === '' || href.startsWith('file:')) {
        return PLATFORMS.FACEBOOK;
      }

      return PLATFORMS.UNKNOWN;
    }

    /**
     * Returns robust ARIA and semantic selectors for post containers.
     * React's Virtual DOM constantly recycles class names, but ARIA roles
     * remain constant for accessibility compliance.
     * @param {string} platform
     * @returns {string[]} List of valid CSS selectors
     */
    static getPostSelectors(platform) {
      switch (platform) {
        case PLATFORMS.FACEBOOK:
          return [
            // Standard Facebook Feed articles
            'div[role="feed"] div[role="article"]',
            'div[role="article"]',
            // Data-pagelet identifiers used in FB web
            'div[data-pagelet^="FeedUnit"]',
            'div[data-virtualized="false"][role="article"]'
          ];

        case PLATFORMS.INSTAGRAM:
          return [
            // Standard and mock Instagram post containers
            'article',
            '[role="article"]',
            'div[role="article"]',
            'article[role="presentation"]',
            'main article',
            // Standalone modal / post detail view
            'div[role="dialog"] article',
            // Image card presentation wrapper fallback
            'div._aagv'
          ];

        case PLATFORMS.WHATSAPP:
          return [
            // Canonical message bubble elements in WhatsApp Web
            'div[role="row"] div.message-in',
            'div[role="row"] div.message-out',
            'div.message-in',
            'div.message-out',
            // Fallback for standalone virtualized rows that lack inner bubble wrappers
            'div[data-id][role="row"]',
            'div[role="row"]'
          ];

        default:
          return ['article', 'div[role="article"]', '[data-pagelet]'];
      }
    }

    /**
     * Finds all unprocessed post elements in the DOM.
     * Ensures we do not select nested elements or already processed nodes.
     * Performs intra-batch deduplication so parent rows containing child message bubbles
     * are dropped in favor of the canonical bubble element.
     *
     * @param {string} platform
     * @param {Element|Document} rootNode
     * @returns {Element[]}
     */
    static queryUninspectedPosts(platform, rootNode = (typeof document !== 'undefined' ? document : null)) {
      if (!rootNode || typeof rootNode.querySelectorAll !== 'function') {
        return [];
      }

      const selectors = this.getPostSelectors(platform);
      const combined = selectors.join(', ');
      let candidates = [];

      try {
        candidates = Array.from(rootNode.querySelectorAll(combined));
      } catch (e) {
        console.error('[AI-Transparency-Validator] [Adapter] QuerySelector error:', e);
        return [];
      }

      // If the rootNode itself matches the selector, include it
      const hasDoc = typeof document !== 'undefined';
      if ((!hasDoc || rootNode !== document) && rootNode.matches && rootNode.matches(combined)) {
        candidates.unshift(rootNode);
      }

      // 1. Deduplicate references
      candidates = Array.from(new Set(candidates));

      // 2. Filter out already flagged (inspected or queued) elements or children of flagged elements
      candidates = candidates.filter((el) => {
        // Skip if already flagged
        if (
          el.hasAttribute('data-ai-transparency-inspected') ||
          el.hasAttribute('data-ai-transparency-queued') ||
          el.getAttribute('data-ai-transparency-inspected') === 'true' ||
          el.getAttribute('data-ai-transparency-queued') === 'true'
        ) {
          return false;
        }

        // Skip if nested inside an already flagged parent post or row
        if (
          el.parentElement &&
          typeof el.parentElement.closest === 'function' &&
          el.parentElement.closest('[data-ai-transparency-inspected="true"], [data-ai-transparency-queued="true"]')
        ) {
          return false;
        }

        // Must have non-zero layout or children (filters dead virtual DOM stubs)
        if (el.childNodes && el.childNodes.length === 0) return false;

        return true;
      });

      // 3. Intra-batch ancestor/descendant deduplication:
      // If candidate A contains candidate B (e.g. div[role="row"] contains div.message-in),
      // drop the outer ancestor so only the canonical message bubble receives the badge!
      if (candidates.length > 1) {
        candidates = candidates.filter((el) => {
          const containsAnotherCandidate = candidates.some(
            (other) => other !== el && typeof el.contains === 'function' && el.contains(other)
          );
          return !containsAnotherCandidate;
        });
      }

      return candidates;
    }

    /**
     * Locates a safe, visible insertion point for the UI badge within the post.
     * React aggressively reconciles children, so attaching directly to the
     * top-level header or author profile line ensures the badge stays visible.
     * @param {string} platform
     * @param {Element} postNode
     * @returns {Element} Safe anchor element
     */
    static getAnchorElement(platform, postNode) {
      if (!postNode) return null;

      switch (platform) {
        case PLATFORMS.FACEBOOK: {
          // 1. Author header row / profile name
          const profileAnchor =
            postNode.querySelector('h2') ||
            postNode.querySelector('h3') ||
            postNode.querySelector('h4') ||
            postNode.querySelector('[data-ad-rendering-role="profile_name"]') ||
            postNode.querySelector('div[dir="auto"] strong');

          if (profileAnchor && profileAnchor.parentElement) {
            return profileAnchor.parentElement;
          }

          // 2. Top-most visible header container inside the article
          const headerContainer = postNode.querySelector('div[class*="header"]') || postNode.firstElementChild;
          return headerContainer || postNode;
        }

        case PLATFORMS.INSTAGRAM: {
          // 1. Post top header container (header, .post-header, or first child)
          const header =
            postNode.querySelector('header, .post-header, div[class*="header"]') ||
            postNode.querySelector('header') ||
            postNode.firstElementChild;

          if (header) {
            return header;
          }

          // 2. Standalone image container fallback
          const imageContainer = postNode.querySelector('div._aagv') || postNode.querySelector('div[role="button"]');
          if (imageContainer) {
            return imageContainer;
          }

          // 3. Guaranteed non-null fallback to post node itself
          return postNode;
        }

        case PLATFORMS.WHATSAPP: {
          // If postNode is already a message bubble, use it directly as the anchor
          if (
            postNode.classList &&
            (postNode.classList.contains('message-in') || postNode.classList.contains('message-out'))
          ) {
            return postNode;
          }

          // Locate inner message bubble if postNode is an outer row
          const bubble =
            postNode.querySelector('div.message-in') ||
            postNode.querySelector('div.message-out') ||
            postNode.querySelector('div.copyable-text');

          return bubble || postNode.firstElementChild || postNode;
        }

        default:
          return postNode.querySelector('header') || postNode.firstElementChild || postNode;
      }
    }

    /**
     * Extracts all relevant media image elements from a post.
     * Filters out avatars, smileys, and tracking pixels (< 100px).
     * @param {string} platform
     * @param {Element} postNode
     * @returns {HTMLImageElement[]}
     */
    static extractMediaElements(platform, postNode) {
      const imgs = Array.from(postNode.querySelectorAll('img'));
      return imgs.filter((img) => {
        const src = img.currentSrc || img.src || '';
        if (!src || src.startsWith('data:image/svg')) return false;

        // Skip user profile icons and tiny reaction icons
        const w = img.naturalWidth || img.clientWidth || img.width || 0;
        const h = img.naturalHeight || img.clientHeight || img.height || 0;
        if (w > 0 && w < 100) return false;
        if (h > 0 && h < 100) return false;

        return true;
      });
    }

    /**
     * Extracts the primary text content (caption or message).
     * @param {string} platform
     * @param {Element} postNode
     * @returns {string}
     */
    static extractTextContent(platform, postNode) {
      let textNodes = [];

      switch (platform) {
        case PLATFORMS.FACEBOOK:
          textNodes = Array.from(postNode.querySelectorAll('div[dir="auto"], span[dir="auto"]'));
          break;
        case PLATFORMS.INSTAGRAM:
          textNodes = Array.from(postNode.querySelectorAll('h1, span._ap3a, div._a9zs, span._aacl'));
          break;
        case PLATFORMS.WHATSAPP:
          textNodes = Array.from(postNode.querySelectorAll('span.selectable-text, span.copyable-text'));
          break;
        default:
          textNodes = Array.from(postNode.querySelectorAll('p, div[dir="auto"]'));
      }

      if (textNodes.length === 0) {
        return (postNode.innerText || '').trim();
      }

      const rawStrings = textNodes.map((n) => (n.innerText || '').trim()).filter((s) => s.length > 0);
      return Array.from(new Set(rawStrings)).join('\n');
    }

    /**
     * Detects if the platform itself already rendered an AI label (e.g., "AI info", "Made with AI", "KI-Info").
     * Inspects post headers, sub-headers, spans, links, and ARIA/title attributes across locales.
     *
     * @param {string} platform
     * @param {Element} postNode
     * @returns {boolean}
     */
    static detectPlatformNativeLabel(platform, postNode) {
      if (!postNode) return false;

      const text = `${postNode.innerText || ''} ${postNode.textContent || ''}`.toLowerCase();

      let attrParts = [];
      if (typeof postNode.getAttribute === 'function') {
        const selfAria = postNode.getAttribute('aria-label');
        if (selfAria) attrParts.push(selfAria);
        const selfTitle = postNode.getAttribute('title');
        if (selfTitle) attrParts.push(selfTitle);
      }

      if (typeof postNode.querySelectorAll === 'function') {
        const attrElements = postNode.querySelectorAll(
          '[aria-label], [title], [aria-description], a[href*="ai_info"], a[href*="ki_info"], .ig-ai-tag, [class*="ai-tag"]'
        );
        for (const el of attrElements) {
          if (el.getAttribute) {
            const aLabel = el.getAttribute('aria-label');
            if (aLabel) attrParts.push(aLabel);
            const title = el.getAttribute('title');
            if (title) attrParts.push(title);
            const aDesc = el.getAttribute('aria-description');
            if (aDesc) attrParts.push(aDesc);
            const href = el.getAttribute('href');
            if (href && (href.includes('ai_info') || href.includes('ki_info'))) {
              attrParts.push('ai info');
            }
          }
          if (el.innerText) {
            attrParts.push(el.innerText);
          }
        }
      }

      const combined = `${text} ${attrParts.join(' ')}`.toLowerCase();

      // Multilingual patterns with word boundaries matching Meta's label terminology updates:
      // "AI info", "AI-Info", "Made with AI", German "KI-Info", "Mit KI erstellt", Spanish/French variants
      const patterns = [
        /(?:🤖|✨)?\s*ai[\s\-_/:]*info\b/i,
        /(?:🤖|✨)?\s*ki[\s\-_/:]*info\b/i,
        /\bmade\s+with\s+ai\b/i,
        /\bmit\s+ki\s+erstellt\b/i,
        /\bgeneriert\s+mit\s+ki\b/i,
        /\b(?:info\s+(?:sobre\s+)?ia|creado\s+con\s+ia)\b/i,
        /\b(?:info\s+ia|créé\s+avec\s+(?:l’|l')?ia)\b/i,
        /\bai\s+generated\b/i,
        /\bgenerated\s+with\s+ai\b/i
      ];

      return patterns.some((p) => p.test(combined));
    }

    /**
     * Ergonomic helper method matching testbed conventions.
     * @param {Element} postNode
     * @returns {boolean}
     */
    static hasNativeLabel(postNode) {
      return this.detectPlatformNativeLabel(PLATFORMS.INSTAGRAM, postNode);
    }
  }

  const InstagramAdapter = {
    getAnchorElement: (postNode) => PlatformAdapters.getAnchorElement(PLATFORMS.INSTAGRAM, postNode),
    hasNativeLabel: (postNode) => PlatformAdapters.detectPlatformNativeLabel(PLATFORMS.INSTAGRAM, postNode),
    getPostSelectors: () => PlatformAdapters.getPostSelectors(PLATFORMS.INSTAGRAM),
    extractMediaElements: (postNode) => PlatformAdapters.extractMediaElements(PLATFORMS.INSTAGRAM, postNode),
    extractTextContent: (postNode) => PlatformAdapters.extractTextContent(PLATFORMS.INSTAGRAM, postNode)
  };

  PlatformAdapters.InstagramAdapter = InstagramAdapter;
  PlatformAdapters.PLATFORMS = PLATFORMS;

  if (typeof root !== 'undefined') {
    root.AITransparency = root.AITransparency || {};
    root.AITransparency.InstagramAdapter = InstagramAdapter;
  }

  return PlatformAdapters;
});
