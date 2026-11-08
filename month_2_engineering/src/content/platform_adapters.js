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
    root.AITransparency.PlatformAdapters = factory();
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
     * Determines the active social media platform based on window.location.
     * Also detects local mock HTML files (e.g. facebook_mock.html).
     * @returns {string} One of PLATFORMS enum
     */
    static detectPlatform() {
      const href = (window.location.href || '').toLowerCase();
      const host = (window.location.hostname || '').toLowerCase();

      if (host.includes('facebook.com') || href.includes('facebook_mock')) {
        return PLATFORMS.FACEBOOK;
      }
      if (host.includes('instagram.com') || href.includes('instagram_mock')) {
        return PLATFORMS.INSTAGRAM;
      }
      if (host.includes('whatsapp.com') || href.includes('whatsapp_mock')) {
        return PLATFORMS.WHATSAPP;
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
            // Standard Instagram Feed articles
            'main article',
            'article[role="presentation"]',
            'article',
            // Standalone modal / post detail view
            'div[role="dialog"] article',
            // Image card presentation wrapper fallback
            'div._aagv'
          ];

        case PLATFORMS.WHATSAPP:
          return [
            // Messages are rendered as role="row" in WhatsApp Web's virtual list
            'div[role="application"] div[role="row"]',
            'div[role="row"] div.message-in',
            'div[role="row"] div.message-out',
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
     * @param {string} platform
     * @param {Element|Document} rootNode
     * @returns {Element[]}
     */
    static queryUninspectedPosts(platform, rootNode = document) {
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
      if (rootNode !== document && rootNode.matches && rootNode.matches(combined)) {
        candidates.unshift(rootNode);
      }

      return candidates.filter((el) => {
        // Skip if already flagged
        if (el.hasAttribute('data-ai-transparency-inspected')) return false;

        // Skip if nested inside an already flagged parent post
        if (el.parentElement && el.parentElement.closest('[data-ai-transparency-inspected="true"]')) {
          return false;
        }

        // Must have non-zero layout or children (filters dead virtual DOM stubs)
        if (el.childNodes.length === 0) return false;

        return true;
      });
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
          // 1. Instagram header bar containing username and avatar
          const igHeader = postNode.querySelector('header');
          if (igHeader) {
            // Find the username container inside the header
            const userBar = igHeader.querySelector('div[class*="user"]') || igHeader.firstElementChild;
            return userBar || igHeader;
          }

          // 2. Standalone image container fallback
          const imageContainer = postNode.querySelector('div._aagv') || postNode.querySelector('div[role="button"]');
          if (imageContainer) {
            return imageContainer;
          }

          return postNode.firstElementChild || postNode;
        }

        case PLATFORMS.WHATSAPP: {
          // 1. WhatsApp message bubble text or action bar
          const bubble =
            postNode.querySelector('div.copyable-text') ||
            postNode.querySelector('div.message-in') ||
            postNode.querySelector('div.message-out') ||
            postNode.querySelector('span.selectable-text');

          if (bubble && bubble.parentElement) {
            return bubble.parentElement;
          }

          return postNode.firstElementChild || postNode;
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
     * Detects if the platform itself already rendered an AI label (e.g., "Made with AI").
     * @param {string} platform
     * @param {Element} postNode
     * @returns {boolean}
     */
    static detectPlatformNativeLabel(platform, postNode) {
      const text = (postNode.innerText || '').toLowerCase();
      const aria = Array.from(postNode.querySelectorAll('[aria-label]'))
        .map((el) => el.getAttribute('aria-label').toLowerCase())
        .join(' ');
      const combined = `${text} ${aria}`;

      const keywords = ['made with ai', 'mit ki erstellt', 'creado con ia', 'créé avec l’ia', 'ai info', 'ki-info'];
      return keywords.some((k) => combined.includes(k));
    }
  }

  PlatformAdapters.PLATFORMS = PLATFORMS;
  return PlatformAdapters;
});
