/**
 * constants.js
 * Central enumeration of platform identifiers, message actions,
 * compliance states, and DOM configuration selectors.
 *
 * Thesis: "AI Transparency in the Wild: Bridging Technical Provenance
 * and Legal Compliance under the EU AI Act on Social Media Platforms"
 */

export const PLATFORMS = {
  FACEBOOK: 'facebook',
  INSTAGRAM: 'instagram',
  WHATSAPP: 'whatsapp',
  UNKNOWN: 'unknown'
};

export const MESSAGE_TYPES = {
  FETCH_IMAGE_BINARY: 'FETCH_IMAGE_BINARY',
  QUERY_TEXT_WATERMARK: 'QUERY_TEXT_WATERMARK',
  EVALUATE_COMPLIANCE: 'EVALUATE_COMPLIANCE',
  LOG_EVENT: 'LOG_EVENT'
};

export const PROVENANCE_SIGNAL = {
  VERIFIED_C2PA: 'VERIFIED_C2PA',
  WATERMARK_DETECTED: 'WATERMARK_DETECTED',
  PLATFORM_LABEL_DETECTED: 'PLATFORM_LABEL_DETECTED',
  INSUFFICIENT_LENGTH: 'INSUFFICIENT_LENGTH',
  NO_SIGNAL: 'NO_SIGNAL',
  ERROR: 'ERROR'
};

export const COMPLIANCE_STATUS = {
  COMPLIANT: 'COMPLIANT',                 // Art. 50(2) & 50(4) fully met
  PLATFORM_MEDIATED: 'PLATFORM_MEDIATED', // Meta label present, but cryptographic proof stripped
  POTENTIAL_NON_COMPLIANCE: 'POTENTIAL_NON_COMPLIANCE', // AI signal detected without required disclosure
  EXEMPT_EDITORIAL: 'EXEMPT_EDITORIAL',   // Art. 50(4b) human editorial control exemption
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA'  // Micro-spans (T < 50) where testing is inconclusive
};

export const BADGE_THEMES = {
  GREEN: 'badge-verified',
  AMBER: 'badge-platform',
  RED: 'badge-undisclosed',
  GREY: 'badge-inconclusive'
};

export const EXTENSION_CONFIG = {
  INSPECTION_ATTRIBUTE: 'data-ai-transparency-inspected',
  CONTAINER_CLASS: 'ai-transparency-badge-host',
  VIEWPORT_ROOT_MARGIN: '150px 0px 150px 0px',
  INTERSECTION_THRESHOLD: 0.1,
  THROTTLE_DEBOUNCE_MS: 150
};

