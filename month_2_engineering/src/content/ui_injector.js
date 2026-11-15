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
    NO_WATERMARK: {
      key: 'NO_WATERMARK',
      label: '⚪ AI: No Signal Detected',
      bg: '#1f2937',
      border: '#6b7280',
      text: '#f9fafb',
      glow: 'rgba(107, 114, 128, 0.3)',
      description: 'Audited text/media exceeded statistical thresholds with no synthetic provenance signal detected.'
    },
    INSUFFICIENT: {
      key: 'INSUFFICIENT',
      label: '⚪ AI: Inconclusive / Short',
      bg: '#374151',
      border: '#4b5563',
      text: '#f9fafb',
      glow: 'rgba(75, 85, 99, 0.3)',
      description: 'Content length is below threshold (T < 50 tokens) or entropy too low for reliable detection.'
    }
  };

  class UIInjector {
    /**
     * Mounts (or reuses) the compliance badge element inside the post header anchor (FR-04).
     * Dual-mode architecture:
     * 1. Uses <ai-transparency-badge> Custom Element if supported by the host environment.
     * 2. Seamlessly falls back to an ultra-resilient Shadow DOM host <div> if customElements
     *    is null or disabled (e.g. on Facebook Comet / sandboxed frames).
     *
     * @param {Element} anchorElement - Safe DOM anchor inside post header
     * @returns {HTMLElement|null} Mounted badge host element with .complianceData setter
     */
    static mountComplianceBadge(anchorElement) {
      if (!anchorElement) {
        console.warn('[AI-Transparency-Validator] [Injector] No valid anchor element provided.');
        return null;
      }

      // Check for already mounted badge
      const existingBadge =
        anchorElement.querySelector(`ai-transparency-badge.${CONTAINER_CLASS}`) ||
        anchorElement.querySelector(`div.${CONTAINER_CLASS}`);
      if (existingBadge) {
        return existingBadge;
      }

      const registry =
        (typeof window !== 'undefined' && window.customElements) ||
        (typeof globalThis !== 'undefined' && globalThis.customElements) ||
        (typeof customElements !== 'undefined' && customElements !== null ? customElements : null);

      const hasCustomElements = Boolean(
        registry &&
        typeof registry.get === 'function' &&
        registry.get('ai-transparency-badge')
      );

      if (hasCustomElements) {
        try {
          const badgeEl = document.createElement('ai-transparency-badge');
          badgeEl.className = CONTAINER_CLASS;
          badgeEl.setAttribute('state', 'SCANNING');
          badgeEl.setAttribute('role', 'region');
          badgeEl.setAttribute('aria-label', 'EU AI Act Article 50 Transparency Indicator');

          if (anchorElement.firstChild) {
            anchorElement.insertBefore(badgeEl, anchorElement.firstChild);
          } else {
            anchorElement.appendChild(badgeEl);
          }

          return badgeEl;
        } catch (err) {
          console.warn('[AI-Transparency-Validator] [Injector] <ai-transparency-badge> creation failed, using Shadow DOM fallback:', err);
        }
      }

      // Fallback: direct Shadow DOM injection that works 100% reliably regardless of customElements state
      return this.mountShadowComplianceHost(anchorElement);
    }

    /**
     * Direct Shadow DOM host fallback for environments where customElements is null or disabled.
     */
    static mountShadowComplianceHost(anchorElement) {
      try {
        const host = document.createElement('div');
        host.className = CONTAINER_CLASS;
        host.setAttribute('role', 'region');
        host.setAttribute('aria-label', 'EU AI Act Article 50 Transparency Indicator');
        host.style.all = 'initial';
        host.style.display = 'inline-block';
        host.style.margin = '4px 8px';
        host.style.verticalAlign = 'middle';
        host.style.zIndex = '9999';

        const shadowRoot = host.attachShadow({ mode: 'open' });
        const style = document.createElement('style');
        style.textContent = this.getEncapsulatedStyles();
        shadowRoot.appendChild(style);

        const badgeWrapper = document.createElement('div');
        badgeWrapper.className = 'ai-badge-wrapper';
        shadowRoot.appendChild(badgeWrapper);

        this.renderComplianceBadge(badgeWrapper, shadowRoot, null);

        Object.defineProperty(host, 'complianceData', {
          set(compliance) {
            host._complianceData = compliance;
            UIInjector.renderComplianceBadge(badgeWrapper, shadowRoot, compliance);
          },
          get() {
            return host._complianceData;
          }
        });

        if (anchorElement.firstChild) {
          anchorElement.insertBefore(host, anchorElement.firstChild);
        } else {
          anchorElement.appendChild(host);
        }

        return host;
      } catch (err) {
        console.error('[AI-Transparency-Validator] [Injector] Shadow DOM host fallback failed:', err);
        return null;
      }
    }

    /**
     * Renders reactive compliance pill state & interactive audit drawer inside Shadow Root.
     */
    static renderComplianceBadge(badgeWrapper, shadowRoot, compliance) {
      const stateKey = compliance?.overallState || 'SCANNING';
      const theme = {
        SCANNING: {
          label: '🔍 AI: Auditing...',
          bg: '#1c64f2',
          border: '#3f83f8',
          text: '#ffffff',
          glow: 'rgba(63, 131, 248, 0.45)'
        },
        VERIFIED: {
          label: compliance?.signals?.image?.c2paStatus === 'VALID' ? '🟢 Verified (C2PA)' : '🟢 Verified AI Provenance',
          bg: '#057a55',
          border: '#10b981',
          text: '#ffffff',
          glow: 'rgba(16, 185, 129, 0.45)'
        },
        PLATFORM_TAGGED: {
          label: '🟡 Platform Tagged',
          bg: '#b45309',
          border: '#f59e0b',
          text: '#ffffff',
          glow: 'rgba(245, 158, 11, 0.45)'
        },
        UNDISCLOSED_AI: {
          label: typeof compliance?.signals?.text?.zScore === 'number' && compliance.signals.text.zScore > 3.0
            ? `🔴 Undisclosed AI (z=${compliance.signals.text.zScore.toFixed(1)})`
            : '🔴 Undisclosed AI',
          bg: '#b91c1c',
          border: '#ef4444',
          text: '#ffffff',
          glow: 'rgba(239, 68, 68, 0.55)'
        },
        NO_SIGNAL: {
          label: compliance?.signals?.text?.status === 'INSUFFICIENT_LENGTH'
            ? `⚪ Micro-span (${compliance.signals.text.tokenCount} tok)`
            : '⚪ No Signal / Micro-span',
          bg: '#374151',
          border: '#6b7280',
          text: '#f9fafb',
          glow: 'rgba(107, 114, 128, 0.30)'
        }
      }[stateKey] || {
        label: '⚪ No Signal',
        bg: '#374151',
        border: '#6b7280',
        text: '#f9fafb',
        glow: 'rgba(107, 114, 128, 0.30)'
      };

      // Remove stale drawer if present
      const oldDrawer = shadowRoot.querySelector('.ai-audit-drawer');
      if (oldDrawer) oldDrawer.remove();

      badgeWrapper.innerHTML = `
        <button class="ai-badge-pill" type="button" aria-haspopup="dialog" style="
          background: ${theme.bg};
          border: 1.5px solid ${theme.border};
          color: ${theme.text};
          box-shadow: 0 0 8px ${theme.glow};
        ">
          <span class="ai-badge-text">${this.escapeHtml(theme.label)}</span>
        </button>
      `;

      const button = badgeWrapper.querySelector('.ai-badge-pill');
      if (button) {
        button.onclick = (e) => {
          e.stopPropagation();
          e.preventDefault();
          this.toggleComplianceDrawer(shadowRoot, compliance);
        };
      }
    }

    /**
     * Toggles the interactive compliance drawer showing technical signals and Article 50 verdicts.
     */
    static toggleComplianceDrawer(shadowRoot, compliance) {
      let drawer = shadowRoot.querySelector('.ai-audit-drawer');
      if (drawer) {
        drawer.classList.toggle('active');
        return;
      }

      const img = compliance?.signals?.image || {};
      const txt = compliance?.signals?.text || {};
      const articles = compliance?.articles || {};

      const c2paDisplay = img.c2paStatus || 'NONE';
      const tokenDisplay = typeof txt.tokenCount === 'number' ? `${txt.tokenCount} est. tokens` : '0';
      const entropyGateDisplay =
        txt.status === 'LOW_ENTROPY'
          ? `GATED (Low Entropy: H2=${txt.entropy ?? 0})`
          : txt.status === 'INSUFFICIENT_LENGTH'
            ? `GATED (Short: ${txt.tokenCount ?? 0} < 50 tokens)`
            : txt.status === 'NO_TEXT'
              ? 'N/A (No text)'
              : `PASSED (H2=${txt.entropy ?? 0} bits)`;
      const zDisplay =
        typeof txt.zScore === 'number'
          ? `z = ${txt.zScore.toFixed(3)} (p = ${txt.pValue ?? 'n/a'})`
          : 'Not evaluated';

      const art50_2 = articles.article50_2 || { status: 'UNKNOWN', rationale: 'Pending evaluation.' };
      const art50_4 = articles.article50_4 || { status: 'UNKNOWN', rationale: 'Pending evaluation.' };
      const art50_5 = articles.article50_5 || { status: 'COMPLIANT', rationale: 'Active Shadow DOM overlay.' };

      const getPillClass = (status) => {
        if (status === 'COMPLIANT') return 'verdict-compliant';
        if (status === 'NON_COMPLIANT') return 'verdict-noncompliant';
        return 'verdict-unknown';
      };

      drawer = document.createElement('div');
      drawer.className = 'ai-audit-drawer active';
      drawer.innerHTML = `
        <div class="drawer-header">
          <span class="drawer-title">EU AI Act Article 50 Audit</span>
          <button class="drawer-close" type="button" aria-label="Close panel">&times;</button>
        </div>
        <div class="drawer-body">
          <div class="drawer-section-title">Technical Provenance Signals</div>
          <div class="audit-row">
            <span class="row-tag">C2PA Manifest:</span>
            <span class="row-info">${this.escapeHtml(c2paDisplay)}${img.claimGenerator ? ` (${this.escapeHtml(img.claimGenerator)})` : ''}</span>
          </div>
          <div class="audit-row">
            <span class="row-tag">Platform Label:</span>
            <span class="row-info">${compliance?.platformLabelPresent ? 'Detected ("Made with AI")' : 'None detected'}</span>
          </div>
          <div class="audit-row">
            <span class="row-tag">Token Count:</span>
            <span class="row-info">${this.escapeHtml(tokenDisplay)}</span>
          </div>
          <div class="audit-row">
            <span class="row-tag">Entropy Gate:</span>
            <span class="row-info">${this.escapeHtml(entropyGateDisplay)}</span>
          </div>
          <div class="audit-row">
            <span class="row-tag">SynthID z-Score:</span>
            <span class="row-info">${this.escapeHtml(zDisplay)}</span>
          </div>

          <div class="drawer-section-title" style="margin-top: 10px;">Legal Compliance Verdicts</div>
          <div class="verdict-block">
            <div class="verdict-header">
              <span class="verdict-title">Art. 50(2) · Provider Marking</span>
              <span class="verdict-badge ${getPillClass(art50_2.status)}">${this.escapeHtml(art50_2.status)}</span>
            </div>
            <div class="verdict-rationale">${this.escapeHtml(art50_2.rationale)}</div>
          </div>
          <div class="verdict-block">
            <div class="verdict-header">
              <span class="verdict-title">Art. 50(4) · Deployer Disclosure</span>
              <span class="verdict-badge ${getPillClass(art50_4.status)}">${this.escapeHtml(art50_4.status)}</span>
            </div>
            <div class="verdict-rationale">${this.escapeHtml(art50_4.rationale)}</div>
          </div>
          <div class="verdict-block">
            <div class="verdict-header">
              <span class="verdict-title">Art. 50(5) · User Visibility</span>
              <span class="verdict-badge ${getPillClass(art50_5.status)}">${this.escapeHtml(art50_5.status)}</span>
            </div>
            <div class="verdict-rationale">${this.escapeHtml(art50_5.rationale)}</div>
          </div>
        </div>
        <div class="drawer-footer">
          THWS Master's Thesis Prototype · Client-Side Provenance Validator
        </div>
      `;

      drawer.querySelector('.drawer-close').onclick = (e) => {
        e.stopPropagation();
        drawer.classList.remove('active');
      };

      shadowRoot.appendChild(drawer);
    }

    /**
     * Primary injection function (legacy fallback).
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
     * Escapes HTML characters for safe Shadow DOM rendering.
     */
    static escapeHtml(str) {
      return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    /**
     * Internal renderer for badge content and event bindings.
     */
    static renderBadgeContent(badgeWrapper, shadowRoot, statusInput) {
      const statusKey = typeof statusInput === 'string' ? statusInput : statusInput.status || 'SCANNING';
      const baseCfg = BADGE_STATUSES[statusKey] || BADGE_STATUSES.SCANNING;
      const customLabel = typeof statusInput === 'object' && statusInput.label ? statusInput.label : baseCfg.label;
      const cfg = {
        ...baseCfg,
        description:
          typeof statusInput === 'object' && statusInput.details ? statusInput.details : baseCfg.description
      };

      // Remove stale drawer if status changed asynchronously
      const existingDrawer = shadowRoot.querySelector('.ai-audit-drawer');
      if (existingDrawer) existingDrawer.remove();

      badgeWrapper.innerHTML = `
        <button class="ai-badge-pill" type="button" aria-haspopup="dialog" style="
          background: ${cfg.bg};
          border: 1.5px solid ${cfg.border};
          color: ${cfg.text};
          box-shadow: 0 0 8px ${cfg.glow};
        ">
          <span class="ai-badge-text">${this.escapeHtml(customLabel)}</span>
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
            <span class="row-info" style="color: ${cfg.border}">${this.escapeHtml(cfg.key)}</span>
          </div>
          <div class="audit-row">
            <span class="row-tag">Assessment:</span>
            <span class="row-info">${this.escapeHtml(cfg.description)}</span>
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

        .drawer-section-title {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          color: #9ca3af;
          margin-bottom: 3px;
        }

        .verdict-block {
          background: #1a2234;
          border: 1px solid #2d3748;
          border-radius: 6px;
          padding: 6px 8px;
          margin-bottom: 4px;
        }

        .verdict-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 3px;
        }

        .verdict-title {
          font-weight: 700;
          font-size: 11px;
          color: #f9fafb;
        }

        .verdict-badge {
          font-size: 9px;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: 999px;
          letter-spacing: 0.3px;
        }

        .verdict-compliant {
          background: rgba(5, 122, 85, 0.25);
          color: #34d399;
          border: 1px solid #059669;
        }

        .verdict-noncompliant {
          background: rgba(200, 30, 30, 0.25);
          color: #f87171;
          border: 1px solid #dc2626;
        }

        .verdict-unknown {
          background: rgba(75, 85, 99, 0.3);
          color: #d1d5db;
          border: 1px solid #6b7280;
        }

        .verdict-rationale {
          font-size: 10px;
          color: #cbd5e1;
          line-height: 1.35;
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
