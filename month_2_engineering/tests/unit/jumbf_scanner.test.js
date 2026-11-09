/**
 * jumbf_scanner.test.js
 * Unit test suite for high-speed C2PA JUMBF pre-scanner.
 * Executed via Node.js native test runner (`node --test`).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load JumbfScanner into global scope
globalThis.AITransparency = globalThis.AITransparency || {};
await import('../../src/modules/jumbf_scanner.js');
const { JumbfScanner } = globalThis.AITransparency;

test('JUMBF Pre-Scanner Synthetic Signatures', async (t) => {
  await t.test('detects JPEG APP11 JUMBF signature (FF EB ... JP\\0\\0)', () => {
    // Construct minimal JPEG with APP11 marker and JUMBF magic
    const buf = new Uint8Array([
      0xff, 0xd8, // SOI
      0xff, 0xeb, // APP11
      0x00, 0x08, // length = 8 bytes
      0x4a, 0x50, 0x00, 0x00, // 'JP\0\0' magic
      0x00, 0x00, // payload padding
      0xff, 0xd9  // EOI
    ]);
    assert.equal(JumbfScanner.hasPossibleC2PAMetadata(buf), true);
  });

  await t.test('detects PNG caBX chunk', () => {
    // Construct minimal PNG header with caBX chunk
    const buf = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG Signature
      0x00, 0x00, 0x00, 0x04, // Chunk length 4
      0x63, 0x61, 0x42, 0x58, // 'caBX'
      0x01, 0x02, 0x03, 0x04, // data
      0xaa, 0xbb, 0xcc, 0xdd  // CRC
    ]);
    assert.equal(JumbfScanner.hasPossibleC2PAMetadata(buf), true);
  });

  await t.test('detects WebP with caBX chunk', () => {
    // Construct minimal WebP header with caBX
    const buf = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, // 'RIFF'
      0x20, 0x00, 0x00, 0x00, // size
      0x57, 0x45, 0x42, 0x50, // 'WEBP'
      0x63, 0x61, 0x42, 0x58, // 'caBX' FourCC
      0x04, 0x00, 0x00, 0x00, // size 4
      0x00, 0x00, 0x00, 0x00  // data
    ]);
    assert.equal(JumbfScanner.hasPossibleC2PAMetadata(buf), true);
  });

  await t.test('returns false for plain JPEG without APP11', () => {
    const plainJpeg = new Uint8Array([
      0xff, 0xd8, // SOI
      0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, // APP0 JFIF
      0xff, 0xda, 0x00, 0x02, // SOS
      0xff, 0xd9  // EOI
    ]);
    assert.equal(JumbfScanner.hasPossibleC2PAMetadata(plainJpeg), false);
  });

  await t.test('returns false for empty or tiny buffer', () => {
    assert.equal(JumbfScanner.hasPossibleC2PAMetadata(new Uint8Array([])), false);
    assert.equal(JumbfScanner.hasPossibleC2PAMetadata(new Uint8Array([0x01, 0x02])), false);
  });
});

test('JUMBF Pre-Scanner against Real Thesis Test Assets', async (t) => {
  const signedAssetPath = path.resolve(__dirname, '../../../docs/month_1/test_assets/signed_test_image.jpg');
  const strippedAssetPath = path.resolve(__dirname, '../../../docs/month_1/test_results/facebook_feed_jpeg_high/output.jpg');

  if (fs.existsSync(signedAssetPath)) {
    await t.test('detects JUMBF in C2PA-signed test asset', () => {
      const buffer = fs.readFileSync(signedAssetPath);
      assert.equal(JumbfScanner.hasPossibleC2PAMetadata(buffer), true);
    });
  }

  if (fs.existsSync(strippedAssetPath)) {
    await t.test('confirms total absence of JUMBF in Meta CDN-stripped asset', () => {
      const buffer = fs.readFileSync(strippedAssetPath);
      assert.equal(JumbfScanner.hasPossibleC2PAMetadata(buffer), false);
    });
  }
});
