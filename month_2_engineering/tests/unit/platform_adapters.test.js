/**
 * platform_adapters.test.js
 * Unit test suite for platform adapters and selector logic.
 * Executed via Node's native test runner (`node --test`).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

test('Real instagram_mock.html Regression Verification', async (t) => {
  const htmlPath = path.resolve(__dirname, '../mock_pages/instagram_mock.html');
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');

  await t.test('detectPlatform() resolves to INSTAGRAM via body dataset and file/localhost URL', () => {
    // 1. Verify <body data-platform="instagram"> is explicitly present in HTML
    const bodyMatch = htmlContent.match(/<body[^>]*data-platform=["']([^"']+)["']/i);
    assert.ok(bodyMatch, 'instagram_mock.html <body> must declare data-platform="instagram"');
    assert.equal(bodyMatch[1].toLowerCase(), 'instagram');

    // 2. Test DOM dataset resolution
    globalThis.document = { body: { dataset: { platform: bodyMatch[1] } } };
    globalThis.window = { location: { hostname: 'localhost', href: 'http://localhost:8080/mock_pages/instagram_mock.html' } };
    assert.equal(PlatformAdapters.detectPlatform(), PLATFORMS.INSTAGRAM);
    delete globalThis.document;

    // 3. Test direct file:// URL resolution
    globalThis.window = { location: { hostname: '', href: `file://${htmlPath}` } };
    assert.equal(PlatformAdapters.detectPlatform(), PLATFORMS.INSTAGRAM);
  });

  await t.test('Discovers all 4 mock posts with non-null anchors and valid metadata', () => {
    // Extract the 4 <article> blocks from real file
    const articleRegex = /<article\b[^>]*>([\s\S]*?)<\/article>/gi;
    const articleBlocks = [...htmlContent.matchAll(articleRegex)];
    assert.equal(articleBlocks.length, 4, 'instagram_mock.html must contain exactly 4 test posts');

    const mockArticles = articleBlocks.map((match, index) => {
      const fullArticleHtml = match[0];
      const innerArticleHtml = match[1];

      // Extract image src
      const imgSrcMatch = innerArticleHtml.match(/<img[^>]+src=["']([^"']+)["']/i);
      const imgSrc = imgSrcMatch ? imgSrcMatch[1] : '';

      // Extract caption text
      const captionMatch = innerArticleHtml.match(/<span class="_a9zs">([\s\S]*?)<\/span>/i);
      const captionText = captionMatch
        ? captionMatch[1].replace(/<[^>]+>/g, '').trim()
        : 'Sample Instagram post caption';

      // Extract native AI label if present (e.g. aria-label="AI info" or "KI-Info")
      const ariaLabelMatch = innerArticleHtml.match(/aria-label=["']([^"']+)["']/i);
      const ariaLabel = ariaLabelMatch ? ariaLabelMatch[1] : null;

      const userBlock = {
        classList: { contains: (cls) => cls === 'user-block' },
        querySelector: () => null,
        firstElementChild: {}
      };

      const header = {
        tagName: 'HEADER',
        classList: { contains: (cls) => cls === 'post-header' },
        querySelector: (sel) => {
          if (sel.includes('user')) return userBlock;
          return null;
        },
        firstElementChild: userBlock
      };

      const imgElement = {
        src: imgSrc,
        currentSrc: imgSrc,
        naturalWidth: 470,
        naturalHeight: 470
      };

      const textElement = {
        innerText: captionText
      };

      const attrElement = ariaLabel
        ? [{ getAttribute: (attr) => (attr === 'aria-label' ? ariaLabel : null) }]
        : [];

      const articleNode = {
        tagName: 'ARTICLE',
        classList: { contains: () => false },
        childNodes: [{}],
        attributes: {},
        hasAttribute: (name) => name === 'role',
        getAttribute: (name) => (name === 'role' ? 'presentation' : null),
        setAttribute: (name, val) => { articleNode.attributes[name] = val; },
        firstElementChild: header,
        querySelector: (sel) => {
          if (sel.includes('header')) return header;
          if (sel.includes('_aagv')) return { firstElementChild: imgElement };
          return null;
        },
        querySelectorAll: (sel) => {
          if (sel.includes('img')) return [imgElement];
          if (sel.includes('_a9zs') || sel.includes('span')) return [textElement];
          if (sel.includes('aria-label') || sel.includes('title')) return attrElement;
          return [];
        },
        innerText: `${captionText} ${ariaLabel || ''}`
      };

      return articleNode;
    });

    const mockRoot = {
      querySelectorAll: (sel) => {
        if (sel.includes('article')) return mockArticles;
        return [];
      },
      matches: () => false
    };

    // 1. Query all posts via platform adapter
    const discovered = PlatformAdapters.queryUninspectedPosts(PLATFORMS.INSTAGRAM, mockRoot);
    assert.equal(discovered.length, 4, 'Must discover all 4 uninspected posts');

    // 2. Validate anchor, media, and text for every discovered post
    for (let i = 0; i < discovered.length; i++) {
      const post = discovered[i];

      // Non-null anchor guaranteed
      const anchor = PlatformAdapters.getAnchorElement(PLATFORMS.INSTAGRAM, post);
      assert.ok(anchor, `Post #${i + 1} must return a non-null anchor`);

      // Media elements extracted
      const media = PlatformAdapters.extractMediaElements(PLATFORMS.INSTAGRAM, post);
      assert.ok(media.length > 0, `Post #${i + 1} must contain media`);
      assert.ok(media[0].src.startsWith('https://picsum.photos/'), `Post #${i + 1} media src must be valid`);

      // Text elements extracted
      const text = PlatformAdapters.extractTextContent(PLATFORMS.INSTAGRAM, post);
      assert.ok(text.length > 0, `Post #${i + 1} must contain non-empty text content`);
    }

    // 3. Validate EU AI Act Article 50 platform label detector on real mock contents
    assert.equal(PlatformAdapters.detectPlatformNativeLabel(PLATFORMS.INSTAGRAM, discovered[0]), true, 'Post A (AI info) must be tagged');
    assert.equal(PlatformAdapters.detectPlatformNativeLabel(PLATFORMS.INSTAGRAM, discovered[1]), true, 'Post B (KI-Info) must be tagged');
    assert.equal(PlatformAdapters.detectPlatformNativeLabel(PLATFORMS.INSTAGRAM, discovered[2]), false, 'Post C (Undisclosed) must not have native label');
    assert.equal(PlatformAdapters.detectPlatformNativeLabel(PLATFORMS.INSTAGRAM, discovered[3]), false, 'Post D (Human authentic) must not have native label');
  });
});
