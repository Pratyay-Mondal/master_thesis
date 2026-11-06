/**
 * background.js
 * Manifest V3 Service Worker.
 *
 * Coordinates cross-origin network operations, offscreen tasks,
 * binary media fetching for C2PA manifest parsing, and privacy-preserving
 * API dispatching.
 *
 * Enforces GDPR Article 5(1)(c) Data Minimisation by stripping referrers,
 * cookies, and user IDs before network dispatch.
 *
 * Thesis: "AI Transparency in the Wild: Bridging Technical Provenance
 * and Legal Compliance under the EU AI Act on Social Media Platforms"
 */

import { MESSAGE_TYPES } from '../common/constants.js';
import { Logger } from '../common/logger.js';

Logger.info('Service Worker initialized for AI Transparency & Provenance Validator.');

// Extension Lifecycle: Install & Activate
chrome.runtime.onInstalled.addListener((details) => {
  Logger.info('Extension installed. Reason:', details.reason);
});

// Central Message Routing Hub
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { type, payload } = message;

  switch (type) {
    case MESSAGE_TYPES.FETCH_IMAGE_BINARY:
      handleFetchImageBinary(payload, sendResponse);
      return true; // Keep message channel open for async response

    case MESSAGE_TYPES.QUERY_TEXT_WATERMARK:
      handleQueryTextWatermark(payload, sendResponse);
      return true;

    case MESSAGE_TYPES.LOG_EVENT:
      Logger.trace(payload.category || 'CONTENT', payload.data);
      sendResponse({ status: 'ACK' });
      return false;

    default:
      Logger.warn('Unhandled message type received:', type);
      sendResponse({ error: `Unknown message type: ${type}` });
      return false;
  }
});

/**
 * Fetches image binary bytes bypassing content-script CORS restrictions.
 * Converts response to an Array of byte numbers for IPC transfer.
 *
 * @param {Object} payload { url: string }
 * @param {Function} sendResponse
 */
async function handleFetchImageBinary(payload, sendResponse) {
  const { url } = payload;

  if (!url) {
    sendResponse({ success: false, error: 'Missing image URL' });
    return;
  }

  try {
    Logger.debug('Fetching binary asset for C2PA inspection:', url);

    // Fetch without credentials (cookies, auth headers) to uphold privacy NFRs
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'omit',
      cache: 'force-cache'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const bytes = Array.from(new Uint8Array(arrayBuffer));

    Logger.debug(`Successfully retrieved ${bytes.length} bytes for asset.`);

    sendResponse({
      success: true,
      byteLength: bytes.length,
      bytes: bytes.slice(0, 1024 * 64) // Return first 64KB for initial JUMBF header check
    });
  } catch (err) {
    Logger.error('Failed to fetch image binary:', err);
    sendResponse({ success: false, error: err.message });
  }
}

/**
 * Routes anonymous text spans to a simulated SynthID-Text detection endpoint.
 * (Scaffold for Week 3).
 *
 * @param {Object} payload { textSpan: string }
 * @param {Function} sendResponse
 */
async function handleQueryTextWatermark(payload, sendResponse) {
  const { textSpan } = payload;

  if (!textSpan || textSpan.length === 0) {
    sendResponse({ success: false, error: 'Empty text span provided' });
    return;
  }

  try {
    // In Week 3, this will communicate with local simulator or verified endpoint
    // For Week 1 scaffold, we return mock response adhering to the API contract
    const wordCount = textSpan.trim().split(/\s+/).length;
    const estimatedTokens = Math.round(wordCount * 1.3);

    Logger.debug(`Auditing text watermark for span with estimated ${estimatedTokens} tokens.`);

    // Simulate network delay
    setTimeout(() => {
      sendResponse({
        success: true,
        data: {
          estimatedTokens,
          zScore: 0.85, // Default baseline null
          isWatermarked: false,
          confidence: 'LOW',
          note: 'Scaffold response from Week 1 service worker'
        }
      });
    }, 200);
  } catch (err) {
    Logger.error('Failed to query text watermark:', err);
    sendResponse({ success: false, error: err.message });
  }
}

