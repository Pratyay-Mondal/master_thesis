# Month 1 Documentation: Research Foundations, Regulatory Mapping, and Empirical Provenance Benchmarking

**Thesis Title:** *AI Transparency in the Wild: Bridging Technical Provenance and Legal Compliance under the EU AI Act on Social Media Platforms*  
**Author:** Pratyay Mondal · M.Sc. Artificial Intelligence  
**Institution:** Faculty of Applied Computer Sciences and Humanities, Technical University of Applied Sciences Würzburg-Schweinfurt (THWS)  
**Supervisors:** Prof. Dr. Markus Oermann (Primary Supervisor), Prof. Dr. Ivan Yamshchikov (Secondary Supervisor)  
**Research Period:** October – November 2026 (Month 1)  

---

### Intellectual Property & Open Access License Notice

```
Copyright (c) 2026 Pratyay Mondal. All rights reserved.
Technical University of Applied Sciences Würzburg-Schweinfurt (THWS).

This documentation and the underlying research artifacts are licensed under the
Creative Commons Attribution-NonCommercial 4.0 International License (CC BY-NC 4.0).
You are free to share (copy and redistribute the material in any medium or format) and
adapt (remix, transform, and build upon the material) under the following terms:
1. Attribution — You must give appropriate credit, provide a link to the license, and
   indicate if changes were made. You may do so in any reasonable manner.
2. NonCommercial — You may not use the material for commercial purposes.
Full License Legal Code: https://creativecommons.org/licenses/by-nc/4.0/legalcode
```

---

## 1. Executive Summary & Research Scope

### 1.1 The Transparency Problem under Regulation (EU) 2024/1689
The European Union Artificial Intelligence Act (Regulation (EU) 2024/1689) establishes the world's first comprehensive horizontal legal framework for artificial intelligence. Within Chapter IV, **Article 50** introduces binding transparency obligations for both upstream **providers** of AI systems and downstream **deployers** who publish synthetic content.

Specifically, the statutory framework envisions a cohesive, end-to-end chain of transparency:
1. Upstream AI generators embed unforgeable, machine-readable provenance marks into synthetic media and text outputs.
2. Downstream publishers and platforms preserve or surface these marks, disclosing the synthetic nature of content to the public.
3. European citizens interact with social feeds equipped with clear, immediate, and distinguishable disclosures at first exposure.

### 1.2 The Empirical Dilemma: "Transparency in the Wild"
In real-world deployment, this legislative presumption breaks down completely. Commercial social media ecosystems are not neutral bit-pipes; they actively sanitize, compress, transcode, and re-encode all incoming media. Furthermore, closed platform infrastructures create information silos where machine-readable metadata is discarded server-side, replaced by proprietary, unverified platform tags, or completely omitted in end-to-end encrypted messaging channels.

### 1.3 Scope of Investigation: The Meta Ecosystem
To empirically investigate this structural gap, Month 1 concentrated on the **Meta platform ecosystem** as a representative high-traffic, multi-modal operating environment:
- **Facebook (`facebook.com`):** High-volume public feed with aggressive Content Delivery Network (CDN) re-compression clusters and automated platform disclosure labeling.
- **Instagram (`instagram.com`):** Highly visual consumer feed and story platform enforcing strict dimension normalization ($1080\text{px}$ clamps) and WebP transcoding.
- **WhatsApp (`web.whatsapp.com`):** The world's largest end-to-end encrypted (E2EE) messaging service, operating client-side mobile image downscaling ($1600\text{px}$, $Q \approx 60$) prior to encrypted transmission.

---

## 2. Doctrinal Deconstruction of EU AI Act Article 50

Article 50 establishes a bifurcated, multi-party regulatory framework. Month 1 executed a rigorous legal-technical deconstruction of its four operative sub-paragraphs:

```
┌────────────────────────────────────────────────────────────────────────┐
│             REGULATION (EU) 2024/1689 · ARTICLE 50 ARCHITECTURE        │
├────────────────────────────────────────────────────────────────────────┤
│ UPSTREAM PROVIDER OBLIGATION (Art. 50(2))                              │
│ • Machine-readable marking & detectability at generation              │
│ • Composite Quality Standard: "Effective, Interoperable, Robust,       │
│   and Reliable"                                                        │
├────────────────────────────────────────────────────────────────────────┤
│ DOWNSTREAM DEPLOYER OBLIGATIONS (Art. 50(4))                           │
│ • Art. 50(4a): Disclosure of audiovisual deepfakes / synthetic media   │
│ • Art. 50(4b): Disclosure of public-interest synthetic text            │
│   ↳ Statutory Exemption: Human editorial review & legal responsibility │
├────────────────────────────────────────────────────────────────────────┤
│ PRESENTATION & USER ACCESSIBILITY MANDATE (Art. 50(5))                 │
│ • Clear, distinguishable, and accessible at first exposure             │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Article 50(2): Upstream Provider Marking Duty
> *"Providers of AI systems, including general-purpose AI models, generating synthetic audio, image, video or text content, shall ensure that the outputs of the AI system are marked in a machine-readable format and detectable as artificially generated or manipulated."*

- **Addressee:** AI model developers (e.g., OpenAI, Anthropic, Google DeepMind, Midjourney).
- **Substantive Mandate:** Markings must be embedded at output generation time. The second sentence mandates that solutions must be *"effective, interoperable, robust and reliable to the extent this is technically feasible."*
- **Technical Mechanisms Evaluated:** C2PA v2.1 (for images) and SynthID-Text / Kirchenbauer PRF watermarking (for text).

### 2.2 Article 50(4a): Deployer Audiovisual Disclosure
> *"Deployers of an AI system that generates or manipulates image, audio or video content constituting a deep fake, shall disclose that the content has been artificially generated or manipulated."*

- **Addressee:** The entity or individual publishing the media to social feeds.
- **Intermediary Platform Interaction:** Meta attempts to automate this disclosure by parsing upload metadata and stamping posts with an *"AI info"* or *"Made with AI"* badge. However, downstream consumers have no mechanism to cryptographically audit whether the tag was derived from authentic provenance or heuristic platform classifiers.

### 2.3 Article 50(4b): Deployer Text Disclosure & The Editorial Exemption
> *"Deployers of an AI system that generates or manipulates text which is published with the purpose of informing the public on matters of public interest shall disclose that the text has been artificially generated or manipulated, unless the use is authorised by law [...] or the AI-generated content has undergone a process of human editorial review and a natural or legal person holds editorial responsibility for the publication of the content."*

- **The Editorial Exemption Paradox:** If a journalist or creator lightly edits an AI-generated draft, two simultaneous events occur:
  1. The legal obligation to disclose is extinguished under Art. 50(4b).
  2. The statistical watermark signal degrades, often falling below detection thresholds ($z < 3.0$).
- Conversely, text retaining an unblemished, high-confidence watermark ($z > 10.0$) provides prima-facie proof that no substantive human editorial review occurred, confirming that the mandatory disclosure duty was violated if published unlabelled.

### 2.4 Article 50(5): First-Exposure Presentation Mandate
> *"The information referred to in paragraphs 1 to 4 shall be provided to the natural persons concerned in a clear and distinguishable manner at the latest at the time of the first interaction or exposure."*

- **Platform Failure:** Neither C2PA credentials nor statistical text watermarks possess a native visual presentation layer in standard social feeds. End users on Facebook, Instagram, or WhatsApp receive zero cryptographic visibility at first exposure unless a dedicated client-side UI overlay injects indicators directly into the viewport.

---

## 3. Empirical Provenance Benchmark 1: C2PA Media Provenance

### 3.1 C2PA v2.1 Architecture: JUMBF & Hard Binding
The Coalition for Content Provenance and Authenticity (C2PA) defines an open standard for content provenance:
- **Container Format:** Encapsulated within the ISO/IEC 19566-5 JPEG Universal Metadata Box Format (JUMBF).
- **Physical Header Markers:** In JPEG, JUMBF manifests reside in `APP11` application markers (`0xFF 0xEB`). In PNG and WebP, manifests reside in `caBX` chunk boxes.
- **Cryptographic Binding:** Uses **hard binding** via `c2pa.hash.data`, where a SHA-256 hash is computed across the raw byte stream of the image payload (excluding the manifest box itself). If even a single byte of the image changes, the hash fails, invalidating the entire manifest chain.

### 3.2 Experimental Methodology & Testbed
- **Test Asset Generator:** [`docs/month_1/scripts/create_test_asset.py`](file:///Users/pratyay/Documents/THWS/thesis/docs/month_1/scripts/create_test_asset.py)
- **Baseline Test Fixture:** `signed_test_image.jpg` ($3000 \times 2000\text{ px}$, $1.51\text{ MB}$, JPEG quality 95).
- **Cryptographic Credentials:** Signed using ECDSA over NIST P-256 (ES256) with official CAI test X.509 certificate authority (`urn:c2pa:74ba62a9-efcd-4644-afce-35be9491e36f`).
- **Assertion Set:** IPTC Digital Source Type (`c2pa.created`), AI generation claim (`c2pa.ai_info`), and SHA-256 byte-range hard hash (`c2pa.hash.data`).
- **Inspection Engine:** `c2pa-python` v0.38.1 wrapping `c2pa-rs` v0.91.3.

### 3.3 The Meta Pipeline Stress Test Results
The test suite [`docs/month_1/scripts/compression_stress_test.py`](file:///Users/pratyay/Documents/THWS/thesis/docs/month_1/scripts/compression_stress_test.py) executed 11 pipeline simulations, recording exact byte transformations and manifest survival:

| Pipeline ID | Platform Simulation | Transcoding & Downscaling Applied | Input Bytes | Output Bytes | Byte $\Delta$ | C2PA Manifest | C2PA Signature |
|:---|:---|:---|:---:|:---:|:---:|:---:|:---|
| `CTRL-01` | Passthrough Control | No transformations applied | $1,506,131$ | $1,506,131$ | $0.0\%$ | ✅ Present | `VALID_SIGNATURE` |
| `CTRL-02` | Baseline Re-encode | Pillow standard re-save ($Q=95$) | $1,506,131$ | $1,108,189$ | $-26.4\%$ | ❌ Stripped | `NO_MANIFEST` |
| `CTRL-03` | Metadata Strip | Explicit strip of EXIF/XMP/JUMBF | $1,506,131$ | $1,313,293$ | $-12.8\%$ | ❌ Stripped | `NO_MANIFEST` |
| `FB-01` | Facebook Feed (High) | Clamp $2048\text{px}$, strip, JPEG $Q=85$ | $1,506,131$ | $459,323$ | $-69.5\%$ | ❌ Stripped | `NO_MANIFEST` |
| `FB-02` | Facebook Feed (Low) | Clamp $2048\text{px}$, strip, JPEG $Q=71$ | $1,506,131$ | $353,246$ | $-76.5\%$ | ❌ Stripped | `NO_MANIFEST` |
| `FB-03` | Facebook Feed (WebP)| Clamp $2048\text{px}$, strip, WebP $Q=75$ | $1,506,131$ | $87,412$ | $-94.2\%$ | ❌ Stripped | `NO_MANIFEST` |
| `IG-01` | Instagram Feed (JPEG)| Clamp $1080\text{px}$, strip, JPEG $Q=80$ | $1,506,131$ | $144,382$ | $-90.4\%$ | ❌ Stripped | `NO_MANIFEST` |
| `IG-02` | Instagram Story | 9:16 re-frame, strip, JPEG $Q=70$ | $1,506,131$ | $225,918$ | $-85.0\%$ | ❌ Stripped | `NO_MANIFEST` |
| `IG-03` | Instagram Feed (WebP)| Clamp $1080\text{px}$, strip, WebP $Q=75$ | $1,506,131$ | $21,084$ | $-98.6\%$ | ❌ Stripped | `NO_MANIFEST` |
| `WA-01` | WhatsApp Standard | Client downscale $1600\text{px}$, JPEG $Q=60$ | $1,506,131$ | $216,884$ | $-85.6\%$ | ❌ Stripped | `NO_MANIFEST` |
| `WA-02` | WhatsApp HD | Client downscale $2560\text{px}$, JPEG $Q=75$ | $1,506,131$ | $543,718$ | $-63.9\%$ | ❌ Stripped | `NO_MANIFEST` |

### 3.4 Key Empirical Findings & Failure Taxonomy
1. **$0.0\%$ Survival Rate in the Wild:** Across all 8 Meta platform pipeline simulations (`FB-01` to `WA-02`), C2PA survival was exactly **0 out of 8 ($0.0\%$)**.
2. **Physical Container Annihilation:** Ingestion transcoding strips the `APP11` JUMBF marker entirely. The resulting byte stream contains only baseline JPEG markers (`SOI`, `DQT`, `DHT`, `SOF0`, `SOS`, `EOI`).
3. **Hard-Binding Incompatibility:** Even if the `APP11` box were artificially retained, the SHA-256 hash in `c2pa.hash.data` would fail catastrophically because DCT coefficient quantization and downsampling permanently alter image bytes.
4. **WhatsApp Client-Side E2EE Trap:** In WhatsApp, metadata stripping occurs **on the mobile device prior to transmission**. Because the network is end-to-end encrypted, WhatsApp servers cannot re-inject provenance, leaving the delivered asset permanently stripped.

---

## 4. Empirical Provenance Benchmark 2: Statistical Text Watermarking

### 4.1 Generative Mechanics: Kirchenbauer Green-List & SynthID-Text
Unlike binary file containers, large language models emit discrete token sequences $x_1, \ldots, x_T$ autoregressively from a vocabulary $V$.

#### The Kirchenbauer Green-List Algorithm
1. At decoding step $t$, the context window $x_{t-h:t-1}$ is hashed using a secret key $k$ via an HMAC-SHA256 Pseudo-Random Function:
   $$r_t = \text{PRF}_k(x_{t-h}, \ldots, x_{t-1})$$
2. The seed $r_t$ deterministically partitions vocabulary $V$ into a green list $G_t$ and red list $R_t$ such that $|G_t| = \gamma |V|$ (default $\gamma = 0.5$).
3. A soft logit bias $\delta > 0$ is added to the unnormalized logits $\ell_t$ of all green tokens:
   $$\hat{\ell}_t(v) = \ell_t(v) + \delta \cdot \mathbb{I}(v \in G_t)$$
4. The token $x_t$ is sampled from the softmax distribution $\hat{p}(v) = \text{softmax}(\hat{\ell}_t(v))$.

#### Google DeepMind SynthID-Text (Tournament Sampling)
In production models (e.g., Gemini), SynthID-Text employs a multi-round **tournament sampling** scheme ($M = 2^m$ candidate tokens) rather than raw logit addition, preserving fluency while maintaining a keyed statistical bias.

### 4.2 Zero-Shot Detection & Hypothesis Testing
Detection requires zero knowledge of the original prompt or model weights. Given key $k$ and green fraction $\gamma$:
- **Null Hypothesis ($H_0$):** Text was generated without key $k$ (human-authored). Green token count follows $|s|_G \sim \text{Binomial}(T, \gamma)$.
- **One-Proportion $z$-Score Statistic:**
  $$z = \frac{|s|_G - \gamma T}{\sqrt{\gamma(1 - \gamma)T}} \xrightarrow[\gamma=0.5]{} \frac{2|s|_G - T}{\sqrt{T}}$$
- **Statutory Decision Rule:** Reject $H_0 \iff z > 3.00$ ($p < 1.35 \times 10^{-3}$).

### 4.3 Robustness Battery Across 13 Social Media Transformations
The test harness [`docs/month_1/scripts/text_robustness_test.py`](file:///Users/pratyay/Documents/THWS/thesis/docs/month_1/scripts/text_robustness_test.py) evaluated watermark survivability across 13 distinct lexical, typographical, and structural transformations:

| Condition Name | Applied Perturbation / Transformation | Scored $T$ | Green $\vert s \vert_G$ | Green Ratio $\hat{\gamma}$ | $z$-Score | $p$-Value | Regulatory Verdict ($z > 3.0$) |
|:---|:---|:---:|:---:|:---:|:---:|:---:|:---|
| `human_control` | Unwatermarked human text (Negative Control) | 165 | 78 | 0.4727 | **-0.70** | $7.58 \times 10^{-1}$ | ❌ **Null-Consistent (Unflagged)** |
| `watermarked_source`| Unmodified watermarked generation (Positive Control)| 262 | 241 | 0.9198 | **+13.59** | $2.24 \times 10^{-42}$ | ✅ **Detected (Strong Pass)** |
| `verbatim` | Verbatim copy-paste into social post | 262 | 241 | 0.9198 | **+13.59** | $2.24 \times 10^{-42}$ | ✅ **Detected (Strong Pass)** |
| `emoji_hashtag_noise`| Social caption noise (#ai, 🚀 emojis appended) | 277 | 247 | 0.8917 | **+13.04** | $3.71 \times 10^{-39}$ | ✅ **Detected (Strong Pass)** |
| `word_substitution` | Synonym swaps on 12% of content words | 262 | 225 | 0.8588 | **+11.61** | $1.74 \times 10^{-31}$ | ✅ **Detected (Pass)** |
| `char_substitution` | Mobile keyboard typos (6% character noise) | 262 | 194 | 0.7405 | **+7.78** | $3.50 \times 10^{-15}$ | ✅ **Detected (Pass)** |
| `paraphrase` | Sentence restructuring + 40% lexical rewrite | 255 | 181 | 0.7098 | **+6.70** | $1.04 \times 10^{-11}$ | ✅ **Detected (Pass)** |
| `caption_truncation` | Mobile feed preview clip (first 50 words) | 55 | 51 | 0.9273 | **+6.34** | $1.17 \times 10^{-10}$ | ✅ **Detected (Pass)** |
| `severe_truncation` | Status update / micro-span (first 12 words) | 11 | 11 | 1.0000 | **+3.32** | $4.56 \times 10^{-4}$ | ⚠️ **Borderline (Length Risk)** |
| `translation_es` | EN $\to$ ES translation (Meta auto-translate proxy)| 264 | 155 | 0.5871 | **+2.83** | $2.32 \times 10^{-3}$ | ❌ **Miss ($z < 3.00$)** |
| `full_shuffle` | Adversarial word order scrambling | 262 | 144 | 0.5496 | **+1.61** | $5.41 \times 10^{-2}$ | ❌ **Erased (Null-Consistent)** |
| `other_lm_rewrite` | Cross-model paraphrase ("Rewrite with Meta AI") | 262 | 139 | 0.5305 | **+0.99** | $1.61 \times 10^{-1}$ | ❌ **Erased (Null-Consistent)** |
| `translation_de` | EN $\to$ DE translation (Meta auto-translate proxy)| 262 | 121 | 0.4618 | **-1.24** | $8.92 \times 10^{-1}$ | ❌ **Erased ($z < 0$)** |

### 4.4 The Asymptotic Length Dependency & Entropy Gating
1. **The Square-Root Law ($z \propto \sqrt{T}$):** Because detection statistical power scales with $\sqrt{T}$, short captions ($T < 50$ tokens) suffer severe power collapse. In `severe_truncation` ($T=11$), achieving $z = 3.32$ required an unrealistic $100\%$ green token rate. For typical watermarked text ($\hat{\gamma} \approx 0.75$), any span with $T < 36$ tokens mathematically cannot reach $z = 3.00$.
2. **Entropy Dependency:** Watermarking requires generative choice. In deterministic, low-entropy texts (repetitive emoji sequences, dates, code syntax), the logit bias $\delta$ cannot override the dominant token without severe degradation, lowering detectable green-token frequency.

---

## 5. The Legal-Technical Cross-Walk Matrix

Month 1 synthesized these empirical findings into a comprehensive cross-walk mapping legal duties to technical realities:

| Legal Provision | Statutory Standard | C2PA v2.1 Status | SynthID-Text Status | Observed Meta Platform Gap | Composite Regulatory Verdict |
|:---|:---|:---|:---|:---|:---|
| **Art. 50(2)**<br>Provider Marking | Machine-readable & detectable at generation | ✅ Compliant at generation via JUMBF `c2pa.ai_info`. | ✅ Compliant at generation via context-keyed logit bias. | CDN re-encoding purges JUMBF ($0/8$ survival). Text watermarks survive transport but lack federated verification keys. | **Partially Compliant at Source;<br>Non-Compliant in Distribution.** |
| **Art. 50(2)**<br>Quality Standard | "Effective, interoperable, robust, and reliable" | • Interoperable: ✅<br>• Robust: ❌<br>• Reliable: ❌<br>• Effective: ❌ | • Interoperable: ❌<br>• Robust: ⚠️<br>• Reliable: ⚠️<br>• Effective: ⚠️ | **The Adjective Incompatibility Trap:** No single technology satisfies all four adjectives simultaneously under social media transport. | **Statutory Failure in the Wild.** |
| **Art. 50(4a)**<br>Deployer Media | Disclose deepfakes / synthetic audiovisual media | ⚠️ Manifest could trigger label, but is destroyed. | N/A (Text modality only). | Meta applies proprietary "Made with AI" labels via server heuristics; users cannot audit the underlying evidence. | **Platform-Mediated Monopoly.** |
| **Art. 50(4b)**<br>Deployer Text | Disclose AI text informing public interest | N/A (Image container standard). | ⚠️ Watermark provides evidence, but is invisible. | Human editorial polish simultaneously satisfies legal exemption and degrades watermark ($z < 3.0$). | **Unenforced on Social Feeds.** |
| **Art. 50(5)**<br>First Exposure | Clear & distinguishable presentation at first view | ❌ `cr` icon not implemented by Meta platforms. | ❌ Imperceptible by mathematical design. | End users receive zero cryptographic indication at first view without dedicated client-side UI tooling. | **Non-Compliant Without Browser Overlay.** |

---

## 6. Pre-Architecture Requirements for Month 2 Tooling

The Month 1 empirical and legal investigations directly parameterized the engineering specification [`docs/month_1/tool_requirements_v01.md`](file:///Users/pratyay/Documents/THWS/thesis/docs/month_1/tool_requirements_v01.md):

### 6.1 Functional Requirements (FR-01 to FR-04)
- **`FR-01` (Multi-Modal Image Provenance):** The system must not assume C2PA presence. It must implement a multi-signal fallback pipeline: (1) C2PA manifest extraction, (2) sub-millisecond JUMBF pre-scanning, and (3) platform-native label parsing (`AI info`, `Made with AI`, `KI-Info`).
- **`FR-02` (Text Provenance & Privacy Gate):** The system must enforce a length-gating threshold ($T \ge 50$ tokens) and character entropy gating to prevent false-negative classifications on micro-spans. It must route text to detection APIs under strict data-minimization envelopes.
- **`FR-03` (Compliance Status Engine):** The system must map technical signals to Article 50 verdicts:
  - Art. 50(2) Provider Marking (`COMPLIANT`, `NON_COMPLIANT`, `UNKNOWN`)
  - Art. 50(4) Deployer Disclosure (`COMPLIANT`, `NON_COMPLIANT`, `UNKNOWN`)
  - Art. 50(5) User Visibility (`COMPLIANT`)
  - Overall Visual Pill State (`VERIFIED`, `PLATFORM_TAGGED`, `UNDISCLOSED_AI`, `NO_SIGNAL`)
- **`FR-04` (Isolated Shadow DOM UI):** The system must render encapsulated pill badges and an interactive Top-Layer Popover audit drawer, ensuring zero CSS style leakage from host platforms.

### 6.2 Non-Functional Requirements (NFR-01 to NFR-05)
- **`NFR-01` (Privacy & GDPR Data Minimization):** Client-side DOM parsing; API requests must transmit strictly `{ text }`, omitting user IDs, URLs, or browsing history.
- **`NFR-02` (Performance):** Binary pre-scanning $< 5\text{ms}$; overall image check $< 2\text{s}$; text check $< 3\text{s}$; zero impact on main-thread scrolling.
- **`NFR-03` (Security & Manifest V3):** CSP compliance with zero `unsafe-inline` or `eval()`; secure credential storage in `chrome.storage.local`.
- **`NFR-04` (Host Compatibility):** Robust against Meta's React/Comet dynamic DOM mutations without breaking page layouts.
- **`NFR-05` (Verifiability):** Cryptographic assertions and raw statistical metrics must remain accessible to expert auditors.

---

## 7. Artifact Inventory & Reproducibility Guide

### 7.1 Month 1 File Directory
All Month 1 research deliverables, scripts, and datasets are organized within `docs/month_1/`:

| File / Directory Path | Description | Deliverable ID |
|:---|:---|:---:|
| [`docs/month_1/art50_compliance_matrix.md`](file:///Users/pratyay/Documents/THWS/thesis/docs/month_1/art50_compliance_matrix.md) | Full doctrinal mapping of Article 50 vs. platform gaps | D-1.2 |
| [`docs/month_1/c2pa_analysis.md`](file:///Users/pratyay/Documents/THWS/thesis/docs/month_1/c2pa_analysis.md) | Technical deep-dive into C2PA JUMBF specification | D-1.3 |
| [`docs/month_1/c2pa_survival_tests.md`](file:///Users/pratyay/Documents/THWS/thesis/docs/month_1/c2pa_survival_tests.md) | Complete empirical log of 11 C2PA compression pipelines | D-1.4 |
| [`docs/month_1/synthid_text_analysis.md`](file:///Users/pratyay/Documents/THWS/thesis/docs/month_1/synthid_text_analysis.md) | Mathematical analysis of PRF watermarking & tournament sampling | D-1.5 |
| [`docs/month_1/perturbation_analysis.md`](file:///Users/pratyay/Documents/THWS/thesis/docs/month_1/perturbation_analysis.md) | Robustness table across 13 social text transformations | D-1.6 |
| [`docs/month_1/legal_technical_crosswalk.md`](file:///Users/pratyay/Documents/THWS/thesis/docs/month_1/legal_technical_crosswalk.md) | Synthesis cross-walk linking legal duties to failure modes | D-1.7 |
| [`docs/month_1/tool_requirements_v01.md`](file:///Users/pratyay/Documents/THWS/thesis/docs/month_1/tool_requirements_v01.md) | Pre-architecture functional requirements specification v0.1 | D-1.8 |
| [`docs/month_1/chapter2_outline.md`](file:///Users/pratyay/Documents/THWS/thesis/docs/month_1/chapter2_outline.md) | Academic outline for Thesis Chapter 2 (State of the Art) | D-1.9 |
| [`docs/month_1/bibliography.bib`](file:///Users/pratyay/Documents/THWS/thesis/docs/month_1/bibliography.bib) | BibTeX database containing 45+ academic and legal citations | D-1.10 |
| [`docs/month_1/scripts/`](file:///Users/pratyay/Documents/THWS/thesis/docs/month_1/scripts/) | Python benchmark test harnesses and asset generators | D-1.11 |
| [`docs/month_1/test_results/`](file:///Users/pratyay/Documents/THWS/thesis/docs/month_1/test_results/) | Raw JSON test execution reports and metric logs | D-1.12 |

### 7.2 Reproduction Commands
To reproduce the empirical benchmarks on a workstation with Python 3.10+:

```bash
# 1. Install Month 1 Python dependencies
pip install -r docs/month_1/scripts/requirements-week3.txt
pip install c2pa-python Pillow

# 2. Generate signed C2PA baseline test asset
python3 docs/month_1/scripts/create_test_asset.py

# 3. Execute 11-pipeline C2PA compression survival benchmark
python3 docs/month_1/scripts/compression_stress_test.py
# -> Outputs raw results to docs/month_1/test_results/compression_survival_report.json

# 4. Execute 13-condition text watermark robustness benchmark
python3 docs/month_1/scripts/text_robustness_test.py
# -> Outputs raw results to docs/month_1/test_results/text_watermark_robustness.json

# 5. Execute character n-gram entropy analysis
python3 docs/month_1/scripts/entropy_analysis.py
# -> Outputs entropy metrics to docs/month_1/test_results/entropy_analysis.json
```
