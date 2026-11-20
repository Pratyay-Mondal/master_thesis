/**
 * badge_component.js
 * <ai-transparency-badge> Custom Element (FR-04).
 *
 * Reactive Shadow DOM v1 Web Component rendering one of four EU AI Act
 * Article 50(5) visual pill states plus an initial scanning state:
 * - 🟢 VERIFIED        : Valid C2PA or z > 3.0 + Platform Label
 * - 🟡 PLATFORM_TAGGED : Platform Label exists, but C2PA stripped / z <= 3.0
 * - 🔴 UNDISCLOSED_AI  : z > 3.0 or valid C2PA, but NO Platform Label
 * - ⚪ NO_SIGNAL       : No label, z <= 3.0, or T < 50
 *
 * Embeds <ai-audit-drawer> inside its Shadow Root and toggles it on click.
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
    root.AITransparency.BadgeComponent = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  'use strict';

  const BaseHTMLElement = typeof HTMLElement !== 'undefined' ? HTMLElement : class {};

  /**
   * Rationale for "⚪ Unverifiable" over "Micro-span" or "Undetectable":
   * Based on C2PA UX Recommendations (2023) and plain-English regulatory transparency
   * research for EU AI Act Art. 50(5):
   * 1. "Micro-span" is internal engineering jargon (referencing the 50-token entropy threshold)
   *    that conveys zero meaning to non-technical users, judges, or compliance auditors.
   * 2. "Undetectable" or "Human" would be misleading and legally problematic, making an
   *    unsubstantiated affirmative claim that the content is definitely human-authored.
   * 3. "Unverifiable" truthfully and accurately communicates the epistemic boundary: the text
   *    length or media data is insufficient to conclusively prove or disprove synthetic origin.
   */
  const PILL_THEMES = {
    SCANNING: {
      label: '🔍 AI: Auditing...',
      bg: '#1c64f2',
      border: '#3f83f8',
      text: '#ffffff',
      glow: 'rgba(63, 131, 248, 0.45)'
    },
    VERIFIED: {
      label: '🟢 Verified AI',
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
      label: '🔴 Undisclosed AI',
      bg: '#b91c1c',
      border: '#ef4444',
      text: '#ffffff',
      glow: 'rgba(239, 68, 68, 0.55)'
    },
    NO_SIGNAL: {
      label: '⚪ Unverifiable',
      bg: '#374151',
      border: '#6b7280',
      text: '#f9fafb',
      glow: 'rgba(107, 114, 128, 0.30)'
    }
  };

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  class AiTransparencyBadge extends BaseHTMLElement {
    static get observedAttributes() {
      return ['state'];
    }

    constructor() {
      super();
      this._state = 'SCANNING';
      this._compliance = null;
      this._shadow = typeof this.attachShadow === 'function' ? this.attachShadow({ mode: 'open' }) : null;
    }

    connectedCallback() {
      this.render();
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if (name === 'state' && oldValue !== newValue && newValue) {
        this._state = newValue;
        this.render();
      }
    }

    /**
     * Reactive setter accepting the structured output of evaluateCompliance().
     * Automatically updates pill state, label, and embedded <ai-audit-drawer>.
     */
    set complianceData(value) {
      this._compliance = value || null;
      this._state = value?.overallState || 'NO_SIGNAL';
      if (typeof this.setAttribute === 'function') {
        this.setAttribute('state', this._state);
      }
      this.render();
    }

    get complianceData() {
      return this._compliance;
    }

    /**
     * Computes a concise, user-friendly pill label reflecting the active verdict.
     * Technical diagnostics (such as z-scores and token counts) are deliberately excluded
     * from the pill surface and progressively disclosed inside <ai-audit-drawer>.
     */
    resolvePillLabel(stateKey) {
      const base = PILL_THEMES[stateKey] || PILL_THEMES.NO_SIGNAL;
      if (!this._compliance) return base.label;

      const img = this._compliance.signals?.image;

      if (stateKey === 'UNDISCLOSED_AI') {
        return '🔴 Undisclosed AI';
      }
      if (stateKey === 'VERIFIED') {
        return img?.c2paStatus === 'VALID' ? '🟢 Verified (C2PA)' : '🟢 Verified AI';
      }
      if (stateKey === 'PLATFORM_TAGGED') {
        return '🟡 Platform Tagged';
      }
      if (stateKey === 'NO_SIGNAL') {
        return '⚪ Unverifiable';
      }

      return base.label;
    }

    render() {
      if (!this._shadow) return;

      const theme = PILL_THEMES[this._state] || PILL_THEMES.SCANNING;
      const pillLabel = this.resolvePillLabel(this._state);

      this._shadow.innerHTML = `
        <style>
          :host {
            all: initial;
            display: inline-flex;
            vertical-align: middle;
            position: relative;
            margin: 4px 8px;
            margin-left: 8px;
            z-index: 9999;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          }

          .ai-pill-btn {
            all: unset;
            box-sizing: border-box;
            display: inline-flex;
            align-items: center;
            gap: 5px;
            padding: 4px 10px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 700;
            line-height: 1.25;
            letter-spacing: 0.2px;
            cursor: pointer;
            user-select: none;
            background: ${theme.bg};
            border: 1.5px solid ${theme.border};
            color: ${theme.text};
            box-shadow: 0 0 8px ${theme.glow};
            transition: transform 0.12s ease, filter 0.12s ease;
          }

          .ai-pill-btn:hover {
            transform: translateY(-1px);
            filter: brightness(1.08);
          }

          .ai-pill-btn:focus-visible {
            outline: 2px solid #93c5fd;
            outline-offset: 2px;
          }
        </style>

        <button class="ai-pill-btn" type="button" aria-haspopup="dialog" aria-expanded="false">
          <span>${escapeHtml(pillLabel)}</span>
        </button>
        <ai-audit-drawer></ai-audit-drawer>
      `;

      const btn = this._shadow.querySelector('.ai-pill-btn');
      const drawer = this._shadow.querySelector('ai-audit-drawer');

      if (drawer && this._compliance) {
        drawer.complianceData = this._compliance;
      }

      if (btn && drawer) {
        drawer._onStateChange = (isOpen) => {
          btn.setAttribute('aria-expanded', String(isOpen));
        };

        const stopPropagation = (e) => {
          e.stopPropagation();
        };

        btn.addEventListener('pointerdown', stopPropagation);
        btn.addEventListener('mousedown', stopPropagation);
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          drawer.toggle(btn);
          btn.setAttribute('aria-expanded', String(drawer.open));
        });
      }
    }
  }

  AiTransparencyBadge.PILL_THEMES = PILL_THEMES;

  const registry =
    (typeof window !== 'undefined' && window.customElements) ||
    (typeof globalThis !== 'undefined' && globalThis.customElements) ||
    (typeof customElements !== 'undefined' && customElements !== null ? customElements : null);

  if (registry && typeof registry.get === 'function' && typeof registry.define === 'function') {
    try {
      if (!registry.get('ai-transparency-badge')) {
        registry.define('ai-transparency-badge', AiTransparencyBadge);
      }
    } catch (e) {
      console.warn('[AI-Transparency-Validator] Could not define <ai-transparency-badge>:', e.message);
    }
  }

  return AiTransparencyBadge;
});

