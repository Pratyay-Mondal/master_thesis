/**
 * text_provenance.test.js
 * Comprehensive unit test suite for Week 3 Text Provenance Module (FR-02):
 * - TextExtractor (boilerplate filtering, nested node deduplication)
 * - TextAnalyzer (BPE token count estimation, character n-gram Shannon entropy)
 * - Background API Router (GDPR NFR-01 Data Minimisation, mock SynthID scoring)
 * - TextProvenanceCoordinator (end-to-end 50-token / entropy gating & IPC routing)
 */

import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.AITransparency = globalThis.AITransparency || {};
await import('../../src/modules/text_extractor.js');
await import('../../src/modules/text_analyzer.js');
await import('../../src/modules/text_provenance.js');
const {
  buildMinimizedSynthIdPayload,
  evaluateMockSynthIdResponse,
  handleVerifyTextWatermark
} = await import('../../src/background/background.js');

const { TextExtractor, TextAnalyzer, TextProvenance } = globalThis.AITransparency;

/**
 * Helper to create a minimal DOM-like element mock without external dependencies.
 */
function createMockNode({ innerText = '', isExcluded = false, descendants = [], children = [] } = {}) {
  const node = {
    innerText,
    textContent: innerText,
    children,
    contains: (other) => descendants.includes(other) || node === other,
    closest: () => (isExcluded ? node : null)
  };
  return node;
}

function createMockPost(nodes, extraChildren = []) {
  const post = {
    children: extraChildren,
    contains: () => true,
    querySelectorAll: () => nodes
  };
  return post;
}

test('TextExtractor: Boilerplate Filtering & Normalization', async (t) => {
  await t.test('extracts core post caption while stripping UI chrome, timestamps, and handles', () => {
    const bodyNode = createMockNode({
      innerText:
        'Like\nComment\n2h\n@alice_dev\nArticle 50 of the European Union AI Act requires transparent marking.\n1.2K likes\nSee more\nMade with AI'
    });
    const headerNode = createMockNode({
      innerText: 'Alice Developer',
      isExcluded: true
    });

    const post = createMockPost([headerNode, bodyNode]);
    const extracted = TextExtractor.extractPostText('facebook', post);

    assert.equal(
      extracted,
      'Article 50 of the European Union AI Act requires transparent marking.'
    );
  });

  await t.test('deduplicates nested React virtual DOM text nodes', () => {
    const innerSpan = createMockNode({
      innerText: 'Clean social media post about generative models.'
    });
    const outerDiv = createMockNode({
      innerText: 'Clean social media post about generative models.',
      descendants: [innerSpan]
    });

    const post = createMockPost([outerDiv, innerSpan]);
    const extracted = TextExtractor.extractPostText('facebook', post);

    assert.equal(extracted, 'Clean social media post about generative models.');
  });

  await t.test('strips invisible zero-width joiners and collapses redundant spaces', () => {
    const node = createMockNode({
      innerText: 'Hello\u200B   world!\r\n\r\nReply\r\nYesterday at 10:45 AM\r\nActual   content.'
    });
    const post = createMockPost([node]);
    assert.equal(TextExtractor.extractPostText('whatsapp', post), 'Hello world!\nActual content.');
  });
});

test('TextAnalyzer: Token Estimation & Character N-Gram Entropy', async (t) => {
  await t.test('flags short captions below 50-token threshold', () => {
    const shortCaption = 'Just saw an amazing sunset at the beach today!';
    const tokens = TextAnalyzer.estimateTokenCount(shortCaption);
    assert.ok(tokens < 50, `Expected < 50 tokens, got ${tokens}`);
  });

  await t.test('estimates >= 50 tokens for substantial prose paragraphs', () => {
    const longProse =
      'Article 50 of the European Union AI Act mandates that providers of generative artificial intelligence systems ensure synthetic text, audio, image, and video outputs are marked in a machine-readable format and detectable as artificially generated across digital distribution channels.';
    const analysis = TextAnalyzer.analyzeText(longProse);
    assert.ok(analysis.tokenCount >= 50, `Expected >= 50 tokens, got ${analysis.tokenCount}`);
    assert.equal(analysis.isSufficientLength, true);
    assert.equal(analysis.isLowEntropy, false);
    assert.equal(analysis.eligibleForApi, true);
  });

  await t.test('identifies low-entropy repetitive emoji spam (surrogate-pair safe)', () => {
    const emojiFlood = '🔥'.repeat(35);
    const analysis = TextAnalyzer.analyzeText(emojiFlood);
    assert.equal(analysis.unigramEntropy, 0);
    assert.equal(analysis.bigramEntropy, 0);
    assert.equal(analysis.isLowEntropy, true);
    assert.equal(analysis.eligibleForApi, false);
  });

  await t.test('identifies lower conditional entropy in deterministic Python code vs creative prose', () => {
    const prose =
      'The ancient lighthouse stood sentinel against the churning sea, its golden beam slicing effortlessly through swirling winter fog while distant cargo vessels navigated the rocky shoals.';
    const code =
      'def fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)\n\nfor i in range(10):\n    print(fibonacci(i))\nfor i in range(10):\n    print(fibonacci(i))';

    const proseStats = TextAnalyzer.analyzeText(prose);
    const codeStats = TextAnalyzer.analyzeText(code);

    assert.ok(
      codeStats.conditionalEntropy < proseStats.conditionalEntropy,
      `Expected code conditional entropy (${codeStats.conditionalEntropy}) < prose (${proseStats.conditionalEntropy})`
    );
    assert.equal(codeStats.isLowEntropy, true);
    assert.equal(proseStats.isLowEntropy, false);
  });
});

test('Background Service Worker: GDPR NFR-01 Data Minimisation & SynthID Mock API', async (t) => {
  await t.test('strips tracking metadata and retains strictly { text }', () => {
    const dirtyPayload = {
      text: 'Test synthetic disclosure text',
      userId: 'fb_user_12345',
      postUrl: 'https://www.facebook.com/user/posts/999',
      cookies: 'c_user=12345',
      author: 'John Doe'
    };

    const minimized = buildMinimizedSynthIdPayload(dirtyPayload);
    assert.deepEqual(Object.keys(minimized), ['text']);
    assert.equal(minimized.text, 'Test synthetic disclosure text');
  });

  await t.test('returns { zScore, pValue, isWatermarked } from VERIFY_TEXT_WATERMARK handler', async () => {
    const aiText =
      'Article 50 of the European Union AI Act requires generative diffusion and large language models to embed machine-readable provenance watermarks such as SynthID across distributed captions and long-form social posts.';

    const response = await new Promise((resolve) => {
      handleVerifyTextWatermark({ text: aiText, userId: 'should_be_stripped' }, resolve);
    });

    assert.equal(response.success, true);
    assert.equal(typeof response.zScore, 'number');
    assert.equal(typeof response.pValue, 'number');
    assert.equal(typeof response.isWatermarked, 'boolean');
    assert.ok(response.zScore > 3.0);
    assert.equal(response.isWatermarked, true);
  });
});

test('TextProvenanceCoordinator: End-to-End Pipeline (FR-02)', async (t) => {
  await t.test('returns NO_TEXT when post container has no inspectable text', async () => {
    const post = createMockPost([]);
    const res = await TextProvenance.auditTextProvenance('facebook', post);
    assert.equal(res.status, 'NO_TEXT');
    assert.equal(res.tokenCount, 0);
    assert.equal(res.isWatermarked, false);
  });

  await t.test('gates micro-spans (< 50 tokens) without invoking chrome.runtime.sendMessage', async () => {
    let ipcCalled = false;
    globalThis.chrome = {
      runtime: {
        sendMessage: () => {
          ipcCalled = true;
        }
      }
    };

    const post = createMockPost([
      createMockNode({ innerText: 'Short caption with fewer than twenty tokens.' })
    ]);
    const res = await TextProvenance.auditTextProvenance('facebook', post);

    assert.equal(res.status, 'INSUFFICIENT_LENGTH');
    assert.ok(res.tokenCount < 50);
    assert.equal(ipcCalled, false);
  });

  await t.test('dispatches strictly minimized { text } payload for >= 50 token watermarked prose', async () => {
    let capturedMessage = null;
    globalThis.chrome = {
      runtime: {
        lastError: null,
        sendMessage: (message, cb) => {
          capturedMessage = message;
          const mockRes = evaluateMockSynthIdResponse(message.payload);
          cb({ success: true, ...mockRes });
        }
      }
    };

    const syntheticLongText =
      'Article 50 of the European Union AI Act explicitly mandates detectable machine-readable provenance signals whenever generative artificial intelligence and large language models synthesize public commentary across major online social media platforms, ensuring European citizens can reliably distinguish synthetic outputs from authentic human editorial authorship in everyday feeds.';
    const post = createMockPost([createMockNode({ innerText: syntheticLongText })]);

    const res = await TextProvenance.auditTextProvenance('facebook', post);

    assert.equal(capturedMessage.type, 'VERIFY_TEXT_WATERMARK');
    assert.deepEqual(Object.keys(capturedMessage.payload), ['text']);
    assert.equal(res.status, 'WATERMARK_DETECTED');
    assert.equal(res.isWatermarked, true);
    assert.ok(res.zScore > 3.0);
    assert.ok(res.pValue < 0.005);
  });

  await t.test('returns NO_WATERMARK for >= 50 token human prose', async () => {
    globalThis.chrome = {
      runtime: {
        lastError: null,
        sendMessage: (message, cb) => {
          const mockRes = evaluateMockSynthIdResponse(message.payload);
          cb({ success: true, ...mockRes });
        }
      }
    };

    const humanLongText =
      'We spent the entire Saturday morning walking along the Main riverfront in Würzburg before climbing up to the Marienberg Fortress overlook, where autumn sunlight lit up the surrounding Franconian vineyards and historic stone bridges across the valley.';
    const post = createMockPost([createMockNode({ innerText: humanLongText })]);

    const res = await TextProvenance.auditTextProvenance('facebook', post);

    assert.equal(res.status, 'NO_WATERMARK');
    assert.equal(res.isWatermarked, false);
    assert.ok(res.zScore <= 3.0);
  });
});
