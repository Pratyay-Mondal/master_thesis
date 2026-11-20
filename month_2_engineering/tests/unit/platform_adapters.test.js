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

  await t.test('detects platform from document.body.dataset.platform override', () => {
    globalThis.document = { body: { dataset: { platform: 'instagram' } } };
    globalThis.window = { location: { hostname: 'localhost', href: 'http://localhost:3000' } };
    assert.equal(PlatformAdapters.detectPlatform(), PLATFORMS.INSTAGRAM);
    delete globalThis.document;
  });

  await t.test('detects Instagram on localhost from pathname', () => {
    globalThis.window = { location: { hostname: 'localhost', pathname: '/mock_pages/instagram_mock.html', href: 'http://localhost:8080/mock_pages/instagram_mock.html' } };
    assert.equal(PlatformAdapters.detectPlatform(), PLATFORMS.INSTAGRAM);
  });

  await t.test('falls back to Facebook on bare localhost when path is generic', () => {
    globalThis.window = { location: { hostname: 'localhost', pathname: '/', href: 'http://localhost:3000/' } };
    assert.equal(PlatformAdapters.detectPlatform(), PLATFORMS.FACEBOOK);
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

  await t.test('identifies modern Meta "AI info" label in post header link', () => {
    const mockPost = {
      innerText: 'European AI Observatory\n2h · AI info',
      querySelectorAll: () => []
    };
    assert.equal(PlatformAdapters.detectPlatformNativeLabel(PLATFORMS.FACEBOOK, mockPost), true);
  });

  await t.test('identifies localized German "KI-Info" in sub-header span', () => {
    const mockPost = {
      innerText: 'Kreativ Studio München',
      querySelectorAll: () => [{
        getAttribute: (attr) => (attr === 'aria-label' ? 'KI-Info' : null)
      }]
    };
    assert.equal(PlatformAdapters.detectPlatformNativeLabel(PLATFORMS.INSTAGRAM, mockPost), true);
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

  await t.test('identifies case-insensitive "AI INFO" in title or aria-description', () => {
    const mockPost = {
      innerText: 'Photo from feed',
      querySelectorAll: () => [{
        getAttribute: (attr) => (attr === 'title' ? '🤖 AI INFO' : null)
      }]
    };
    assert.equal(PlatformAdapters.detectPlatformNativeLabel(PLATFORMS.FACEBOOK, mockPost), true);
  });

  await t.test('returns false when no AI label is present (safe against lookalikes like Hawaii info)', () => {
    const mockPost = {
      innerText: 'Just a normal day in Wurzburg. Looking for Hawaii info or sending email info.',
      querySelectorAll: () => []
    };
    assert.equal(PlatformAdapters.detectPlatformNativeLabel(PLATFORMS.FACEBOOK, mockPost), false);
  });
});

test('WhatsApp Message Container Deduplication', async (t) => {
  await t.test('drops outer div[role="row"] when inner message bubble is present in candidates', () => {
    const mockBubble = {
      classList: { contains: (cls) => cls === 'message-in' },
      childNodes: [{}],
      hasAttribute: () => false,
      getAttribute: () => null,
      parentElement: null,
      contains: (other) => other === mockBubble
    };

    const mockRow = {
      classList: { contains: () => false },
      childNodes: [mockBubble],
      hasAttribute: () => false,
      getAttribute: () => null,
      parentElement: null,
      contains: (other) => other === mockBubble || other === mockRow
    };

    mockBubble.parentElement = mockRow;

    const mockRoot = {
      querySelectorAll: () => [mockRow, mockBubble],
      matches: () => false
    };

    const candidates = PlatformAdapters.queryUninspectedPosts(PLATFORMS.WHATSAPP, mockRoot);

    // Exactly one candidate returned: the inner bubble, dropping the outer row
    assert.equal(candidates.length, 1);
    assert.equal(candidates[0], mockBubble);
  });

  await t.test('getAnchorElement returns bubble directly when postNode is a message bubble', () => {
    const mockBubble = {
      classList: { contains: (cls) => cls === 'message-in' }
    };
    const anchor = PlatformAdapters.getAnchorElement(PLATFORMS.WHATSAPP, mockBubble);
    assert.equal(anchor, mockBubble);
  });
});
