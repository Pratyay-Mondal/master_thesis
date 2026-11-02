/**
 * ui_injector.js
 * Isolated Shadow DOM UI injection utility for social media feeds.
 *
 * Enforces CSS isolation via W3C Shadow DOM v1 to prevent Meta platform
 * styles from distorting Article 50(5) visual badges, and vice versa.
 *
 * Thesis: "AI Transparency in the Wild: Bridging Technical Provenance
 * and Legal Compliance under the EU AI Act on Social Media Platforms"
 */

import { EXTENSION_CONFIG, BADGE_THEMES, COMPLIANCE_STATUS } from '../common/constants.js';
import { Logger } from '../common/logger.js';

export class UIInjector {
  /**
   * Injects an isolated Shadow DOM container into the specified anchor element.
   * @param {Element} anchorElement - DOM node where badge will be attached
   * @param {Object} metadata - Initial inspection metadata
   * @returns {ShadowRoot|null}
   */
  static injectBadgeContainer(anchorElement, metadata = {}) {
    if (!anchorElement) return null;

    // Check if host already exists
    let hostElement = anchorElement.querySelector(`.${EXTENSION_CONFIG.CONTAINER_CLASS}`);
    if (hostElement && hostElement.shadowRoot) {
      return hostElement.shadowRoot;
    }

    try {
      // Create Host Element in light DOM
      hostElement = document.createElement('div');
      hostElement.className = EXTENSION_CONFIG.CONTAINER_CLASS;
      hostElement.setAttribute('role', 'region');
      hostElement.setAttribute('aria-label', 'AI Transparency & Provenance Information');
      
      // Inline host styles to ensure correct positioning without bleed
      hostElement.style.display = 'inline-flex';
      hostElement.style.alignItems = 'center';
      hostElement.style.marginLeft = '8px';
      hostElement.style.verticalAlign = 'middle';
      hostElement.style.zIndex = '999';

      // Attach open shadow root
      const shadowRoot = hostElement.attachShadow({ mode: 'open' });

      // Inject isolated component stylesheet
      const styleSheet = document.createElement('style');
      styleSheet.textContent = this.getShadowStyles();
      shadowRoot.appendChild(styleSheet);

      // Create container inside shadow DOM
      const badgeContainer = document.createElement('div');
      badgeContainer.className = 'ai-badge-root';
      badgeContainer.innerHTML = this.renderInitialBadge(metadata);

      // Attach click handler for audit drawer
      badgeContainer.addEventListener('click', (event) => {
        event.stopPropagation();
        this.toggleAuditDrawer(shadowRoot, metadata);
      });

      shadowRoot.appendChild(badgeContainer);

      // Prepend or append to anchor
      if (anchorElement.firstChild) {
        anchorElement.insertBefore(hostElement, anchorElement.firstChild);
      } else {
        anchorElement.appendChild(hostElement);
      }

      Logger.debug('Injected Shadow DOM badge host for anchor:', anchorElement);
      return shadowRoot;
    } catch (err) {
      Logger.error('Failed to inject Shadow DOM badge container:', err);
      return null;
    }
  }

  /**
   * Updates an existing badge state inside its shadow root.
   * @param {ShadowRoot} shadowRoot 
   * @param {Object} complianceResult 
   */
  static updateBadgeState(shadowRoot, complianceResult) {
    if (!shadowRoot) return;

    const root = shadowRoot.querySelector('.ai-badge-root');
    if (!root) return;

    const { status, label, details } = complianceResult;

    let themeClass = BADGE_THEMES.GREY;
    let icon = 'ℹ️';

    switch (status) {
      case COMPLIANCE_STATUS.COMPLIANT:
        themeClass = BADGE_THEMES.GREEN;
        icon = '🛡️';
        break;
      case COMPLIANCE_STATUS.PLATFORM_MEDIATED:
        themeClass = BADGE_THEMES.AMBER;
        icon = '⚠️';
        break;
      case COMPLIANCE_STATUS.POTENTIAL_NON_COMPLIANCE:
        themeClass = BADGE_THEMES.RED;
        icon = '🚨';
        break;
      case COMPLIANCE_STATUS.EXEMPT_EDITORIAL:
        themeClass = BADGE_THEMES.GREEN;
        icon = '✍️';
        break;
      default:
        themeClass = BADGE_THEMES.GREY;
        icon = '🔍';
    }

    root.className = `ai-badge-root ${themeClass}`;
    root.innerHTML = `
      <div class="ai-badge-pill">
        <span class="ai-badge-icon">${icon}</span>
        <span class="ai-badge-text">${label || 'AI Transparency'}</span>
      </div>
    `;

    // Cache updated metadata for drawer inspection
    root.dataset.metadata = JSON.stringify(complianceResult);
  }

  /**
   * Initial placeholder HTML template while background analysis is pending.
   */
  static renderInitialBadge(metadata) {
    return `
      <div class="ai-badge-pill badge-evaluating">
        <span class="ai-badge-spinner"></span>
        <span class="ai-badge-text">Auditing Provenance...</span>
      </div>
    `;
  }

  /**
   * Toggles the provenance details modal / drawer within the Shadow DOM.
   */
  static toggleAuditDrawer(shadowRoot, metadata) {
    let drawer = shadowRoot.querySelector('.ai-audit-drawer');
    if (drawer) {
      drawer.classList.toggle('open');
      return;
    }

    // Create drawer if not yet created
    drawer = document.createElement('div');
    drawer.className = 'ai-audit-drawer open';
    drawer.innerHTML = `
      <div class="drawer-header">
        <h4>EU AI Act Art. 50 Compliance Audit</h4>
        <button class="drawer-close" aria-label="Close">&times;</button>
      </div>
      <div class="drawer-body">
        <div class="audit-row">
          <span class="row-label">Platform:</span>
          <span class="row-value">${metadata.platform || 'Meta Social'}</span>
        </div>
        <div class="audit-row">
          <span class="row-label">Media Targets:</span>
          <span class="row-value">${metadata.mediaCount || 0} image(s)</span>
        </div>
        <div class="audit-row">
          <span class="row-label">Text Length:</span>
          <span class="row-value">${metadata.textLength || 0} characters</span>
        </div>
        <div class="audit-divider"></div>
        <div class="audit-legal-note">
          <small>Evaluated client-side under THWS Master's Thesis research harness. Complies with GDPR Art. 5(1)(c) data minimisation.</small>
        </div>
      </div>
    `;

    drawer.querySelector('.drawer-close').addEventListener('click', (e) => {
      e.stopPropagation();
      drawer.classList.remove('open');
    });

    shadowRoot.appendChild(drawer);
  }

  /**
   * Fully encapsulated CSS styles injected inside the Shadow DOM root.
   */
  static getShadowStyles() {
    return `
      :host {
        all: initial;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        font-size: 12px;
        line-height: 1.4;
      }

      .ai-badge-root {
        display: inline-flex;
        cursor: pointer;
        user-select: none;
        position: relative;
      }

      .ai-badge-pill {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 3px 8px;
        border-radius: 12px;
        font-weight: 600;
        letter-spacing: 0.2px;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
      }

      .ai-badge-pill:hover {
        transform: scale(1.03);
        box-shadow: 0 2px 6px rgba(0,0,0,0.18);
      }

      /* Evaluating Placeholder */
      .badge-evaluating {
        background: #f0f2f5;
        color: #65676b;
        border: 1px solid #dcdfe4;
      }

      .ai-badge-spinner {
        width: 8px;
        height: 8px;
        border: 2px solid #ccd0d5;
        border-top-color: #1877f2;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      /* Verified Provenance (Green) */
      .${BADGE_THEMES.GREEN} .ai-badge-pill {
        background: #e7f7ed;
        color: #0e7039;
        border: 1px solid #a3e2bb;
      }

      /* Platform Mediated (Amber) */
      .${BADGE_THEMES.AMBER} .ai-badge-pill {
        background: #fff8e6;
        color: #b7791f;
        border: 1px solid #fbd38d;
      }

      /* Potential Non-Compliance (Red) */
      .${BADGE_THEMES.RED} .ai-badge-pill {
        background: #fde8e8;
        color: #9b1c1c;
        border: 1px solid #f8b4b4;
      }

      /* Inconclusive / Micro-Span (Grey) */
      .${BADGE_THEMES.GREY} .ai-badge-pill {
        background: #f3f4f6;
        color: #4b5563;
        border: 1px solid #e5e7eb;
      }

      .ai-badge-icon {
        font-size: 13px;
      }

      .ai-badge-text {
        font-size: 11px;
      }

      /* Audit Drawer Modal */
      .ai-audit-drawer {
        display: none;
        position: absolute;
        top: calc(100% + 6px);
        left: 0;
        width: 280px;
        background: #ffffff;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.22);
        border: 1px solid #e5e7eb;
        z-index: 10000;
        padding: 12px;
        color: #1f2937;
      }

      .ai-audit-drawer.open {
        display: block;
        animation: fadeIn 0.2s ease-out;
      }

      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-4px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .drawer-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }

      .drawer-header h4 {
        margin: 0;
        font-size: 12px;
        font-weight: 700;
        color: #111827;
      }

      .drawer-close {
        background: none;
        border: none;
        font-size: 16px;
        cursor: pointer;
        color: #6b7280;
        padding: 0 4px;
      }

      .drawer-close:hover {
        color: #111827;
      }

      .audit-row {
        display: flex;
        justify-content: space-between;
        padding: 4px 0;
        font-size: 11px;
      }

      .row-label {
        color: #6b7280;
      }

      .row-value {
        font-weight: 600;
        color: #1f2937;
      }

      .audit-divider {
        height: 1px;
        background: #e5e7eb;
        margin: 8px 0;
      }

      .audit-legal-note {
        font-size: 10px;
        color: #9ca3af;
        line-height: 1.3;
      }
    `;
  }
}
