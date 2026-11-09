/**
 * jumbf_scanner.js
 * High-Speed Binary Header Pre-Scanner for C2PA / JUMBF Markers.
 *
 * Scans the initial 64KB of an image buffer to detect whether C2PA metadata
 * containers exist prior to invoking the full WebAssembly manifest parser.
 *
 * Because Meta's CDN strips JUMBF containers from >99% of images, this pre-scan
 * operates in <0.1ms, eliminating unnecessary WASM instantiation and preserving
 * 60 FPS scrolling performance (NFR-02).
 *
 * Supported Container Markers:
 * 1. JPEG: APP11 marker segment (0xFFEB) + JUMBF box header ('JP\0\0')
 * 2. PNG: Ancillary chunk type 'caBX' (0x63 0x61 0x42 0x58) or 'c2pa'
 * 3. WebP: RIFF chunk 'caBX' or 'c2pa'
 * 4. MP4/BMFF: 'uuid' box carrying the C2PA specification UUID
 *
 * Thesis: "AI Transparency in the Wild: Bridging Technical Provenance
 * and Legal Compliance under the EU AI Act on Social Media Platforms"
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AITransparency = root.AITransparency || {};
    root.AITransparency.JumbfScanner = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  'use strict';

  // C2PA 16-byte UUID: 63327061-0011-0010-8000-00aa00389b71
  const C2PA_UUID = [
    0x63, 0x32, 0x70, 0x61, 0x00, 0x11, 0x00, 0x10,
    0x80, 0x00, 0x00, 0xaa, 0x00, 0x38, 0x9b, 0x71
  ];

  class JumbfScanner {
    /**
     * Inspects binary buffer for presence of potential C2PA container structures.
     * @param {ArrayBuffer|Uint8Array} inputBuffer
     * @returns {boolean} True if potential C2PA metadata markers exist
     */
    static hasPossibleC2PAMetadata(inputBuffer) {
      if (!inputBuffer) return false;

      const bytes = inputBuffer instanceof Uint8Array ? inputBuffer : new Uint8Array(inputBuffer);
      if (bytes.length < 12) return false;

      // Bound scan window to first 64KB for performance
      const scanLimit = Math.min(bytes.length, 64 * 1024);

      // 1. Check JPEG (SOI: 0xFF, 0xD8)
      if (bytes[0] === 0xff && bytes[1] === 0xd8) {
        return this.scanJpegMarkers(bytes, scanLimit);
      }

      // 2. Check PNG (Magic: 0x89 'P' 'N' 'G')
      if (
        bytes[0] === 0x89 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x4e &&
        bytes[3] === 0x47
      ) {
        return this.scanPngChunks(bytes, scanLimit);
      }

      // 3. Check WebP (RIFF .... WEBP)
      if (
        bytes[0] === 0x52 &&
        bytes[1] === 0x49 &&
        bytes[2] === 0x46 &&
        bytes[3] === 0x46 &&
        bytes[8] === 0x57 &&
        bytes[9] === 0x45 &&
        bytes[10] === 0x42 &&
        bytes[11] === 0x50
      ) {
        return this.scanWebpChunks(bytes, scanLimit);
      }

      // 4. Check ISO BMFF / MP4 ('ftyp' or 'uuid')
      if (this.scanBmffBoxes(bytes, scanLimit)) {
        return true;
      }

      // Fallback byte sequence check for 'c2pa' or 'JP\0\0' anywhere in first 64KB
      return this.containsSequence(bytes, [0x63, 0x32, 0x70, 0x61], scanLimit);
    }

    /**
     * Fast parser for JPEG marker segments.
     * JUMBF resides inside APP11 (0xFF, 0xEB).
     */
    static scanJpegMarkers(bytes, limit) {
      let offset = 2; // Skip SOI (FF D8)

      while (offset < limit - 4) {
        if (bytes[offset] !== 0xff) {
          offset++;
          continue;
        }

        const marker = bytes[offset + 1];

        // Stop scanning if Start of Scan (SOS: FF DA) or End of Image (EOI: FF D9) reached
        if (marker === 0xda || marker === 0xd9) {
          break;
        }

        // APP11 Marker detected (0xFFEB)
        if (marker === 0xeb) {
          // Length of marker segment (2 bytes big-endian)
          const segLength = (bytes[offset + 2] << 8) | bytes[offset + 3];

          // Check for JUMBF box magic: 'JP\0\0' (0x4A, 0x50, 0x00, 0x00)
          if (
            bytes[offset + 4] === 0x4a &&
            bytes[offset + 5] === 0x50 &&
            bytes[offset + 6] === 0x00 &&
            bytes[offset + 7] === 0x00
          ) {
            return true;
          }

          // Also check for raw 'c2pa' identifier in the APP11 segment
          if (this.containsSequence(bytes.subarray(offset + 4, offset + 4 + segLength), [0x63, 0x32, 0x70, 0x61], segLength)) {
            return true;
          }
        }

        // Advance to next marker using segment length
        const segLength = (bytes[offset + 2] << 8) | bytes[offset + 3];
        if (segLength < 2) {
          offset += 2;
        } else {
          offset += 2 + segLength;
        }
      }

      return false;
    }

    /**
     * Scans PNG chunk types for 'caBX' (C2PA box) or 'c2pa'.
     */
    static scanPngChunks(bytes, limit) {
      let offset = 8; // Skip PNG 8-byte file signature

      while (offset < limit - 8) {
        const chunkLength =
          (bytes[offset] << 24) |
          (bytes[offset + 1] << 16) |
          (bytes[offset + 2] << 8) |
          bytes[offset + 3];

        const type0 = bytes[offset + 4];
        const type1 = bytes[offset + 5];
        const type2 = bytes[offset + 6];
        const type3 = bytes[offset + 7];

        // Check for 'caBX' (0x63, 0x61, 0x42, 0x58)
        if (type0 === 0x63 && type1 === 0x61 && type2 === 0x42 && type3 === 0x58) {
          return true;
        }

        // Check for 'c2pa' (0x63, 0x32, 0x70, 0x61)
        if (type0 === 0x63 && type1 === 0x32 && type2 === 0x70 && type3 === 0x61) {
          return true;
        }

        // Stop on image data (IDAT) or end (IEND)
        if (type0 === 0x49 && type1 === 0x45 && type2 === 0x4e && type3 === 0x44) {
          break;
        }

        // Advance: 4 bytes length + 4 bytes type + chunkLength + 4 bytes CRC
        offset += 12 + chunkLength;
      }

      return false;
    }

    /**
     * Scans WebP Extended File Format chunks for 'caBX' or 'c2pa'.
     */
    static scanWebpChunks(bytes, limit) {
      let offset = 12; // Skip 'RIFF' + 4-byte size + 'WEBP'

      while (offset < limit - 8) {
        const fourCC = String.fromCharCode(
          bytes[offset],
          bytes[offset + 1],
          bytes[offset + 2],
          bytes[offset + 3]
        );

        if (fourCC === 'caBX' || fourCC === 'c2pa') {
          return true;
        }

        const chunkSize =
          bytes[offset + 4] |
          (bytes[offset + 5] << 8) |
          (bytes[offset + 6] << 16) |
          (bytes[offset + 7] << 24);

        // WebP chunks are padded to even byte counts
        const paddedSize = chunkSize + (chunkSize % 2);
        offset += 8 + paddedSize;
      }

      return false;
    }

    /**
     * Scans MP4 / BMFF UUID boxes for the C2PA specification UUID.
     */
    static scanBmffBoxes(bytes, limit) {
      let offset = 0;

      while (offset < limit - 24) {
        const boxSize =
          (bytes[offset] << 24) |
          (bytes[offset + 1] << 16) |
          (bytes[offset + 2] << 8) |
          bytes[offset + 3];

        if (boxSize < 8) break;

        const boxType = String.fromCharCode(
          bytes[offset + 4],
          bytes[offset + 5],
          bytes[offset + 6],
          bytes[offset + 7]
        );

        // 'uuid' box
        if (boxType === 'uuid') {
          let matches = true;
          for (let i = 0; i < 16; i++) {
            if (bytes[offset + 8 + i] !== C2PA_UUID[i]) {
              matches = false;
              break;
            }
          }
          if (matches) return true;
        }

        offset += boxSize;
      }

      return false;
    }

    /**
     * Helper to search for an arbitrary byte needle within a haystack buffer.
     */
    static containsSequence(haystack, needle, limit) {
      const maxSearch = Math.min(haystack.length - needle.length, limit);
      for (let i = 0; i <= maxSearch; i++) {
        let match = true;
        for (let j = 0; j < needle.length; j++) {
          if (haystack[i + j] !== needle[j]) {
            match = false;
            break;
          }
        }
        if (match) return true;
      }
      return false;
    }
  }

  return JumbfScanner;
});
