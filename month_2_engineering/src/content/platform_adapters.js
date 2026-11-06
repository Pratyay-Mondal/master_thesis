/**
 * platform_adapters.js
 * Resilient multi-strategy DOM selectors for Meta platforms
 * (Facebook Feed, Instagram Feed, and WhatsApp Web).
 *
 * Implements the Platform Adapter Pattern to isolate platform-specific
 * DOM variance from core inspection and compliance logic.
 *
 * Thesis: "AI Transparency in the Wild: Bridging Technical Provenance
 * and Legal Compliance under the EU AI Act on Social Media Platforms"
 */

import { PLATFORMS } from '../common/constants.js';

export class PlatformAdapters {
  /**
   * Identifies active platform based on hostname.
   * @returns {string} One of PLATFORMS enum
   */
  static detectPlatform() {
    const host = window.location.hostname.toLowerCase();
    if (host.includes('facebook.com')) return PLATFORMS.FACEBOOK;
    if (host.includes('instagram.com')) return PLATFORMS.INSTAGRAM;
    if (host.includes('whatsapp.com')) return PLATFORMS.WHATSAPP;
    return PLATFORMS.UNKNOWN;
  }

  /**
   * Multi-strategy post selectors.
   * Prioritizes ARIA roles and data attributes over volatile class names.
   */
  static getPostSelectors(platform) {
    switch (platform) {
      case PLATFORMS.FACEBOOK:
        return [
          'div[role="feed"] > div[role="article"]',
          'div[role="article"]',
          'div[data-pagelet^="FeedUnit_"]',
          'div[data-virtualized="false"][role="article"]'
        ];

      case PLATFORMS.INSTAGRAM:
        return [
          'main article',
          'article[role="presentation"]',
          'article._aatb',
          'div._aagv' // Single image container fallback
        ];

      case PLATFORMS.WHATSAPP:
        return [
          'div[role="row"] div.message-in',
          'div[role="row"] div.message-out',
          'div[data-id][role="row"]',
          'div.focusable-list-item'
        ];

      default:
        return ['article', 'div[role="article"]'];
    }
  }

  /**
   * Queries all uninspected post nodes currently in the DOM.
   * @param {string} platform 
   * @param {Element|Document} root 
   * @returns {Element[]}
   */
  static queryUninspectedPosts(platform, root = document) {
    const selectors = this.getPostSelectors(platform);
    const combinedSelector = selectors.join(', ');
    const candidates = Array.from(root.querySelectorAll(combinedSelector));

    // Filter out already processed nodes and nested duplicates
    return candidates.filter(el => {
      if (el.hasAttribute('data-ai-transparency-inspected')) return false;
      // Prevent selecting child articles inside an already selected parent article
      if (el.closest('[data-ai-transparency-inspected="true"]')) return false;
      return true;
    });
  }

  /**
   * Extracts media elements (<img>, <video>) associated with a post element.
   * @param {string} platform 
   * @param {Element} postElement 
   * @returns {HTMLImageElement[]}
   */
  static extractMediaElements(platform, postElement) {
    const images = Array.from(postElement.querySelectorAll('img'));
    
    // Filter out UI avatars, reaction icons, and tracking pixels (< 120px)
    return images.filter(img => {
      const src = img.currentSrc || img.src || '';
      if (!src || src.startsWith('data:image/svg')) return false;

      // Filter small icon dimensions
      const width = img.naturalWidth || img.clientWidth || img.width || 0;
      const height = img.naturalHeight || img.clientHeight || img.height || 0;

      // Profile pictures and emoji reactions are usually <= 50px
      if (width > 0 && width < 120) return false;
      if (height > 0 && height < 120) return false;

      return true;
    });
  }

  /**
   * Extracts primary text content from post.
   * Filters platform interface elements (Like, Share, Timestamp buttons).
   * @param {string} platform 
   * @param {Element} postElement 
   * @returns {string}
   */
  static extractTextContent(platform, postElement) {
    let textContainers = [];

    switch (platform) {
      case PLATFORMS.FACEBOOK:
        // FB user text is typically inside dir="auto" containers
        textContainers = Array.from(postElement.querySelectorAll('div[dir="auto"], span[dir="auto"]'));
        break;

      case PLATFORMS.INSTAGRAM:
        // IG caption is usually in h1 or span under the header
        textContainers = Array.from(postElement.querySelectorAll('h1, span._ap3a, div._a9zs'));
        break;

      case PLATFORMS.WHATSAPP:
        // WA message text spans
        textContainers = Array.from(postElement.querySelectorAll('span.selectable-text, span.copyable-text'));
        break;

      default:
        textContainers = Array.from(postElement.querySelectorAll('p, span[dir="auto"]'));
    }

    if (textContainers.length === 0) {
      // Fallback: entire text content stripped of extra whitespace
      return (postElement.innerText || '').trim();
    }

    // Join unique textual fragments
    const textFragments = textContainers
      .map(node => (node.innerText || '').trim())
      .filter(text => text.length > 0);

    return Array.from(new Set(textFragments)).join('\n');
  }

  /**
   * Locates the optimal container within a post to attach the UI badge.
   * @param {string} platform 
   * @param {Element} postElement 
   * @returns {Element}
   */
  static findBadgeAnchor(platform, postElement) {
    switch (platform) {
      case PLATFORMS.FACEBOOK: {
        // Try locating the top header row or user profile line
        const header = postElement.querySelector('div[data-ad-rendering-role="profile_name"]') ||
                       postElement.querySelector('h2, h3, h4') ||
                       postElement.firstElementChild;
        return header || postElement;
      }

      case PLATFORMS.INSTAGRAM: {
        // Try locating header section with username
        const header = postElement.querySelector('header') ||
                       postElement.querySelector('div._aagv') ||
                       postElement.firstElementChild;
        return header || postElement;
      }

      case PLATFORMS.WHATSAPP: {
        // Append inside message bubble
        const bubble = postElement.querySelector('div[class*="copyable-text"]') ||
                       postElement.firstElementChild;
        return bubble || postElement;
      }

      default:
        return postElement.firstElementChild || postElement;
    }
  }

  /**
   * Detects platform-level "Made with AI" labels natively present in DOM.
   * @param {string} platform 
   * @param {Element} postElement 
   * @returns {boolean}
   */
  static detectPlatformNativeLabel(platform, postElement) {
    const text = (postElement.innerText || '').toLowerCase();
    const ariaLabels = Array.from(postElement.querySelectorAll('[aria-label]'))
      .map(el => el.getAttribute('aria-label').toLowerCase())
      .join(' ');

    const combinedText = `${text} ${ariaLabels}`;
    
    // Meta standardized label keywords
    const indicators = [
      'made with ai',
      'mit ki erstellt',
      'creado con ia',
      'créé avec l’ia',
      'ai info',
      'ki-info'
    ];

    return indicators.some(indicator => combinedText.includes(indicator));
  }
}

