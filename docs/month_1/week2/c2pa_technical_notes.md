# Week 2 — C2PA Technical Deep Dive: Architecture, JUMBF Internals & Meta Pipeline Analysis

**Thesis:** *AI Transparency in the Wild: Bridging Technical Provenance and Legal Compliance under the EU AI Act on Social Media Platforms*
**Phase:** Month 1 / Week 2 — Technical Media Provenance Deep Dive
**Date:** 21–25 October 2026

---

## 1. C2PA Architecture Overview

The **C2PA (Coalition for Content Provenance and Authenticity)** specification (v2.1+) defines a layered architecture for cryptographically binding provenance metadata to media assets. Understanding its internal structure is essential to diagnosing *why* it fails on social media platforms and *where* complementary mechanisms are needed.

### 1.1 The Manifest Store: Structural Decomposition

```
┌─────────────────────────────────────────────────────────────────────┐
│                      C2PA Manifest Store                            │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Manifest (Active Claim)                                      │  │
│  │  ├── claim_generator: "Adobe Photoshop 25.3"                  │  │
│  │  ├── claim_generator_info: [{name, version, icon}]            │  │
│  │  ├── Assertions (array of labelled data)                      │  │
│  │  │   ├── c2pa.actions                                         │  │
│  │  │   │   └── actions: [{action: "c2pa.created"},              │  │
│  │  │   │                  {action: "c2pa.edited", parameters}]  │  │
│  │  │   ├── c2pa.hash.data  ← HARD BINDING (byte-range hash)    │  │
│  │  │   ├── c2pa.hash.bmff  ← For MP4/MOV video containers      │  │
│  │  │   ├── c2pa.soft-binding  ← Perceptual hash (optional)     │  │
│  │  │   ├── stds.exif       ← Preserved EXIF metadata           │  │
│  │  │   ├── c2pa.thumbnail.claim.jpeg ← Preview thumbnail       │  │
│  │  │   └── c2pa.ai_info    ← NEW: AI generation declaration    │  │
│  │  │       └── {model: "DALL-E 3", provider: "OpenAI",         │  │
│  │  │            type: "generated"}                              │  │
│  │  ├── Ingredient References (provenance chain / DAG)           │  │
│  │  │   └── [{title, format, relationship, manifest_id}]        │  │
│  │  └── Signature Block                                          │  │
│  │      ├── Algorithm: ES256 / ES384 / PS256                     │  │
│  │      ├── Certificate chain (X.509 v3)                         │  │
│  │      ├── Timestamp Authority (RFC 3161)                       │  │
│  │      └── OCSP response (revocation check)                     │  │
│  └───────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Historical Manifests (Ingredient provenance chain)           │  │
│  │  └── Previous manifest → parent manifest → original creation  │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Physical Storage Formats:                                          │
│  ├── JPEG → JUMBF superbox (embedded in file)                      │
│  ├── PNG  → caBX chunk                                             │
│  ├── WebP → Extended file format RIFF chunk                        │
│  ├── MP4  → BMFF UUID box (ISO 14496-12)                           │
│  ├── PDF  → Incremental save region                                │
│  └── Sidecar → .c2pa external manifest file                        │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Key Architectural Concepts

| Concept | Technical Detail | Thesis Significance |
|:---|:---|:---|
| **Hard Binding** (`c2pa.hash.data`) | SHA-256/384 hash of the asset's byte range (pixel data + container structure). Any single byte change invalidates the hash → signature verification fails. | This is why **any re-compression** (as performed by FB/IG/WA upload pipelines) destroys the credential. The hash no longer matches the re-encoded bytes. |
| **Soft Binding** (`c2pa.soft-binding`) | Perceptual hash (e.g., pHash, robust hash) that is tolerant to minor visual transformations (compression, resizing). | Supported by C2PA spec v2.0+ but **adoption is nascent**. Could survive moderate JPEG re-compression. This is where invisible watermarks (SynthID-Image, Steg.AI) could complement C2PA. |
| **JUMBF Container** | JPEG Universal Metadata Box Format (ISO 19566-5). A nested box structure embedded in JPEG APP11 markers. Each box has a type UUID, label, and payload. | Facebook's CDN pipeline strips non-standard APP markers during server-side re-encoding. JUMBF boxes are treated as "unknown metadata" and discarded. |
| **Ingredient Chain** | Each manifest can reference parent manifests via ingredient URIs, forming a directed acyclic graph (DAG) of provenance. | Enables distinguishing "AI-generated" (single node, `c2pa.created` action) from "AI-edited" (child node with `c2pa.edited` action referencing a human-created parent). |
| **Trust Anchors** | Root certificates in the C2PA Trust List that validate signer identity. Managed by the Content Authenticity Initiative (CAI). | If the signing cert is revoked, expired, or not in the trust list → verification fails "open" (no provenance, not "forged provenance"). |
| **AI Generation Assertion** (`c2pa.ai_info`) | New assertion type (v2.1+) specifically declaring that content was generated or substantially modified by an AI model. Fields: `model`, `provider`, `type`. | Directly maps to Art. 50(2) "machine-readable" marking. If this assertion survives the platform pipeline, it could automate deployer compliance checks. |

---

## 2. JUMBF Internals: How C2PA Embeds in JPEG

### 2.1 JPEG Marker Structure

```
Standard JPEG File Layout:
┌──────────┐
│ SOI (FFD8)│  ← Start of Image
├──────────┤
│ APP0 (FFE0)│ ← JFIF header (optional)
├──────────┤
│ APP1 (FFE1)│ ← EXIF metadata (Exif\0\0 prefix)
├──────────┤
│ APP1 (FFE1)│ ← XMP metadata (http://ns.adobe.com/xap/1.0/ prefix)
├──────────┤
│ APP11(FFEB)│ ← JUMBF superbox (JP\0\0 prefix) ◄── C2PA LIVES HERE
│    │       │
│    ├── Description Box (type UUID = C2PA manifest)
│    ├── Content Box
│    │    ├── Claim CBOR payload
│    │    ├── Assertion Store
│    │    └── Signature (COSE Sign1)
│    └── Additional manifests (ingredients)
├──────────┤
│ DQT/DHT  │  ← Quantization / Huffman tables
├──────────┤
│ SOF (FFC0)│  ← Start of Frame (image dimensions, channels)
├──────────┤
│ SOS (FFDA)│  ← Start of Scan (compressed pixel data)
├──────────┤
│ EOI (FFD9)│  ← End of Image
└──────────┘
```

### 2.2 Why Server-Side Re-encoding Destroys C2PA

When Facebook/Instagram/WhatsApp re-encode an uploaded image, the server-side pipeline performs:

1. **Decode** the uploaded JPEG into raw pixel buffer (RGB bitmap)
2. **Resize** to platform-specific maximum dimensions
3. **Re-encode** to JPEG (Q≈71–85 on FB) or WebP (Q≈75–80 on IG)
4. **Write** a new file from scratch — only standard markers (SOI, APP0, DQT, SOF, SOS, EOI) are written

**The critical failure:** Step 4 writes a *new* file. The APP11 JUMBF marker containing the C2PA manifest store is simply **not copied** because it is non-standard metadata. Even if a platform attempted to preserve the JUMBF box, the hard-binding hash (`c2pa.hash.data`) computed over the original byte range would no longer match the re-encoded pixel data.

**Double destruction:**
- **Structural:** JUMBF box physically removed from the file
- **Cryptographic:** Even if preserved, the hash would fail verification against re-compressed bytes

---

## 3. Meta Platform Media Pipeline Characteristics

### 3.1 Empirical Pipeline Parameters

| Platform | Upload Format | Server-Side Processing | Output Format | Max Dimensions | EXIF Preserved? | JUMBF/C2PA Preserved? |
|:---|:---|:---|:---|:---|:---|:---|
| **Facebook Feed** | JPEG/PNG/WebP/HEIC | Decode → resize → re-encode → CDN caching with content-addressed hash | JPEG (Q≈71–85) or WebP | 2048px (longest edge) | **Partial** — GPS stripped; basic EXIF sometimes retained | ❌ **No** — APP11 markers stripped |
| **Instagram Feed** | JPEG/PNG/HEIC | Decode → resize → aspect ratio enforcement (4:5 to 1.91:1) → re-encode | JPEG (Q≈75–85) or WebP | 1080px (width) | ❌ **No** — full EXIF strip | ❌ **No** |
| **Instagram Stories** | JPEG/PNG/MP4 | Decode → resize → overlay compositing → re-encode | JPEG/MP4 | 1080×1920px | ❌ **No** | ❌ **No** |
| **Instagram Reels** | MP4/MOV | Decode → H.264/H.265 re-encode → audio normalization → thumbnail generation | MP4 (H.264) | 1080×1920px | N/A | ❌ **No** — BMFF UUID boxes stripped |
| **WhatsApp Media** | JPEG/PNG | **Client-side** decode → resize → re-encode **before** E2E encryption | JPEG (Q≈55–65) | 1600px (longest edge) | ❌ **No** — aggressive strip | ❌ **No** |
| **WhatsApp "HD"** | JPEG/PNG | Higher quality re-encode, larger dimensions | JPEG (Q≈70–80) | 2560px | ❌ **No** | ❌ **No** |

> **Key observation:** WhatsApp's processing occurs **client-side** (in the mobile app) before encryption, meaning there is no opportunity for server-side metadata re-injection. This makes WhatsApp the most hostile environment for C2PA of all three Meta platforms.

### 3.2 Meta's "Made with AI" Label System (as of Q3 2026)

Meta has implemented a content labelling system that detects C2PA credentials and invisible watermarks:

- **Detection:** Meta's servers check uploaded images for C2PA manifests containing `c2pa.ai_info` assertions and for invisible watermarks from partnered providers (Google SynthID-Image, Adobe Firefly).
- **Labelling:** If AI provenance is detected, a "Made with AI" label is applied to the post in the UI.
- **Critical gap:** This detection occurs **before** the server-side re-encoding pipeline strips the metadata. Once the image is re-encoded and served from the CDN, the original C2PA credential is gone — only Meta's platform-level label persists.
- **Implication for the thesis:** A client-side browser extension cannot independently verify C2PA credentials on images served by Meta's CDN. It can only detect Meta's platform label, which is a trust-the-platform model, not an independent cryptographic verification.

---

## 4. The "In-the-Wild" Failure Taxonomy

### 4.1 Three Layers of Failure

```
Layer 1: PHYSICAL DESTRUCTION
├── JUMBF box stripped during re-encoding
├── BMFF UUID box removed from video containers
└── XMP sidecar data discarded

Layer 2: CRYPTOGRAPHIC INVALIDATION
├── Hard-binding hash mismatch after re-compression
├── Byte range references no longer correspond to actual data
└── Certificate chain may become unresolvable (detached TSA)

Layer 3: SEMANTIC LOSS
├── Ingredient chain broken (parent manifest references orphaned)
├── Action history lost (cannot distinguish "created" vs "edited")
└── AI generation assertion (`c2pa.ai_info`) no longer accessible
```

### 4.2 What Survives vs. What Doesn't

| Component | Survives FB Upload? | Survives IG Upload? | Survives WA Send? | Notes |
|:---|:---:|:---:|:---:|:---|
| JUMBF manifest store | ❌ | ❌ | ❌ | Stripped in all cases |
| Hard-binding hash | ❌ | ❌ | ❌ | Invalid even if JUMBF preserved |
| Soft-binding perceptual hash | ⚠️ Partially | ⚠️ Partially | ❌ | May survive FB/IG if no crop; WA too aggressive |
| Invisible image watermark (SynthID-Image) | ✅ Usually | ✅ Usually | ⚠️ Partially | Designed to survive lossy compression |
| EXIF metadata | ⚠️ Partial | ❌ | ❌ | FB retains some; IG/WA strip all |
| Platform "Made with AI" label | ✅ | ✅ | N/A | Meta's own label — not cryptographic |

---

## 5. Experimental Procedures for This Week

### 5.1 Test Asset Acquisition

1. Download C2PA-signed sample images from [contentcredentials.org/verify](https://contentcredentials.org/verify) — use the "View sample" links
2. Generate a test image using an AI tool that embeds C2PA credentials (e.g., Adobe Firefly, Microsoft Designer)
3. Create your own signed test images using the `c2pa-python` Builder SDK (see Script 1)

### 5.2 Experiment Matrix

| Experiment ID | Input | Transformation | Expected Result | Script |
|:---:|:---|:---|:---|:---|
| EXP-01 | C2PA-signed JPEG | No transformation (baseline) | ✅ Valid manifest | `c2pa_inspector.py` |
| EXP-02 | C2PA-signed JPEG | JPEG Q=85 (mild FB compression) | ❌ Hash invalid | `compression_stress_test.py` |
| EXP-03 | C2PA-signed JPEG | JPEG Q=75 + metadata strip | ❌ Manifest absent | `compression_stress_test.py` |
| EXP-04 | C2PA-signed JPEG | JPEG Q=50 + resize to 1080px | ❌ Manifest absent | `compression_stress_test.py` |
| EXP-05 | C2PA-signed JPEG | WebP Q=75 conversion | ❌ Manifest absent | `compression_stress_test.py` |
| EXP-06 | C2PA-signed JPEG | Resize to 2048px (FB max) | ❌ Hash invalid | `compression_stress_test.py` |
| EXP-07 | C2PA-signed JPEG | Resize to 1600px + Q=60 (WA) | ❌ Manifest absent | `compression_stress_test.py` |

### 5.3 Deliverable Files

| File | Purpose |
|:---|:---|
| `docs/month_1/scripts/c2pa_inspector.py` | C2PA manifest extraction and validation utility |
| `docs/month_1/scripts/compression_stress_test.py` | Meta-style compression simulation + resilience harness |
| `docs/month_1/scripts/create_test_asset.py` | Synthetic C2PA test asset generation and signing script |
| `docs/month_1/test_results/compression_survival_report.json` | Auto-generated structured results from the test harness |
| `docs/month_1/week2/c2pa_technical_notes.md` | This document |

### 5.4 Empirical Verification Findings (Week 2 Summary)

The test harness was executed against a signed test asset (`signed_test_image.jpg`, 3000×2000px, C2PA v2.1 compliant manifest with AI generation action assertions) across 11 simulated platform pipelines:

- **Survival Rate:** 1 / 11 (9.1%)
- **Meta Platforms (Facebook Feed, Instagram Feed/Story, WhatsApp Standard/HD):** 0 / 8 survived (100% stripped/invalidated)
- **Baseline Controls:** 
  - `no_transform` (byte-for-byte passthrough): ✅ Survived (`VALID_SIGNATURE`)
  - `recompress_only_q95` (re-encode without metadata strip): ❌ Stripped (`NO_MANIFEST`)
  - `strip_only`: ❌ Stripped (`NO_MANIFEST`)

**Core Technical Thesis Conclusion:** Hard-binding C2PA manifests cannot survive social media ingestion and CDN distribution pipelines. Article 50(2) machine-readable marking on social media platforms fundamentally necessitates complementary pixel-level invisible watermarking (e.g., SynthID-Image) and statistical text watermarking (e.g., SynthID-Text).

---

## 6. Supplementary Reading List

| Resource | Priority | Notes |
|:---|:---:|:---|
| **C2PA Technical Specification v2.1** ([c2pa.org/specifications](https://c2pa.org/specifications/)) | 🔴 Critical | Focus on §6 (Manifest Store), §7 (Assertions), §8 (Hard/Soft Binding), §10 (Trust Model) |
| **JUMBF — ISO 19566-5:2023** | 🟡 Important | Understand box structure; not necessary to read the full ISO spec — the C2PA spec references the relevant parts |
| **c2pa-python SDK** ([github.com/contentauth/c2pa-python](https://github.com/contentauth/c2pa-python)) | 🔴 Critical | API reference for Reader/Builder classes |
| **Content Authenticity Initiative — Open Source Tools** ([opensource.contentauthenticity.org](https://opensource.contentauthenticity.org)) | 🟡 Important | `c2pa-rs`, `c2pa-node`, `c2pa-python` source code |
| **Meta Transparency Center — Content Credentials** | 🟡 Important | How Meta handles C2PA + invisible watermarks for "Made with AI" labels |
| Amoroso et al. (2024) — *Parents and Children: Distinguishing Multimodal DeepFakes from Natural Images* | 🟢 Supplementary | Academic evaluation of C2PA provenance chains |

---

*Week 2 Technical Notes · Pratyay Mondal · THWS M.Sc. AI · October 2026*
