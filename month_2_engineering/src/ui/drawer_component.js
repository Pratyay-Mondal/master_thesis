/**
 * drawer_component.js
 * <ai-audit-drawer> Custom Element (FR-04).
 *
 * Interactive Shadow DOM audit panel that surfaces:
 * 1. Technical provenance signals (token count, entropy gating, z-score, C2PA status).
 * 2. EU AI Act Article 50(2), 50(4), and 50(5) compliance verdicts with rationales.
 *
 * Uses strict Shadow DOM v1 encapsulation (`:host { all: initial; }`) so
 * Meta's global CSS resets cannot leak into the drawer layout.
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
    root.AITransparency.DrawerComponent = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  'use strict';

  const BaseHTMLElement = typeof HTMLElement !== 'undefined' ? HTMLElement : class {};

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function verdictBadgeClass(status) {
    switch (status) {
      case 'COMPLIANT':
        return 'verdict-compliant';
      case 'NON_COMPLIANT':
        return 'verdict-noncompliant';
      default:
        return 'verdict-unknown';
    }
  }

  class AiAuditDrawer extends BaseHTMLElement {
    /**
     * Calculates clamped viewport coordinates (top, left) ensuring the drawer
     * renders cleanly beside/below its trigger button without overflowing the viewport.
     *
     * @param {{ top: number, bottom: number, left: number, right: number }} triggerRect
     * @param {{ width?: number, height?: number }} [drawerDims]
     * @param {{ width: number, height: number }} [viewport]
     * @param {number} [margin=8]
     * @returns {{ top: number, left: number, isOffscreen: boolean }}
     */
    static computePosition(triggerRect, drawerDims = { width: 348, height: 380 }, viewport = null, margin = 8) {
      const vp = viewport || {
        width: typeof window !== 'undefined' && window.innerWidth ? window.innerWidth : 1024,
        height: typeof window !== 'undefined' && window.innerHeight ? window.innerHeight : 768
      };

      const dWidth = Math.min(drawerDims.width || 348, Math.max(200, vp.width - margin * 2));
      const dHeight = drawerDims.height || 380;

      // Horizontal coordinate: align to trigger left, clamp within viewport edges
      let left = triggerRect.left;
      if (left + dWidth > vp.width - margin) {
        left = vp.width - dWidth - margin;
      }
      if (left < margin) {
        left = margin;
      }

      // Vertical coordinate: prefer below trigger; flip above if overflowing bottom and space exists
      let top = triggerRect.bottom + 6;
      const overflowsBottom = top + dHeight > vp.height - margin;
      const fitsAbove = triggerRect.top - dHeight - 6 >= margin;

      if (overflowsBottom && fitsAbove) {
        top = triggerRect.top - dHeight - 6;
      } else if (overflowsBottom) {
        top = Math.max(margin, vp.height - dHeight - margin);
      }

      // Check if trigger has scrolled completely out of the viewport
      const isOffscreen = triggerRect.bottom < 0 || triggerRect.top > vp.height;

      return {
        top: Math.round(top),
        left: Math.round(left),
        isOffscreen
      };
    }

    /**
     * Inspects event composed path to safely identify if an event originated
     * within target element (even across Shadow DOM boundaries).
     *
     * @param {Event} e
     * @param {Element} targetElement
     * @returns {boolean}
     */
    static isEventInside(e, targetElement) {
      if (!e || !targetElement) return false;
      const path = typeof e.composedPath === 'function' ? e.composedPath() : [];
      if (path.length > 0) {
        return path.includes(targetElement);
      }
      if (typeof targetElement.contains === 'function' && e.target) {
        return targetElement.contains(e.target);
      }
      return false;
    }

    constructor() {
      super();
      this._compliance = null;
      this._isOpen = false;
      this._triggerEl = null;
      this._onStateChange = null;
      this._onScrollOrResize = null;
      this._onDocumentClick = null;
      this._shadow = typeof this.attachShadow === 'function' ? this.attachShadow({ mode: 'open' }) : null;
      this._onKeyDown = (e) => {
        if (e.key === 'Escape' && this._isOpen) {
          this.close();
        }
      };
    }

    connectedCallback() {
      if (typeof this.setAttribute === 'function') {
        this.setAttribute('popover', 'auto');
      }
      this.render();

      if (typeof document !== 'undefined') {
        document.addEventListener('keydown', this._onKeyDown);
      }

      if (typeof this.addEventListener === 'function') {
        this._onPopoverToggle = (e) => {
          if (e.newState === 'closed') {
            this._isOpen = false;
            this._cleanupListeners();
            if (typeof this.removeAttribute === 'function') {
              this.removeAttribute('open');
            }
            this.render();
            if (this._onStateChange) this._onStateChange(false);
          } else if (e.newState === 'open') {
            this._isOpen = true;
            this._attachListeners();
            if (this._onStateChange) this._onStateChange(true);
          }
        };
        this.addEventListener('toggle', this._onPopoverToggle);
      }
    }

    disconnectedCallback() {
      if (typeof document !== 'undefined') {
        document.removeEventListener('keydown', this._onKeyDown);
      }
      this._cleanupListeners();
    }

    set complianceData(value) {
      this._compliance = value || null;
      this.render();
    }

    get complianceData() {
      return this._compliance;
    }

    set open(val) {
      const bool = Boolean(val);
      if (bool) {
        this.show(this._triggerEl || this.parentElement);
      } else {
        this.close();
      }
    }

    get open() {
      return this._isOpen;
    }

    show(triggerEl) {
      this._isOpen = true;
      if (triggerEl) {
        this._triggerEl = triggerEl;
      }
      if (typeof this.setAttribute === 'function') {
        this.setAttribute('open', '');
      }
      this.render();

      if (typeof this.showPopover === 'function') {
        try {
          if (typeof this.matches !== 'function' || !this.matches(':popover-open')) {
            this.showPopover();
          }
        } catch (_) {}
      }

      this.reposition();
      this._attachListeners();

      if (this._onStateChange) {
        this._onStateChange(true);
      }
    }

    close() {
      this._isOpen = false;
      this._cleanupListeners();

      if (typeof this.hidePopover === 'function') {
        try {
          if (typeof this.matches !== 'function' || this.matches(':popover-open')) {
            this.hidePopover();
          }
        } catch (_) {}
      }

      if (typeof this.removeAttribute === 'function') {
        this.removeAttribute('open');
      }

      this.render();

      if (this._onStateChange) {
        this._onStateChange(false);
      }
    }

    toggle(triggerEl) {
      if (this._isOpen) {
        this.close();
      } else {
        this.show(triggerEl);
      }
    }

    reposition() {
      if (!this._isOpen || !this._triggerEl) return;
      const triggerRect =
        typeof this._triggerEl.getBoundingClientRect === 'function'
          ? this._triggerEl.getBoundingClientRect()
          : null;
      if (!triggerRect) return;

      const panel = this._shadow ? this._shadow.querySelector('.drawer-panel') : null;
      const drawerDims = {
        width: (panel && panel.offsetWidth) || this.offsetWidth || 348,
        height: (panel && panel.offsetHeight) || this.offsetHeight || 380
      };

      const coords = AiAuditDrawer.computePosition(triggerRect, drawerDims);

      if (coords.isOffscreen) {
        this.close();
        return;
      }

      this.style.position = 'fixed';
      this.style.top = `${coords.top}px`;
      this.style.left = `${coords.left}px`;
      this.style.margin = '0px';
      this.style.inset = 'auto';
    }

    _attachListeners() {
      this._cleanupListeners();

      let rafId = null;
      this._onScrollOrResize = () => {
        if (rafId) return;
        rafId = typeof requestAnimationFrame === 'function'
          ? requestAnimationFrame(() => {
              rafId = null;
              if (this._isOpen) {
                this.reposition();
              }
            })
          : null;
      };

      if (typeof window !== 'undefined') {
        window.addEventListener('scroll', this._onScrollOrResize, { passive: true, capture: true });
        window.addEventListener('resize', this._onScrollOrResize, { passive: true });
      }

      this._onDocumentClick = (e) => {
        if (!this._isOpen) return;
        const isInside =
          AiAuditDrawer.isEventInside(e, this) ||
          (this._triggerEl && AiAuditDrawer.isEventInside(e, this._triggerEl));
        if (!isInside) {
          this.close();
        }
      };

      if (typeof document !== 'undefined') {
        document.addEventListener('pointerdown', this._onDocumentClick, true);
      }
    }

    _cleanupListeners() {
      if (typeof window !== 'undefined' && this._onScrollOrResize) {
        window.removeEventListener('scroll', this._onScrollOrResize, { capture: true });
        window.removeEventListener('resize', this._onScrollOrResize);
        this._onScrollOrResize = null;
      }
      if (typeof document !== 'undefined' && this._onDocumentClick) {
        document.removeEventListener('pointerdown', this._onDocumentClick, true);
        this._onDocumentClick = null;
      }
    }

    render() {
      if (!this._shadow) return;

      if (!this._isOpen) {
        this._shadow.innerHTML = `<style>:host { display: none !important; }</style>`;
        return;
      }

      const data = this._compliance;
      const img = data?.signals?.image || {};
      const txt = data?.signals?.text || {};
      const articles = data?.articles || {};

      const c2paDisplay = img.c2paStatus || 'NONE';
      const tokenDisplay = typeof txt.tokenCount === 'number' ? `${txt.tokenCount} est. tokens` : '0';
      const entropyGateDisplay =
        txt.status === 'LOW_ENTROPY'
          ? `GATED (Low Entropy: H2=${txt.entropy ?? 0}, cond=${txt.conditionalEntropy ?? 0})`
          : txt.status === 'INSUFFICIENT_LENGTH'
            ? `GATED (Short: ${txt.tokenCount ?? 0} < 50 tokens)`
            : txt.status === 'NO_TEXT'
              ? 'N/A (No text)'
              : `PASSED (H2=${txt.entropy ?? 0} bits, cond=${txt.conditionalEntropy ?? 0})`;
      const zDisplay =
        typeof txt.zScore === 'number'
          ? `z = ${txt.zScore.toFixed(3)} (p = ${txt.pValue ?? 'n/a'})`
          : 'Not evaluated';

      const art50_2 = articles.article50_2 || { status: 'UNKNOWN', rationale: 'Pending evaluation.' };
      const art50_4 = articles.article50_4 || { status: 'UNKNOWN', rationale: 'Pending evaluation.' };
      const art50_5 = articles.article50_5 || { status: 'COMPLIANT', rationale: 'Active Shadow DOM overlay.' };

      this._shadow.innerHTML = `
        <style>
          :host {
            all: initial;
            box-sizing: border-box;
            position: fixed;
            inset: auto;
            margin: 0;
            border: none;
            padding: 0;
            background: transparent;
            z-index: 2147483647;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            font-size: 12px;
            line-height: 1.45;
            color: #f3f4f6;
          }

          :host(:not([open]):not(:popover-open)) {
            display: none !important;
          }

          :host([open]),
          :host(:popover-open) {
            display: block !important;
          }

          .drawer-panel {
            width: 348px;
            max-width: calc(100vw - 20px);
            max-height: calc(100vh - 20px);
            background: #111827;
            border: 1px solid #374151;
            border-radius: 10px;
            box-shadow: 0 16px 36px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.05);
            overflow-y: auto;
            overflow-x: hidden;
            animation: slideFadeIn 0.16s ease-out;
            box-sizing: border-box;
          }

          @keyframes slideFadeIn {
            from {
              opacity: 0;
              transform: translateY(-4px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .drawer-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 14px;
            background: #1f2937;
            border-bottom: 1px solid #374151;
          }

          .drawer-title {
            font-weight: 700;
            font-size: 12px;
            letter-spacing: 0.2px;
            color: #f9fafb;
          }

          .drawer-close {
            background: transparent;
            border: none;
            color: #9ca3af;
            font-size: 18px;
            line-height: 1;
            cursor: pointer;
            padding: 0 4px;
          }

          .drawer-close:hover {
            color: #ffffff;
          }

          .drawer-section {
            padding: 10px 14px;
            border-bottom: 1px solid #1f2937;
          }

          .section-heading {
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            color: #9ca3af;
            margin-bottom: 8px;
          }

          .signal-grid {
            display: grid;
            grid-template-columns: 112px 1fr;
            gap: 5px 8px;
            font-size: 11px;
          }

          .signal-label {
            color: #9ca3af;
            font-weight: 600;
          }

          .signal-value {
            color: #e5e7eb;
            word-break: break-word;
          }

          .verdict-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .verdict-card {
            background: #1a2234;
            border: 1px solid #2d3748;
            border-radius: 6px;
            padding: 7px 9px;
          }

          .verdict-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 3px;
          }

          .verdict-article {
            font-weight: 700;
            font-size: 11px;
            color: #f9fafb;
          }

          .verdict-pill {
            font-size: 10px;
            font-weight: 700;
            padding: 1px 7px;
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
            font-size: 11px;
            color: #cbd5e1;
          }

          .drawer-footer {
            padding: 7px 14px;
            background: #0f172a;
            color: #64748b;
            font-size: 10px;
            text-align: center;
          }
        </style>

        <div class="drawer-panel" role="dialog" aria-label="EU AI Act Article 50 Provenance Audit">
          <div class="drawer-header">
            <span class="drawer-title">EU AI Act Article 50 Audit</span>
            <button class="drawer-close" type="button" aria-label="Close audit panel">&times;</button>
          </div>

          <div class="drawer-section">
            <div class="section-heading">Technical Provenance Signals</div>
            <div class="signal-grid">
              <span class="signal-label">C2PA Manifest:</span>
              <span class="signal-value">${escapeHtml(c2paDisplay)}${img.claimGenerator ? ` (${escapeHtml(img.claimGenerator)})` : ''}</span>

              <span class="signal-label">Platform Label:</span>
              <span class="signal-value">${data?.platformLabelPresent ? 'Detected ("Made with AI")' : 'None detected'}</span>

              <span class="signal-label">Token Count:</span>
              <span class="signal-value">${escapeHtml(tokenDisplay)}</span>

              <span class="signal-label">Entropy Gate:</span>
              <span class="signal-value">${escapeHtml(entropyGateDisplay)}</span>

              <span class="signal-label">SynthID z-Score:</span>
              <span class="signal-value">${escapeHtml(zDisplay)}</span>
            </div>
          </div>

          <div class="drawer-section">
            <div class="section-heading">Legal Compliance Verdicts</div>
            <div class="verdict-list">
              <div class="verdict-card">
                <div class="verdict-header">
                  <span class="verdict-article">Art. 50(2) · Provider Marking</span>
                  <span class="verdict-pill ${verdictBadgeClass(art50_2.status)}">${escapeHtml(art50_2.status)}</span>
                </div>
                <div class="verdict-rationale">${escapeHtml(art50_2.rationale)}</div>
              </div>

              <div class="verdict-card">
                <div class="verdict-header">
                  <span class="verdict-article">Art. 50(4) · Deployer Disclosure</span>
                  <span class="verdict-pill ${verdictBadgeClass(art50_4.status)}">${escapeHtml(art50_4.status)}</span>
                </div>
                <div class="verdict-rationale">${escapeHtml(art50_4.rationale)}</div>
              </div>

              <div class="verdict-card">
                <div class="verdict-header">
                  <span class="verdict-article">Art. 50(5) · User Visibility</span>
                  <span class="verdict-pill ${verdictBadgeClass(art50_5.status)}">${escapeHtml(art50_5.status)}</span>
                </div>
                <div class="verdict-rationale">${escapeHtml(art50_5.rationale)}</div>
              </div>
            </div>
          </div>

          <div class="drawer-footer">
            THWS Master's Thesis Prototype · Client-Side Provenance Validator
          </div>
        </div>
      `;

      const panel = this._shadow.querySelector('.drawer-panel');
      if (panel) {
        panel.addEventListener('pointerdown', (e) => e.stopPropagation());
        panel.addEventListener('mousedown', (e) => e.stopPropagation());
        panel.addEventListener('click', (e) => e.stopPropagation());
      }

      const closeBtn = this._shadow.querySelector('.drawer-close');
      if (closeBtn) {
        closeBtn.onclick = (e) => {
          e.stopPropagation();
          e.preventDefault();
          this.close();
        };
      }
    }
  }

  const registry =
    (typeof window !== 'undefined' && window.customElements) ||
    (typeof globalThis !== 'undefined' && globalThis.customElements) ||
    (typeof customElements !== 'undefined' && customElements !== null ? customElements : null);

  if (registry && typeof registry.get === 'function' && typeof registry.define === 'function') {
    try {
      if (!registry.get('ai-audit-drawer')) {
        registry.define('ai-audit-drawer', AiAuditDrawer);
      }
    } catch (e) {
      console.warn('[AI-Transparency-Validator] Could not define <ai-audit-drawer>:', e.message);
    }
  }

  return AiAuditDrawer;
});

