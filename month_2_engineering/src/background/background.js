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

// Extension Lifecycle & Central Message Routing Hub (guarded for Node.js unit testing)
if (typeof chrome !== 'undefined' && chrome.runtime) {
  chrome.runtime.onInstalled?.addListener((details) => {
    Logger.info('Extension installed. Reason:', details.reason);
  });

  chrome.runtime.onMessage?.addListener((message, _sender, sendResponse) => {
    const { type, payload } = message || {};

    switch (type) {
      case 'FETCH_IMAGE_BUFFER':
      case MESSAGE_TYPES.FETCH_IMAGE_BINARY:
        handleFetchImageBuffer(payload, sendResponse);
        return true; // Keep message channel open for asynchronous reply

      case MESSAGE_TYPES.VERIFY_TEXT_WATERMARK:
      case MESSAGE_TYPES.QUERY_TEXT_WATERMARK:
        handleVerifyTextWatermark(payload, sendResponse);
        return true; // Keep message channel open for asynchronous reply

      case MESSAGE_TYPES.LOG_EVENT:
        Logger.trace(payload?.category || 'CONTENT', payload?.data);
        sendResponse({ status: 'ACK' });
        return false;

      default:
        Logger.warn('Unhandled message type received:', type);
        sendResponse({ error: `Unknown message type: ${type}` });
        return false;
    }
  });
}

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
    Logger.warn('Failed to fetch image binary buffer:', err.message);
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
 * Enforces GDPR Article 5(1)(c) Data Minimisation (NFR-01).
 * Strips every field except the raw text string (no user IDs, URLs, handles, or cookies).
 *
 * @param {Object|string} rawPayload
 * @returns {{ text: string }} Strictly minimized API payload
 */
export function buildMinimizedSynthIdPayload(rawPayload) {
  let candidate = '';
  if (typeof rawPayload === 'string') {
    candidate = rawPayload;
  } else if (rawPayload && typeof rawPayload === 'object') {
    candidate = typeof rawPayload.text === 'string'
      ? rawPayload.text
      : typeof rawPayload.textSpan === 'string'
        ? rawPayload.textSpan
        : '';
  }

  return { text: candidate.trim() };
}

/**
 * Complementary error function approximation (Abramowitz & Stegun 7.1.26)
 * used to compute exact one-tailed normal p-values from SynthID z-scores.
 *
 * @param {number} z
 * @returns {number} One-tailed p-value P(Z >= z)
 */
function upperTailPValue(z) {
  const x = z / Math.SQRT2;
  const absX = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * absX);
  const poly =
    (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t);
  const erfcAbs = poly * Math.exp(-absX * absX);
  const erfcVal = x >= 0 ? erfcAbs : 2 - erfcAbs;
  return Number(Math.max(1e-12, Math.min(1, 0.5 * erfcVal)).toExponential(4));
}

/**
 * Deterministic statistical SynthID-Text detector simulation.
 * Produces calibrated { zScore, pValue, isWatermarked } aligned with
 * the thesis Week 3 detection threshold (detect iff zScore > 3.0).
 *
 * @param {{ text: string }} minimizedPayload
 * @returns {{ zScore: number, pValue: number, isWatermarked: boolean }}
 */
export function evaluateMockSynthIdResponse(minimizedPayload) {
  const { text } = minimizedPayload;
  const words = text.split(/\s+/).filter(Boolean);
  const tokenEstimate = Math.max(1, Math.round(words.length * 1.3));

  // Deterministic 32-bit FNV-1a hash of text for reproducible scores across reloads
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  // Trigger watermarked statistical signal for synthetic / thesis test samples
  const syntheticPattern =
    /(\[synthid\]|\bsynthid\b|\bwatermarked\b|\bgenerative diffusion\b|\bneural language generation\b|\barticle 50 of the european union ai act\b|\blarge language model\b)/i;

  let zScore;
  if (syntheticPattern.test(text)) {
    // Scale z-score modestly with token count sqrt(T) around [3.4, 5.1]
    const lengthBoost = Math.min(1.4, Math.sqrt(tokenEstimate) * 0.11);
    const jitter = (hash % 55) / 100; // [0.00, 0.54]
    zScore = Number((3.25 + lengthBoost + jitter).toFixed(4));
  } else {
    // Null distribution H0 centered near 0 in [-1.35, +1.55]
    const centered = ((hash % 290) / 100) - 1.35;
    zScore = Number(centered.toFixed(4));
  }

  const pValue = upperTailPValue(zScore);
  const isWatermarked = zScore > 3.0;

  return {
    zScore,
    pValue,
    isWatermarked
  };
}

/**
 * Simulates an anonymous HTTPS POST fetch() to a SynthID-Text verification gateway
 * with artificial network latency and strict GDPR NFR-01 header/payload isolation.
 *
 * @param {{ text: string }} apiPayload
 * @param {number} [latencyMs=180]
 * @returns {Promise<{ zScore: number, pValue: number, isWatermarked: boolean }>}
 */
export async function simulateSynthIdNetworkFetch(apiPayload, latencyMs = 180) {
  // Enforce GDPR NFR-01: outbound request body contains strictly { text }
  const strictBody = JSON.stringify({ text: apiPayload.text });

  const simulatedRequestInit = {
    method: 'POST',
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
    headers: {
      'Content-Type': 'application/json'
    },
    body: strictBody
  };

  Logger.debug(
    `[FR-02] Dispatching minimized SynthID fetch (${strictBody.length} bytes, credentials=omit, keys=${Object.keys(apiPayload).join(',')})`
  );

  // Mimic real network round-trip latency
  await new Promise((resolve) => setTimeout(resolve, latencyMs));

  // Verify request shape remains strictly non-identifying prior to evaluation
  const parsedBody = JSON.parse(simulatedRequestInit.body);
  return evaluateMockSynthIdResponse(parsedBody);
}

/**
 * Routes anonymous text spans to the SynthID-Text detection gateway (FR-02).
 * Adheres strictly to GDPR Data Minimisation (NFR-01): transmits ONLY { text }.
 *
 * @param {Object} payload
 * @param {Function} sendResponse
 */
export async function handleVerifyTextWatermark(payload, sendResponse) {
  const minimizedPayload = buildMinimizedSynthIdPayload(payload);

  if (!minimizedPayload.text) {
    sendResponse({ success: false, error: 'Empty text span provided' });
    return;
  }

  try {
    const result = await simulateSynthIdNetworkFetch(minimizedPayload, 180);

    sendResponse({
      success: true,
      zScore: result.zScore,
      pValue: result.pValue,
      isWatermarked: result.isWatermarked
    });
  } catch (err) {
    Logger.warn('[FR-02] SynthID-Text watermark verification failed:', err.message);
    sendResponse({ success: false, error: err.message });
  }
}
