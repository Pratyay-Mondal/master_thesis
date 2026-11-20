/**
 * text_extractor.js
 * Semantic Post Text Extraction & Boilerplate Normalization (FR-02).
 *
 * Safely extracts core post captions, articles, and messages from Meta's
 * dynamic React DOM (Facebook, Instagram, WhatsApp) while stripping platform
 * chrome, navigation controls, timestamps, and user handles.
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
    root.AITransparency.TextExtractor = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  'use strict';

  const EXCLUDED_ANCESTOR_SELECTOR = [
    '.ai-transparency-badge-host',
    'header',
    'nav',
    'footer',
    'button',
    '[role="button"]',
    'form',
    'time',
    '[contenteditable="true"]',
    '[data-ad-rendering-role="profile_name"]',
    '[data-testid="msg-meta"]'
  ].join(', ');

  const BOILERPLATE_PATTERNS = [
    // Engagement & UI chrome (EN / DE / ES / FR)
    /^(like|comment|share|reply|send|follow|following|see more|see less|more|view all \d+ comments?|write a comment\.{0,3}|hide|save|report)$/i,
    /^(gefällt mir|kommentieren|teilen|antworten|senden|folgen|mehr anzeigen|weniger anzeigen)$/i,
    /^(me gusta|comentar|compartir|responder|ver más)$/i,
    /^(j’aime|j'aime|commenter|partager|répondre|voir plus)$/i,

    // Relative & clock timestamps
    /^(\d+\s*(s|sec|secs|m|min|mins|h|hr|hrs|d|w|y)|just now|yesterday|today|gestern|heute)$/i,
    /^(yesterday|today|gestern|heute)?\s*(at\s*)?\d{1,2}:\d{2}(\s*(am|pm))?$/i,
    /^\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*(\s+\d{4})?(\s+at\s+\d{1,2}:\d{2})?$/i,

    // Engagement counts & metrics
    /^\d+([.,]\d+)?\s*[km]?\s*(likes?|comments?|shares?|views?|reactions?|replies?|kommentare|geteilt)$/i,
    /^\d+([.,]\d+)?\s*[km]?$/i,

    // Platform native AI tags (already tracked separately via detectPlatformNativeLabel)
    /^(?:🤖\s*)?(made with ai|mit ki erstellt|creado con ia|créé avec l[’']ia|ai[\s\-_/:]*info|ki[\s\-_/:]*info)$/i,

    // Isolated @handles
    /^@[a-z0-9._-]{2,}$/i
  ];

  class TextExtractor {
    /**
     * Returns platform-specific semantic selectors targeting post body text.
     * @param {string} platform
     * @returns {string[]}
     */
    static getTextSelectors(platform) {
      switch ((platform || '').toLowerCase()) {
        case 'facebook':
          return [
            '[data-ad-preview="message"]',
            '[data-ad-comet-preview="message"]',
            '.content[dir="auto"]',
            'div[dir="auto"]',
            'span[dir="auto"]'
          ];

        case 'instagram':
          return [
            '._a9zs',
            '.caption',
            'span._ap3a',
            'span._aacl',
            'div[class*="caption"]',
            'article p',
            'p'
          ];

        case 'whatsapp':
          return [
            'span.selectable-text',
            'span.copyable-text',
            'div.copyable-text span'
          ];

        default:
          return ['[data-ad-preview="message"]', 'article p', 'div[dir="auto"]', 'p'];
      }
    }

    /**
     * Checks whether a DOM node lies inside an excluded UI region
     * (buttons, headers, timestamps, forms, or our own Shadow DOM host).
     * @param {Element} node
     * @param {Element} postRoot
     * @returns {boolean}
     */
    static isExcludedNode(node, postRoot) {
      if (!node || typeof node.closest !== 'function') return false;
      const excluded = node.closest(EXCLUDED_ANCESTOR_SELECTOR);
      if (!excluded) return false;
      // Only exclude if the matched ancestor is inside (or equal to) the postRoot
      return excluded === postRoot || postRoot.contains(excluded);
    }

    /**
     * Filters out nested child nodes if an ancestor candidate is already selected,
     * preventing duplicate text concatenation in React's nested div/span trees.
     * @param {Element[]} nodes
     * @returns {Element[]}
     */
    static filterOutNestedNodes(nodes) {
      return nodes.filter((node, idx) => {
        for (let i = 0; i < nodes.length; i++) {
          if (
            i !== idx &&
            typeof nodes[i].contains === 'function' &&
            nodes[i].contains(node)
          ) {
            return false;
          }
        }
        return true;
      });
    }

    /**
     * Reads visible text from an element safely across browser DOM and mock environments.
     * Automatically strips author username handles if embedded inside captions.
     * @param {Element} el
     * @returns {string}
     */
    static readNodeText(el) {
      if (!el) return '';

      // Clone element so we can safely strip author handles without mutating the live DOM
      if (typeof el.cloneNode === 'function') {
        const clone = el.cloneNode(true);
        if (typeof clone.querySelectorAll === 'function') {
          const handles = clone.querySelectorAll(
            '.caption-username, [data-ad-rendering-role="profile_name"], a[role="link"][tabindex="0"]'
          );
          for (const h of handles) {
            h.remove();
          }
        }
        let text = typeof clone.innerText === 'string' && clone.innerText.length > 0
          ? clone.innerText
          : (clone.textContent || '');

        return text.trim();
      }

      // Fallback if cloneNode is unavailable (e.g. lightweight test mock)
      let text = typeof el.innerText === 'string' && el.innerText.length > 0
        ? el.innerText
        : (el.textContent || '');

      // Strip leading username if element has .caption-username child
      if (typeof el.querySelector === 'function') {
        const uNode = el.querySelector('.caption-username, [data-ad-rendering-role="profile_name"]');
        if (uNode) {
          const uText = (uNode.innerText || uNode.textContent || '').trim();
          if (uText && text.startsWith(uText)) {
            text = text.slice(uText.length).trim();
          }
        }
      }

      return text.trim();
    }

    /**
     * Checks whether an individual line is platform UI boilerplate.
     * @param {string} line
     * @returns {boolean}
     */
    static isBoilerplateLine(line) {
      const cleaned = line.trim();
      if (!cleaned) return true;
      return BOILERPLATE_PATTERNS.some((pattern) => pattern.test(cleaned));
    }

    /**
     * Normalizes extracted text: removes invisible zero-width characters,
     * filters boilerplate lines, and collapses redundant whitespace.
     * @param {string} rawText
     * @returns {string}
     */
    static normalizeText(rawText) {
      if (!rawText || typeof rawText !== 'string') return '';

      // Strip zero-width joiners/spaces & soft hyphens used by scrapers/CDNs
      const stripped = rawText
        .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '')
        .replace(/\r\n?/g, '\n');

      const lines = stripped
        .split('\n')
        .map((line) => line.replace(/[ \t]+/g, ' ').trim())
        .filter((line) => !this.isBoilerplateLine(line));

      // Deduplicate consecutive identical lines while preserving genuine paragraph breaks
      const deduped = [];
      for (const line of lines) {
        if (deduped.length === 0 || deduped[deduped.length - 1] !== line) {
          deduped.push(line);
        }
      }

      return deduped.join('\n').trim();
    }

    /**
     * Extracts and normalizes core caption/post text from a social media post container.
     *
     * @param {string} platform - Platform identifier ('facebook' | 'instagram' | 'whatsapp' | 'unknown')
     * @param {Element} postContainerElement - Root DOM container for the post
     * @returns {string} Cleaned, normalized core post text
     */
    static extractPostText(platform, postContainerElement) {
      if (!postContainerElement || typeof postContainerElement.querySelectorAll !== 'function') {
        return '';
      }

      const selectors = this.getTextSelectors(platform);
      const combinedSelector = selectors.join(', ');

      let candidates = [];
      try {
        candidates = Array.from(postContainerElement.querySelectorAll(combinedSelector));
      } catch (err) {
        console.warn('[AI-Transparency-Validator] [TextExtractor] Selector error:', err.message);
      }

      // Exclude headers, interactive buttons, timestamps, and injected badges
      candidates = candidates.filter((node) => !this.isExcludedNode(node, postContainerElement));

      // Remove nested descendants to avoid reading the same paragraph twice
      const leafCandidates = this.filterOutNestedNodes(candidates);

      if (leafCandidates.length > 0) {
        const extractedBlocks = leafCandidates
          .map((node) => this.normalizeText(this.readNodeText(node)))
          .filter((block) => block.length > 0);

        const uniqueBlocks = Array.from(new Set(extractedBlocks));
        const joined = uniqueBlocks.join('\n').trim();
        if (joined.length > 0) {
          return joined;
        }
      }

      // Fallback: inspect direct children outside excluded UI regions
      if (postContainerElement.children && postContainerElement.children.length > 0) {
        const fallbackBlocks = Array.from(postContainerElement.children)
          .filter((child) => !this.isExcludedNode(child, postContainerElement))
          .map((child) => this.normalizeText(this.readNodeText(child)))
          .filter((block) => block.length > 0);

        return Array.from(new Set(fallbackBlocks)).join('\n').trim();
      }

      return this.normalizeText(this.readNodeText(postContainerElement));
    }
  }

  return TextExtractor;
});

