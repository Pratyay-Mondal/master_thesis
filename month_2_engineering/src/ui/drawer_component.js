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
    constructor() {
      super();
      this._compliance = null;
      this._isOpen = false;
      this._shadow = typeof this.attachShadow === 'function' ? this.attachShadow({ mode: 'open' }) : null;
      this._onKeyDown = (e) => {
        if (e.key === 'Escape' && this._isOpen) {
          this.close();
        }
      };
    }

    connectedCallback() {
      this.render();
      if (typeof document !== 'undefined') {
        document.addEventListener('keydown', this._onKeyDown);
      }
    }

    disconnectedCallback() {
      if (typeof document !== 'undefined') {
        document.removeEventListener('keydown', this._onKeyDown);
      }
    }

    set complianceData(value) {
      this._compliance = value || null;
      this.render();
    }

    get complianceData() {
      return this._compliance;
    }

    set open(val) {
      this._isOpen = Boolean(val);
      if (typeof this.setAttribute === 'function') {
        if (this._isOpen) {
          this.setAttribute('open', '');
        } else {
          this.removeAttribute('open');
        }
      }
      this.render();
    }

    get open() {
      return this._isOpen;
    }

    toggle() {
      this.open = !this._isOpen;
    }

    close() {
      this.open = false;
    }

    render() {
      if (!this._shadow) return;

      if (!this._isOpen) {
        this._shadow.innerHTML = `<style>:host { display: none; }</style>`;
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
            display: block;
            position: absolute;
            top: calc(100% + 6px);
            left: 0;
            z-index: 2147483647;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            font-size: 12px;
            line-height: 1.45;
            color: #f3f4f6;
          }

          .drawer-panel {
            width: 348px;
            max-width: 90vw;
            background: #111827;
            border: 1px solid #374151;
            border-radius: 10px;
            box-shadow: 0 16px 36px rgba(0, 0, 0, 0.55);
            overflow: hidden;
            animation: slideFadeIn 0.16s ease-out;
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

