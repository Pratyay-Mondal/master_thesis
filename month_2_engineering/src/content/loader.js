/**
 * loader.js
 * Content script ES module bootstrap loader.
 *
 * Manifest V3 content scripts do not natively execute as ES modules.
 * This bootstrap script dynamically imports the main content script module,
 * enabling modern ES6 import/export syntax in the unpacked extension.
 */

(async () => {
  try {
    const scriptUrl = chrome.runtime.getURL('src/content/content_script.js');
    await import(scriptUrl);
  } catch (err) {
    console.error('[AI-Transparency-Validator] Failed to dynamically bootstrap content script:', err);
  }
})();

