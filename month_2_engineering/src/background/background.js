/**
 * background.js
 * Manifest V3 Service Worker — Network Gateway & CORS Bypass.
 *
 * Coordinates cross-origin image binary retrieval for C2PA manifest inspection,
 * bypassing content-script origin isolation while strictly enforcing GDPR
 * Article 5(1)(c) Data Minimisation (credentials: 'omit', zero tracking).
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
    case 'FETCH_IMAGE_BUFFER':
    case MESSAGE_TYPES.FETCH_IMAGE_BINARY:
      handleFetchImageBuffer(payload, sendResponse);
      return true; // Keep message channel open for asynchronous reply

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
 * Encodes the binary stream to a chunked Base64 payload for rapid, low-overhead IPC transfer.
 *
 * @param {Object} payload { url: string, maxBytes?: number }
 * @param {Function} sendResponse
 */
async function handleFetchImageBuffer(payload, sendResponse) {
  const { url, maxBytes } = payload || {};

  if (!url) {
    sendResponse({ success: false, error: 'Missing image URL' });
    return;
  }

  try {
    Logger.debug('Fetching binary asset for C2PA provenance audit:', url);

    // Enforce GDPR Article 5(1)(c): credentials omitted, cache-first, referrer-stripped
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      cache: 'force-cache'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const totalBytes = arrayBuffer.byteLength;

    // Optional slicing (e.g. if content script only requests first 64KB for JUMBF pre-scan)
    let bufferToTransfer = arrayBuffer;
    if (maxBytes && maxBytes > 0 && maxBytes < totalBytes) {
      bufferToTransfer = arrayBuffer.slice(0, maxBytes);
    }

    // Convert to Base64 in safe 32KB chunks to prevent call-stack overflows
    const base64Data = arrayBufferToBase64(bufferToTransfer);

    Logger.debug(
      `Retrieved ${totalBytes} bytes (transferred ${bufferToTransfer.byteLength} bytes) for:`,
      url.slice(0, 60) + '...'
    );

    sendResponse({
      success: true,
      byteLength: totalBytes,
      transferredBytes: bufferToTransfer.byteLength,
      mimeType: response.headers.get('content-type') || 'application/octet-stream',
      base64: base64Data
    });
  } catch (err) {
    Logger.error('Failed to fetch image binary buffer:', err);
    sendResponse({ success: false, error: err.message });
  }
}

/**
 * Fast chunked Base64 encoder for ArrayBuffer.
 * Handles large binary buffers (>1MB) without Maximum Call Stack Exceeded errors.
 */
function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  const chunkSize = 0x8000; // 32KB chunks

  for (let i = 0; i < len; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + chunkSize, len)));
  }
  return btoa(binary);
}

/**
 * Routes anonymous text spans to a simulated SynthID-Text detection endpoint.
 * (Scaffold for Week 3).
 */
async function handleQueryTextWatermark(payload, sendResponse) {
  const { textSpan } = payload || {};

  if (!textSpan || textSpan.length === 0) {
    sendResponse({ success: false, error: 'Empty text span provided' });
    return;
  }

  try {
    const wordCount = textSpan.trim().split(/\s+/).length;
    const estimatedTokens = Math.round(wordCount * 1.3);

    setTimeout(() => {
      sendResponse({
        success: true,
        data: {
          estimatedTokens,
          zScore: 0.85,
          isWatermarked: false,
          confidence: 'LOW'
        }
      });
    }, 150);
  } catch (err) {
    sendResponse({ success: false, error: err.message });
  }
}
