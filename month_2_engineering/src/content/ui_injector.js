/**
 * ui_injector.js
 * Isolated Shadow DOM UI Badge Injector for Social Media Feeds.
 *
 * Utilizes W3C Shadow DOM v1 (`mode: 'open'`) to completely insulate
 * transparency badges from Meta's global stylesheets and CSS resets.
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
    root.AITransparency.UIInjector = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  'use strict';

  const CONTAINER_CLASS = 'ai-transparency-badge-host';

  const BADGE_STATUSES = {
    VERIFIED: {
      key: 'VERIFIED',
      label: '🛡️ AI: Verified Provenance',
      bg: '#057a55',
      border: '#0e9f6e',
      text: '#ffffff',
      glow: 'rgba(5, 122, 85, 0.45)',
      description: 'C2PA cryptographic manifest or statistical watermark verified.'
    },
    PLATFORM_TAG: {
      key: 'PLATFORM_TAG',
      label: '⚠️ AI: Platform Tagged',
      bg: '#b43403',
      border: '#d97706',
      text: '#ffffff',
      glow: 'rgba(217, 119, 6, 0.45)',
      description: 'Platform "Made with AI" label present; underlying manifest stripped by CDN.'
    },
    STRIPPED: {
      key: 'STRIPPED',
      label: '⚪ AI: Manifest Stripped',
      bg: '#374151',
      border: '#6b7280',
      text: '#f9fafb',
      glow: 'rgba(107, 114, 128, 0.3)',
      description: 'Image binary contains no surviving C2PA JUMBF metadata (CDN ingestion pipeline destroyed provenance).'
    },
    UNLABELED_AI: {
      key: 'UNLABELED_AI',
      label: '🚨 AI: Undisclosed Synthetic Media',
      bg: '#c81e1e',
      border: '#e02424',
      text: '#ffffff',
      glow: 'rgba(224, 36, 36, 0.55)',
      description: 'Synthetic signal detected without required Article 50(4) deployer disclosure.'
    },
    SCANNING: {
      key: 'SCANNING',
      label: '🔍 AI: Provenance Auditing...',
      bg: '#1c64f2',
      border: '#3f83f8',
      text: '#ffffff',
      glow: 'rgba(63, 131, 248, 0.45)',
      description: 'Inspecting C2PA JUMBF headers and statistical text entropy.'
    },
    INSUFFICIENT: {
      key: 'INSUFFICIENT',
      label: '⚪ AI: Inconclusive / Short',
      bg: '#374151',
      border: '#4b5563',
      text: '#f9fafb',
      glow: 'rgba(75, 85, 99, 0.3)',
      description: 'Content length is below threshold (T < 50 tokens) for reliable detection.'
    }
  };

  class UIInjector {
    /**
     * Primary injection function.
     * Attaches an isolated Shadow Root to the anchor element and renders a high-visibility badge.
     * @param {Element} anchorElement - DOM node inside post header
     * @param {string|Object} status - Status key or configuration object
     * @returns {ShadowRoot|null} Injected shadow root
     */
    static injectBadge(anchorElement, status = 'SCANNING') {
      if (!anchorElement) {
        console.warn('[AI-Transparency-Validator] [Injector] No valid anchor element provided.');
        return null;
      }

      // Check if host already exists on this anchor
      let host = anchorElement.querySelector(`.${CONTAINER_CLASS}`);
      if (host && host.shadowRoot) {
        this.updateBadge(host.shadowRoot, status);
        return host.shadowRoot;
      }

      try {
        // Create host container in light DOM
        host = document.createElement('div');
        host.className = CONTAINER_CLASS;
        host.setAttribute('role', 'region');
        host.setAttribute('aria-label', 'EU AI Act Article 50 Transparency Indicator');

        // Style the host container itself to avoid breaking parent layout
        host.style.all = 'initial';
        host.style.display = 'inline-block';
        host.style.margin = '4px 8px';
        host.style.verticalAlign = 'middle';
        host.style.zIndex = '9999';

        // Attach open Shadow Root
        const shadowRoot = host.attachShadow({ mode: 'open' });

        // Add isolated stylesheet
        const style = document.createElement('style');
        style.textContent = this.getEncapsulatedStyles();
        shadowRoot.appendChild(style);

        // Build badge pill element
        const badgeWrapper = document.createElement('div');
        badgeWrapper.className = 'ai-badge-wrapper';
        shadowRoot.appendChild(badgeWrapper);

        // Initial render
        this.renderBadgeContent(badgeWrapper, shadowRoot, status);

        // Insert host safely into anchor
        if (anchorElement.firstChild) {
          anchorElement.insertBefore(host, anchorElement.firstChild);
        } else {
          anchorElement.appendChild(host);
        }

        console.log('[AI-Transparency-Validator] [Injector] Successfully injected badge into anchor:', anchorElement);
        return shadowRoot;
      } catch (err) {
        console.error('[AI-Transparency-Validator] [Injector] Error injecting Shadow DOM badge:', err);
        return null;
      }
    }

    /**
     * Updates an existing badge in the Shadow DOM.
     * @param {ShadowRoot} shadowRoot
     * @param {string|Object} status
     */
    static updateBadge(shadowRoot, status) {
      if (!shadowRoot) return;
      const badgeWrapper = shadowRoot.querySelector('.ai-badge-wrapper');
      if (badgeWrapper) {
        this.renderBadgeContent(badgeWrapper, shadowRoot, status);
      }
    }

    /**
     * Internal renderer for badge content and event bindings.
     */
    static renderBadgeContent(badgeWrapper, shadowRoot, statusInput) {
      const statusKey = typeof statusInput === 'string' ? statusInput : statusInput.status || 'SCANNING';
      const cfg = BADGE_STATUSES[statusKey] || BADGE_STATUSES.SCANNING;
      const customLabel = typeof statusInput === 'object' && statusInput.label ? statusInput.label : cfg.label;

      badgeWrapper.innerHTML = `
        <button class="ai-badge-pill" type="button" aria-haspopup="dialog" style="
          background: ${cfg.bg};
          border: 1.5px solid ${cfg.border};
          color: ${cfg.text};
          box-shadow: 0 0 8px ${cfg.glow};
        ">
          <span class="ai-badge-text">${customLabel}</span>
        </button>
      `;

      const button = badgeWrapper.querySelector('.ai-badge-pill');
      button.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.toggleAuditDrawer(shadowRoot, cfg);
      };
    }

    /**
     * Toggles an interactive audit drawer inside the Shadow DOM.
     */
    static toggleAuditDrawer(shadowRoot, cfg) {
      let drawer = shadowRoot.querySelector('.ai-audit-drawer');
      if (drawer) {
        drawer.classList.toggle('active');
        return;
      }

      drawer = document.createElement('div');
      drawer.className = 'ai-audit-drawer active';
      drawer.innerHTML = `
        <div class="drawer-header">
          <span class="drawer-title">EU AI Act Art. 50 Provenance Audit</span>
          <button class="drawer-close" type="button">&times;</button>
        </div>
        <div class="drawer-body">
          <div class="audit-row">
            <span class="row-tag">Status:</span>
            <span class="row-info" style="color: ${cfg.border}">${cfg.key}</span>
          </div>
          <div class="audit-row">
            <span class="row-tag">Assessment:</span>
            <span class="row-info">${cfg.description}</span>
          </div>
          <div class="audit-row">
            <span class="row-tag">Article 50(2):</span>
            <span class="row-info">Machine-Readable Check Completed</span>
          </div>
          <div class="audit-row">
            <span class="row-tag">Article 50(5):</span>
            <span class="row-info">Active (Client-Side Shadow DOM Overlay)</span>
          </div>
        </div>
        <div class="drawer-footer">
          THWS Master's Thesis Prototype · AI Transparency & Provenance Validator
        </div>
      `;

      drawer.querySelector('.drawer-close').onclick = (e) => {
        e.stopPropagation();
        drawer.classList.remove('active');
      };

      shadowRoot.appendChild(drawer);
    }

    /**
     * Complete encapsulated styles.
     * Utilizes `all: initial` to eliminate CSS bleed from Facebook, Instagram, or WhatsApp.
     */
    static getEncapsulatedStyles() {
      return `
        :host {
          all: initial;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          font-size: 12px;
          line-height: 1.2;
          display: inline-block;
          position: relative;
        }

        .ai-badge-wrapper {
          display: inline-flex;
          align-items: center;
        }

        .ai-badge-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.3px;
          cursor: pointer;
          outline: none;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
          user-select: none;
        }

        .ai-badge-pill:hover {
          transform: translateY(-1px) scale(1.02);
          filter: brightness(1.1);
        }

        .ai-badge-pill:active {
          transform: translateY(0);
        }

        .ai-badge-text {
          white-space: nowrap;
        }

        /* Audit Drawer Window */
        .ai-audit-drawer {
          display: none;
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          width: 300px;
          background: #111827;
          border: 1px solid #374151;
          border-radius: 8px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.4);
          z-index: 999999;
          padding: 12px;
          color: #f9fafb;
          box-sizing: border-box;
        }

        .ai-audit-drawer.active {
          display: block;
          animation: badgeFadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes badgeFadeIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .drawer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #374151;
          padding-bottom: 6px;
          margin-bottom: 8px;
        }

        .drawer-title {
          font-weight: 700;
          font-size: 11px;
          color: #93c5fd;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .drawer-close {
          background: none;
          border: none;
          color: #9ca3af;
          font-size: 16px;
          line-height: 1;
          cursor: pointer;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .drawer-close:hover {
          color: #ffffff;
          background: #374151;
        }

        .drawer-body {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 11px;
        }

        .audit-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 8px;
        }

        .row-tag {
          color: #9ca3af;
          font-weight: 500;
          min-width: 80px;
        }

        .row-info {
          font-weight: 600;
          text-align: right;
          color: #f3f4f6;
        }

        .drawer-footer {
          margin-top: 10px;
          padding-top: 6px;
          border-top: 1px solid #1f2937;
          font-size: 9px;
          color: #6b7280;
          text-align: center;
        }
      `;
    }
  }

  UIInjector.BADGE_STATUSES = BADGE_STATUSES;
  return UIInjector;
});
