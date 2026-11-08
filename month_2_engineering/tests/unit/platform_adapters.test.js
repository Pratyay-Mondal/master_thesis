/**
 * platform_adapters.test.js
 * Unit test suite for platform adapters and selector logic.
 * Executed via Node's native test runner (`node --test`).
 */

import test from 'node:test';
import assert from 'node:assert/strict';

// Load platform_adapters into global scope
globalThis.window = { location: { hostname: 'www.facebook.com', href: 'https://www.facebook.com' } };
await import('../../src/content/platform_adapters.js');

const { PlatformAdapters } = globalThis.AITransparency;
const { PLATFORMS } = PlatformAdapters;

test('Platform Detection Strategy', async (t) => {
  await t.test('detects Facebook from hostname', () => {
    globalThis.window = { location: { hostname: 'www.facebook.com', href: 'https://www.facebook.com' } };
    assert.equal(PlatformAdapters.detectPlatform(), PLATFORMS.FACEBOOK);
  });

  await t.test('detects Facebook from mock page URL', () => {
    globalThis.window = { location: { hostname: '', href: 'file:///tests/mock_pages/facebook_mock.html' } };
    assert.equal(PlatformAdapters.detectPlatform(), PLATFORMS.FACEBOOK);
  });

  await t.test('detects Instagram from hostname', () => {
    globalThis.window = { location: { hostname: 'instagram.com', href: 'https://www.instagram.com' } };
    assert.equal(PlatformAdapters.detectPlatform(), PLATFORMS.INSTAGRAM);
  });

  await t.test('detects Instagram from mock page URL', () => {
    globalThis.window = { location: { hostname: '', href: 'file:///tests/mock_pages/instagram_mock.html' } };
    assert.equal(PlatformAdapters.detectPlatform(), PLATFORMS.INSTAGRAM);
  });

  await t.test('detects WhatsApp from hostname', () => {
    globalThis.window = { location: { hostname: 'web.whatsapp.com', href: 'https://web.whatsapp.com' } };
    assert.equal(PlatformAdapters.detectPlatform(), PLATFORMS.WHATSAPP);
  });

  await t.test('returns UNKNOWN for third-party hostnames', () => {
    globalThis.window = { location: { hostname: 'example.com', href: 'https://example.com' } };
    assert.equal(PlatformAdapters.detectPlatform(), PLATFORMS.UNKNOWN);
  });
});

test('Post Selector Coverage', async (t) => {
  await t.test('returns non-empty array of selectors for all target platforms', () => {
    for (const platform of [PLATFORMS.FACEBOOK, PLATFORMS.INSTAGRAM, PLATFORMS.WHATSAPP]) {
      const selectors = PlatformAdapters.getPostSelectors(platform);
      assert.ok(Array.isArray(selectors));
      assert.ok(selectors.length > 0);
      assert.ok(selectors.some(s => s.includes('article') || s.includes('row')));
    }
  });
});

test('Platform Native Label Detection', async (t) => {
  await t.test('identifies "Made with AI" in post text', () => {
    const mockPost = {
      innerText: 'This is a beautiful photograph. (Made with AI)',
      querySelectorAll: () => []
    };
    assert.equal(PlatformAdapters.detectPlatformNativeLabel(PLATFORMS.FACEBOOK, mockPost), true);
  });

  await t.test('identifies localized German "Mit KI erstellt" in aria-label', () => {
    const mockPost = {
      innerText: 'Guten Tag!',
      querySelectorAll: () => [{
        getAttribute: (attr) => (attr === 'aria-label' ? 'Mit KI erstellt' : null)
      }]
    };
    assert.equal(PlatformAdapters.detectPlatformNativeLabel(PLATFORMS.FACEBOOK, mockPost), true);
  });

  await t.test('returns false when no AI label is present', () => {
    const mockPost = {
      innerText: 'Just a normal day in Wurzburg.',
      querySelectorAll: () => []
    };
    assert.equal(PlatformAdapters.detectPlatformNativeLabel(PLATFORMS.FACEBOOK, mockPost), false);
  });
});
