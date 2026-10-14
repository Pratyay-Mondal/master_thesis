# Progress Briefing — Day 9 / Colloquium 1
**Thesis:** *AI Transparency in the Wild: Bridging Technical Provenance and Legal Compliance under the EU AI Act on Social Media Platforms*
**Student:** Pratyay Mondal · M.Sc. Artificial Intelligence · THWS
**Date:** 16 October 2026

---

## 1. Administrative & Scope Baseline

| Item | Status |
|:---|:---|
| **Official Registration** | 07.10.2026 (Day 1) — Deadline: 07.04.2027 |
| **Primary Supervisor** | Prof. Dr. Markus Oermann |
| **Second Supervisor** | Prof. Dr. Ivan Yamshchikov |
| **Scope Refinement** | Per Prof. Oermann's guidance, the analytical target has been expanded from Facebook alone to the **Meta ecosystem**: Facebook + Instagram (shared CDN/compression pipelines) as primary targets, with **WhatsApp** as a comparative benchmark for end-to-end encrypted messaging |
| **Methodology** | Strict 50/50 equilibrium — Legal-Regulatory Analysis ‖ Technical Software Engineering |

---

## 2. Track 1 — Regulatory Foundations (Legal 50%)

### 2.1 Article 50 Obligation Mapping

Completed a paragraph-level deconstruction of EU AI Act **Article 50** and the **Guidelines on Transparency Obligations for Providers and Deployers of Certain AI Systems**. The four distinct obligation layers have been extracted and mapped to the thesis scope:

| Article | Actor | Core Duty | Thesis Relevance |
|:---:|:---|:---|:---|
| **50(1)** | Provider | Inform persons they are interacting with an AI system | Peripheral — chatbot interfaces, not social media content |
| **50(2)** | Provider | Outputs must be **machine-readable marked** and **detectable** as AI-generated; solutions must be "effective, interoperable, robust, and reliable" | **Central obligation** — maps directly to C2PA metadata embedding (images) and SynthID-Text watermark injection (text) |
| **50(4a)** | Deployer | **Deepfakes** (person-resembling image/audio/video) must be disclosed | **Central obligation** — affects any user posting AI-generated face-swaps or synthetic media on FB/IG |
| **50(4b)** | Deployer | AI-generated **text on matters of public interest** must be disclosed | **Central obligation** — exception if text underwent "human review or editorial control" with editorial responsibility |
| **50(5)** | Both | Disclosures must be "clear, distinguishable, at the latest at first interaction/exposure" | Directly parametrises the UI overlay design of the validator prototype |

### 2.2 Code of Practice on Transparency

Extracted the division of responsibilities between the two primary Working Groups:

- **WG1 (Provider Marking & Detection):** Responsibilities for machine-readable watermark embedding at generation time; interoperability requirements for cross-vendor detection.
- **WG2 (Deployer Labelling):** Responsibilities for user-facing disclosure; guidance on "appropriate manner" labels for artistic/satirical exemptions.

### 2.3 Key Legal Ambiguities Identified

Three open questions have been flagged for systematic resolution during the remainder of Month 1:

1. **Provider–Deployer boundary on Meta platforms:** When a user generates an image with DALL·E 3 (Provider: OpenAI) and posts it on Instagram, the deployer disclosure duty under Art. 50(4) likely falls on the posting user — but shifts to Meta itself when Meta's own AI tools (e.g., Meta AI image generation) produced the content. The boundary is legally under-determined for intermediary platforms.
2. **"Standard editing" exemption threshold (Art. 50(2)):** The obligation excludes AI systems performing "assistive functions for standard editing" that do not "substantially alter" input data. The precise threshold between exempt enhancement and non-exempt generation remains unclear.
3. **"Editorial responsibility" carve-out for AI text (Art. 50(4b)):** Whether a journalist who uses Claude to draft a public-interest article, then reviews and edits the output, satisfies the exemption depends on what constitutes legally sufficient "human review." No implementing guidance exists yet.

---

## 3. Track 2 — Technical Provenance & In-the-Wild Feasibility (Technical 50%)

### 3.1 C2PA Manifest Architecture

Initial literature analysis of the **C2PA (Coalition for Content Provenance and Authenticity)** specification has identified the key architectural layers relevant to the thesis:

- **Hard Binding:** Cryptographic hash of the asset's byte range; any re-compression (as performed by Facebook/Instagram CDN pipelines) invalidates the signature → **manifests are destroyed on upload.**
- **Soft Binding:** Perceptual hash or invisible watermark that survives transformations; supported by the C2PA spec but adoption is nascent.
- **JUMBF (ISO 19566-5):** The container format for C2PA manifests inside JPEG files. Meta's CDN pipeline strips non-standard JUMBF boxes during server-side re-encoding.
- **Preliminary finding:** C2PA in its current hard-binding form is fundamentally incompatible with Meta's media upload pipelines. This motivates the thesis argument that invisible watermarks and statistical text watermarks are the necessary complementary layer.

### 3.2 SynthID-Text Statistical Watermarking

Completed a detailed extraction of the mechanism from the Anthropic paper (*How Claude's text watermarking works*):

- **Injection pipeline:** Secret key K + preceding N tokens → PRNG seed → pseudo-random scores for each candidate token → tournament sampling biases token selection among equally probable candidates → watermark is embedded without degrading output quality or adding hidden characters.
- **Detection:** Statistical hypothesis test — aggregate PRNG-correlated scores across the token sequence; compute p-value against null hypothesis (human-written text). Minimum ~200–250 tokens for statistical significance. Target false-positive rate < 10⁻⁵.
- **Key finding for social media:** Detection is key-gated — only Anthropic's Detection API (or an authorized third party) can verify the watermark. This creates a **closed-loop dependency** that is in tension with Art. 50(2)'s interoperability requirement.
- **Resilience profile:** Survives verbatim copy-paste and light editing; degrades proportionally with edit fraction; destroyed by complete rewrite or paraphrasing through a different LLM. Truncation below ~200 tokens yields inconclusive results — a critical limitation given average social media post lengths.

### 3.3 Prototype Architectural Concept

An initial conceptual outline for the **"AI Transparency & Provenance Validator"** has been drafted:

- **Form factor:** Browser extension (Chrome/Firefox) + optional API pipeline.
- **Detection pipeline:** DOM parsing of Facebook/Instagram/WhatsApp Web feeds → (a) image elements: attempt C2PA manifest extraction, fallback to invisible watermark detection; (b) text elements: extract post text, submit to SynthID-Text Detection API for p-value scoring.
- **Compliance engine:** Cross-reference detection outputs against the Art. 50 obligation matrix to produce per-post compliance assessments.
- **UI overlay:** Inject contextual visual indicators (provenance badges, compliance scores, advisory warnings) into the feed DOM, conforming to Art. 50(5)'s "clear and distinguishable" standard.

---

## 4. Immediate Next Steps (Weeks 2–4 of Month 1)

| Week | Focus | Key Deliverable |
|:---:|:---|:---|
| **2** (21–25 Oct) | C2PA deep dive + hands-on metadata survival experiments | Documented proof that C2PA hard-binding fails on simulated FB/IG/WA upload pipelines (`c2patool` + ImageMagick simulation) |
| **3** (28 Oct – 1 Nov) | SynthID-Text mechanism deep dive; read foundational papers (Aaronson 2022, Kirchenbauer et al. ICML 2023, DeepMind Nature 2024) | Perturbation resilience analysis table for text watermarks across Meta platforms |
| **4** (4–7 Nov) | Legal-Technical Cross-Walk synthesis; tool functional requirements specification v0.1 | Complete mapping of Art. 50 obligations → technical mechanisms → platform-specific gaps; Month 1 milestone presentation |

### Concrete Engineering Milestones for Weeks 2–3:
- Install Rust toolchain and `c2patool` CLI; run C2PA verification on sample signed images.
- Simulate Facebook/Instagram/WhatsApp upload pipelines (JPEG re-compression Q=75, metadata stripping, resizing) and document manifest destruction.
- Set up a DOM parsing test harness for Facebook Web to evaluate post-element structure, image `src` extraction, and text content accessibility.
- Write entropy analysis scratch script to estimate watermark injection density across different content types (creative text vs. factual content vs. code).

---

*Prepared for Colloquium 1 · THWS M.Sc. AI · 16.10.2026*
