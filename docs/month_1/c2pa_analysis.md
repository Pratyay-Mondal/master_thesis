# C2PA Technical Breakdown: Manifest Architecture, JUMBF Encapsulation, and CDN Failure Modes

**Thesis:** *AI Transparency in the Wild: Bridging Technical Provenance and Legal Compliance under the EU AI Act on Social Media Platforms*  
**Author:** Pratyay Mondal · M.Sc. Artificial Intelligence · THWS  
**Phase:** Month 1 Deliverable #3 (Technical Architecture Analysis)  
**Date:** November 2026  
**Target Chapter:** Thesis Chapter 2 (§2.2 Content Provenance and Authenticity Infrastructure)

---

## 1. Theoretical Foundations of Cryptographically Bound Provenance

The Coalition for Content Provenance and Authenticity (C2PA) specification (v2.1) provides an open, cryptographic framework designed to trace the origin, transformation history, and attribution of digital media. Unlike legacy metadata systems (such as EXIF, IPTC, or XMP), which store arbitrary key-value pairs without cryptographic protection, C2PA binds metadata directly to media asset bitstreams using public-key cryptography (PKI) and cryptographic hash functions.

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              C2PA Manifest Store Architecture                           │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ┌───────────────────────────────────────────────────────────────────────────────────┐  │
│  │ Active Manifest (Current State Assertion)                                         │  │
│  │ ├── Claim Generator: "Adobe Firefly 2026" / "c2pa-python v0.38.1"                │  │
│  │ ├── Claim Generator Info: [{ name: "ModelProvider", version: "2.1" }]             │  │
│  │ ├── Assertion Store (CBOR Encoded)                                                │  │
│  │ │   ├── c2pa.actions.v2                                                           │  │
│  │ │   │   └── actions: [{ action: "c2pa.created",                                   │  │
│  │ │   │                  digitalSourceType: ".../trainedAlgorithmicMedia" }]        │  │
│  │ │   ├── c2pa.hash.data  ◄── HARD BINDING (Byte-range SHA-256/384 hash)            │  │
│  │ │   ├── c2pa.soft-binding ◄── SOFT BINDING (Perceptual hash / pHash, optional)    │  │
│  │ │   ├── c2pa.ai_info    ◄── AI Generation Assertion (Model, Provider, Parameters) │  │
│  │ │   └── c2pa.thumbnail.claim.jpeg                                                 │  │
│  │ ├── Ingredient References (Provenance Tree / DAG)                                │  │
│  │ │   └── [ { title: "parent_asset.jpg", relationship: "parentOf", ... } ]          │  │
│  │ └── Signature Box (COSE Sign1 Structure)                                          │  │
│  │     ├── Algorithm: ES256 / ES384 / PS256 (ECDSA over P-256 / SHA-256)             │  │
│  │     ├── X.509 Certificate Chain (End-Entity -> Intermediate -> CAI Trust Anchor)  │  │
│  │     └── RFC 3161 Timestamp Authority (TSA) Token                                  │  │
│  └───────────────────────────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────────────────────────┐  │
│  │ Historical Ingredient Manifests (Cryptographic Ancestry Chain)                     │  │
│  │ └── Manifest 0 (Initial Capture) ──► Manifest 1 (Crop/Edit) ──► Active Manifest   │  │
│  └───────────────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1.1 The C2PA Trust Model & PKI Infrastructure
C2PA establishes trust through an X.509 Public Key Infrastructure (PKI) anchored by the Content Authenticity Initiative (CAI) Trust List:
1. **End-Entity Signing Certificates:** A signing entity (e.g., an AI generator, camera manufacturer, or editing suite) generates an asymmetric key pair (typically `secp256r1` for ES256 or `secp384r1` for ES384). The private key signs a CBOR-encoded *Claim*, while the public key certificate is embedded within the signature block.
2. **Trust Anchors:** The certificate chain must resolve to a recognized Certificate Authority (CA) on the C2PA Trust List. If a self-signed or unanchored certificate is encountered, the credential is treated as cryptographically untrusted (`UNTRUSTED_ROOT`).
3. **Revocation & Temporal Verification:** Signatures must include cryptographically verifiable RFC 3161 timestamps to establish validity even if the end-entity certificate subsequently expires or is revoked via Online Certificate Status Protocol (OCSP).

---

## 2. JUMBF Architecture and JPEG Container Encapsulation

C2PA serializes its manifest store into the **JPEG Universal Metadata Box Format (JUMBF)**, standardized under ISO/IEC 19566-5:2023. JUMBF provides a universal, nested box structure that abstracts media format differences across JPEG, PNG (`caBX` chunk), WebP (`RIFF` chunk), and MP4 (`uuid` box under ISO/IEC 14496-12).

### 2.1 JUMBF Box Mechanics
Every JUMBF box conforms to a strict 4-byte length and 4-byte type convention:
- **`LBox` (4 bytes):** Total length of the box in bytes.
- **`TBox` (4 bytes):** Four-character code (`4CC`) defining box semantics (`jumb`).
- **`Description Box` (`jumd`):** Contains the box type UUID. For C2PA, the UUID is:
  $$\text{UUID}_{\text{C2PA}} = \mathtt{0x63327061}\text{-}\mathtt{0011}\text{-}\mathtt{0010}\text{-}\mathtt{8000}\text{-}\mathtt{00aa00389b71}$$
- **`Content Box`:** Carries the serialized payload, which may itself be nested JUMBF superboxes containing assertions, claims, or COSE signatures.

### 2.2 Physical Encapsulation in JPEG Marker Segments
In JPEG/JFIF containers, JUMBF superboxes reside within application marker segments (`APP11`, marker code `0xFFEB`). A standard JPEG stream containing C2PA metadata exhibits the following physical layout:

```
Standard JPEG Bitstream Layout with C2PA JUMBF:
┌──────────────┬────────────────────────────────────────────────────────────────┐
│ Marker Code  │ Payload / Segment Description                                  │
├──────────────┼────────────────────────────────────────────────────────────────┤
│ 0xFFD8 (SOI) │ Start of Image                                                 │
│ 0xFFE0 (APP0)│ JFIF Header (Standard image configuration)                     │
│ 0xFFE1 (APP1)│ EXIF / XMP Metadata Segment (Metadata strings)                 │
│ 0xFFEB (APP11│ C2PA Manifest Store (JUMBF Superbox)                           │
│              │ ├── Enclosed JUMBF Header (magic: 'JP\0\0')                    │
│              │ ├── Description Box ('jumd', UUID: c2pa)                       │
│              │ ├── Claim Box (CBOR map of assertions)                         │
│              │ ├── Assertion Box Store:                                       │
│              │ │   ├── 'c2pa.actions.v2' (AI generation declaration)          │
│              │ │   ├── 'c2pa.hash.data' (Hard-binding byte ranges)            │
│              │ │   └── 'c2pa.ai_info' (Model & prompt parameters)             │
│              │ └── Signature Box (COSE_Sign1 structure + X.509 cert chain)    │
│ 0xFFDB (DQT) │ Quantization Table(s)                                          │
│ 0xFFC0 (SOF0)│ Start of Frame (Baseline DCT dimensions, component channels)   │
│ 0xFFC4 (DHT) │ Huffman Table(s)                                               │
│ 0xFFDA (SOS) │ Start of Scan (Entropy-coded DCT pixel bitstream)              │
│ 0xFFD9 (EOI) │ End of Image                                                   │
└──────────────┴────────────────────────────────────────────────────────────────┘
```

Because an individual JPEG marker segment is bounded by a 16-bit length field ($\le 65,535\text{ bytes}$), large C2PA manifest stores spanning ingredient thumbnails and extensive DAG histories are split across multiple consecutive `APP11` segments using JUMBF fragment sequencing boxes.

---

## 3. Cryptographic Binding: Hard Binding vs. Soft Binding

C2PA v2.1 defines two fundamentally distinct mechanisms for linking the manifest store to the media bitstream:

### 3.1 Hard Binding (`c2pa.hash.data`)
Hard binding computes an exact cryptographic hash over the binary representation of the media asset. Specifically, the asset is partitioned into excluded ranges (the JUMBF `APP11` marker segments where the manifest resides) and included ranges (the rest of the file, including pixel scan data and structural markers):

$$\mathcal{H}_{\text{asset}} = \text{SHA-256}\left( \text{FileBytes} \setminus \text{Range}_{\text{JUMBF}} \right)$$

This hash is written into the `c2pa.hash.data` assertion and subsequently sealed within the signed claim. 
- **Security Property:** Hard binding provides **complete mathematical integrity**. If a single bit in the entropy-coded scan data (`SOS`) or quantization tables (`DQT`) is altered, hash verification fails immediately:

$$\text{SHA-256}(\text{ReceivedBytes}) \neq \mathcal{H}_{\text{asset}} \implies \text{INVALID}\_\text{HASH}$$
- **Vulnerability:** Hard binding treats media as an arbitrary byte sequence rather than a perceptual visual signal. It cannot tolerate compression, re-encoding, or format conversion.

### 3.2 Soft Binding (`c2pa.soft-binding`)
To address the brittleness of hard binding, C2PA v2.0+ introduced *soft binding* assertions. Soft binding extracts perceptual features from decoded pixel arrays, generating a hash invariant to minor visual transformations:
1. **Perceptual Hashing (pHash):** Computes a low-frequency Discrete Cosine Transform (DCT) matrix over the $8 \times 8$ downscaled luminance plane, generating a 64-bit fingerprint. Distance is measured via Hamming distance:
   $$D_H(\text{pHash}_A, \text{pHash}_B) = \sum_{i=0}^{63} \left( \text{pHash}_A[i] \oplus \text{pHash}_B[i] \right)$$
   A threshold $D_H \le 5$ indicates perceptual identity despite lossy compression.
2. **Frequency-Domain Invisible Watermarks:** Soft bindings can link to sub-perceptual watermarks embedded directly in pixel coefficients (e.g., SynthID-Image, Steg.AI).
- **Adoption Reality:** As of Q4 2026, soft binding adoption within mainstream C2PA SDKs remains nascent. Production implementations (Adobe Photoshop, Firefly, Microsoft Designer) rely almost exclusively on hard binding, rendering them structurally vulnerable to social media upload pipelines.

---

## 4. Meta CDN Ingestion Architecture & The Mechanics of Destruction

When an image carrying a valid C2PA manifest is uploaded to Facebook, Instagram, or WhatsApp, it enters Meta's automated Content Delivery Network (CDN) ingestion pipeline. The empirical failure of C2PA across all tested Meta surfaces (0/8 survival in Week 2 testing) is not accidental—it is the direct architectural consequence of three distinct processing layers.

```
Meta Server-Side Ingestion & Transcoding Pipeline:
┌─────────────────┐       ┌────────────────────────┐       ┌────────────────────────┐
│ Client Upload   │──────►│ Edge Decode & Ingest   │──────►│ Transcoding Cluster    │
│ (C2PA JPEG/PNG) │       │ (Stripping Gate)       │       │ (Resizing & DCT Q-drop)│
└─────────────────┘       └────────────────────────┘       └────────────────────────┘
                                                                        │
                                                                        ▼
┌─────────────────┐       ┌────────────────────────┐       ┌────────────────────────┐
│ Client Download │◄──────│ Edge CDN Origin Cache  │◄──────│ Format Serializer      │
│ (No Manifest!)  │       │ (Clean Stripped Asset) │       │ (Clean APP0/SOF0 Only) │
└─────────────────┘       └────────────────────────┘       └────────────────────────┘
```

### 4.1 Layer 1: Physical JUMBF Destruction (Metadata Sanitization)
Meta platforms employ aggressive metadata stripping to protect user privacy (e.g., removing GPS coordinates, camera serials, and device fingerprints) and minimize bandwidth overhead. During server-side ingest:
1. The server reads the JPEG marker stream sequentially.
2. `APP0` (JFIF) is preserved or synthesized.
3. `APP1` (EXIF/XMP) is parsed for orientation flags, then stripped or sanitized.
4. Non-standard application markers—including `APP11` (JUMBF)—are classified as unrecognized metadata payloads and **purged from the stream**.
5. The serialized output stream omits the `0xFFEB` markers entirely.

### 4.2 Layer 2: Cryptographic Invalidation (Transcoding & Recompression)
Even if Meta's engineering teams intentionally modified their CDN software to pass `APP11` markers through unmodified, hard-bound C2PA manifests would still suffer **immediate cryptographic invalidation**:
1. **Resolution Normalization:** Facebook caps standard feed images at $2048\text{px}$ on the longest edge; Instagram caps width at $1080\text{px}$ (enforcing $4:5$ to $1.91:1$ aspect ratios). Resizing recalculates pixel matrices via bicubic or Lanczos resampling, altering pixel values across the entire frame.
2. **Lossy Re-quantization:** Meta’s JPEG encoders apply aggressive quantization tables ($Q \approx 71$–$85$ for Facebook, $Q \approx 75$–$85$ for Instagram) to optimize compression ratios.
3. **Format Migration (WebP Transition):** Instagram increasingly transcodes uploaded JPEGs to Google WebP format. In WebP containers, JPEG `APP11` markers are structurally invalid; C2PA data must reside in a `RIFF` chunk named `caBX`. Because transcoding strips unknown metadata, no corresponding `caBX` chunk is generated.

Because hard binding validates against raw file bytes, any change to the DCT coefficient bitstream breaks the equality $\text{SHA-256}(\text{NewBytes}) = \mathcal{H}_{\text{asset}}$. The signature verification engine returns `HASH_MISMATCH` or `CORRUPTED_MANIFEST`.

### 4.3 Layer 3: Semantic Loss & Provenance DAG Severance
When a platform strips the manifest store:
- The ingredient tree is severed. A downstream user or validator cannot verify whether an image was created from scratch by generative AI (`c2pa.created`), or whether it represents a human photograph subjected to localized AI inpainting (`c2pa.edited`).
- The `c2pa.ai_info` assertion is permanently lost, eliminating machine-readable details regarding the generator model, prompt, or training provenance.

---

## 5. The WhatsApp Anomaly: Client-Side Pre-Ingestion Sanitization

WhatsApp presents a distinct architectural model compared to Facebook and Instagram. While Facebook and Instagram transcode media on server-side clusters, WhatsApp executes image compression **client-side within the mobile application sandbox prior to message dispatch**:
1. **Local Pre-Processing:** When a user selects a C2PA-signed image, the WhatsApp native client (iOS/Android) loads the image into memory, downscales it to $1600\text{px}$ (standard) or $2560\text{px}$ (HD), and recompresses it locally to JPEG $Q \approx 55$–$65$.
2. **Metadata Purging:** The local client writes out a clean JPEG bitstream, discarding all non-essential markers (`APP1`, `APP11`).
3. **End-to-End Encryption (Signal Protocol):** The recompressed, stripped byte buffer is encrypted using the Signal Protocol (Noise framework) before transmission across Meta's relay servers.

**Thesis Implication:** Because WhatsApp servers handle only ciphertext, there is **zero technical opportunity** for Meta to inspect C2PA manifests server-side or inject platform-level "Made with AI" labels on WhatsApp. The C2PA manifest is destroyed before the file ever leaves the sender's device.

---

## 6. The "Made with AI" Ingestion Trap: Platform-Mediated Transparency

In early 2024, Meta announced expanded AI content labeling across Facebook, Instagram, and Threads. Understanding this system is crucial for evaluating Article 50 compliance:

```
The Ingestion Trap Sequence:
1. User uploads C2PA-signed AI image to Facebook.
2. Meta upload edge gateway inspects image in memory.
3. Gateway parses JUMBF box and identifies `c2pa.ai_info` assertion.
4. Gateway flags database record: `is_ai_generated = True`.
5. Gateway routes image to CDN transcoding cluster.
6. CDN cluster strips JUMBF box, recompresses image to WebP, and publishes to CDN.
7. User feeds render image from CDN (0 bytes of C2PA manifest exist).
8. Client UI displays Meta's proprietary "Made with AI" label based on database flag.
```

### The Regulatory Conflict with EU AI Act Article 50
This architecture creates an **ingestion trap** that undermines the fundamental objective of the EU AI Act:
1. **Destruction of Open Verifiability:** The open standard (C2PA) is used exclusively as an ingestion ingest signal for Meta's internal database. It is not passed through to the European public.
2. **Vendor Lock-In of Provenance:** A user cannot independently audit the "Made with AI" claim using open-source tools (e.g., `c2pa-python`, Content Credentials Verify). They are forced to trust Meta's internal classification algorithms.
3. **Failure of Art. 50(2) "Machine-Readability":** Article 50(2) mandates that outputs remain *machine-readable and detectable*. By delivering stripped images from CDN edges, Meta ensures that downstream client software (academic validators, browser extensions, fact-checking tools) cannot detect any machine-readable provenance signal within the media file itself.

---

## 7. Architectural Conclusions

1. **C2PA is a Container Invariant, Not a Media Invariant:** C2PA hard binding guarantees that an asset has not changed byte-for-byte; it does not guarantee that an asset's semantic visual meaning has survived distribution.
2. **Hard Binding Cannot Survive Social Media Ingestion:** As long as social platforms transcode media to reduce bandwidth and protect user privacy, container-bound manifests will achieve 0% survival in consumer feeds.
3. **The Necessity of a Multi-Tiered Verification Layer:** Meeting EU AI Act Article 50 requirements on social platforms demands that C2PA be complemented by:
   - Pixel-level invisible watermarking (e.g., SynthID-Image) capable of surviving DCT quantization.
   - Client-side DOM observation extensions capable of bridging the gap between platform database labels and verifiable provenance records.

