# Month 1: Literature & Standards Review — Detailed Execution Plan

**Thesis:** *AI Transparency in the Wild: Bridging Technical Provenance and Legal Compliance under the EU AI Act on Social Media Platforms*
**Student:** Pratyay Mondal · M.Sc. Artificial Intelligence · THWS
**Supervisor:** Prof. Dr. Markus Oermann
**Phase Duration:** Weeks 1–4 (mid-October → mid-November 2026)
**Updated Scope:** Meta ecosystem (Facebook + Instagram) as primary; WhatsApp as comparative encrypted-messaging benchmark.

---

## Strategic Objective

Month 1 is **not** a passive reading exercise. Its purpose is to construct a **legal-technical taxonomy** that will:

1. Form **Chapter 2 (Theoretical Background & State of the Art)** of the final thesis.
2. Directly parametrise the **functional requirements** of the "AI Transparency & Provenance Validator" tool (Months 3–4).
3. Define the **evaluation metrics** used in Month 5 robustness testing.

Every deliverable must answer one fundamental question:

> *Where does the EU AI Act mandate a technical guarantee that current provenance mechanisms (C2PA, SynthID-Text) cannot yet deliver on social media platforms—and how wide is that gap?*

---

## Week 1: Regulatory Foundations & Legal Mapping

### 1.1 Primary Source Deconstruction

Read and annotate the following workspace documents **line-by-line**:

| Document | Key Extraction Targets |
|:---|:---|
| [Article 50](file:///Users/pratyay/Documents/THWS/thesis/Article%2050_%20Transparency%20obligations%20for%20providers%20and%20deployers%20of%20certain%20AI%20systems%20_%20AI%20Act%20Service%20Desk.pdf) | Art. 50(1)–(7) paragraph-level obligations; exemption clauses; accessibility requirements under Art. 50(5) |
| [Code of Practice on Transparency](file:///Users/pratyay/Documents/THWS/thesis/node_14729_printable_pdf.pdf) | WG1 (Provider marking/detection) vs. WG2 (Deployer labelling); signatory compliance pathway vs. alternative adequacy demonstration |
| [Guidelines on Transparency Obligations](file:///Users/pratyay/Documents/THWS/thesis/node_17077_printable_pdf.pdf) | Definitions of "synthetic content," "deepfake," "standard editing," "editorial responsibility"; practical scope examples |
| [Market Surveillance Authorities](file:///Users/pratyay/Documents/THWS/thesis/node_14020_printable_pdf.pdf) | Enforcement structure; Germany → Bundesnetzagentur designation; complaint pathways |
| [European AI Office](file:///Users/pratyay/Documents/THWS/thesis/node_12445_printable_pdf.pdf) | AI Office supervisory role over GPAI models; relationship to AI Board and Scientific Panel |

### 1.2 Legal Obligation Decomposition

Extract the **four distinct obligation layers** from Article 50 and map them to your thesis scope:

| Article | Actor | Obligation | Thesis Relevance |
|:---:|:---|:---|:---|
| **50(1)** | Provider | Inform natural persons they are interacting with an AI system | Peripheral — applies to chatbots, not to social media content provenance |
| **50(2)** | Provider | Outputs must be **marked in a machine-readable format** and **detectable** as artificially generated. Technical solutions must be "effective, interoperable, robust, and reliable" | **Core obligation.** Directly maps to C2PA metadata embedding and SynthID-Text watermark injection. The "interoperable" requirement implies cross-vendor detectability |
| **50(4a)** | Deployer | Deepfakes (image/audio/video resembling existing persons) must be **disclosed** | **Core obligation.** Facebook/Instagram deployers posting AI face-swaps or synthetic video must label them. Exception: artistic/satirical/fictional works require only "appropriate manner" disclosure |
| **50(4b)** | Deployer | AI-generated **text published on matters of public interest** must be disclosed | **Core obligation.** Exception: text that has undergone "human review or editorial control" where a natural/legal person holds "editorial responsibility" |
| **50(5)** | Both | Information must be provided "clearly, distinguishably, at the latest at first interaction/exposure" and conform to accessibility requirements | Directly informs the UI overlay design of the validator tool |

### 1.3 Key Legal Questions to Resolve

Work through these questions and document answers with precise paragraph citations:

1. **Provider vs. Deployer boundary on social media:** When a user generates an image with DALL·E 3 (Provider: OpenAI) and posts it on Instagram (Deployer: the user? Meta?), who bears the Art. 50(4) disclosure duty? How does this shift if Meta's own AI editing tools (e.g., Meta AI image generation within Instagram) are used?
2. **The "standard editing" exemption (Art. 50(2)):** The obligation does not apply if the AI system performs "an assistive function for standard editing" or does not "substantially alter the input data." Where is the threshold between "standard editing" (exempt) and "substantial alteration" (must mark)?
3. **The "editorial responsibility" carve-out (Art. 50(4b)):** If a journalist uses Claude to draft an article about a political event (a matter of public interest), but the journalist reviews and edits it, does the editorial responsibility exemption apply? What evidence of "human review" is legally sufficient?
4. **Enforcement jurisdiction on Meta:** Germany's Bundesnetzagentur is the designated Market Surveillance Authority. Under Art. 50(7), the Commission can adopt implementing acts if Codes of Practice are deemed inadequate. What is the practical enforcement timeline?

### 1.4 Deliverable: Article 50 Compliance Matrix

Create the following structured table as a Markdown file in your thesis repository (`thesis/docs/month_1/art50_compliance_matrix.md`):

```markdown
| Obligation (Art.) | Actor    | Content Type             | Required Action                          | Exemptions                                                      | Technical Mechanism (C2PA / SynthID) | Enforceability on Meta Platforms       |
|:------------------:|:---------|:-------------------------|:-----------------------------------------|:----------------------------------------------------------------|:-------------------------------------|:---------------------------------------|
| 50(2)             | Provider | Synthetic image/video    | Machine-readable mark + detectability    | Assistive/standard editing; law enforcement                     | C2PA manifest embedding              | ❌ Stripped on upload (FB/IG/WA)       |
| 50(2)             | Provider | Synthetic text           | Machine-readable mark + detectability    | Assistive/standard editing; law enforcement                     | SynthID-Text statistical watermark   | ⚠️ Survives upload, degrades on edit  |
| 50(4a)            | Deployer | Deepfake (person likeness)| Disclose as artificially generated      | Artistic/satirical/fictional works (limited disclosure)         | Detection via C2PA or visual label   | ⚠️ Requires platform cooperation      |
| 50(4b)            | Deployer | AI text on public interest| Disclose as artificially generated      | Human review + editorial responsibility                         | Detection via SynthID-Text API       | ❌ No client-side verification exists  |
| 50(5)             | Both     | All of the above         | Clear, distinguishable, at first exposure| None                                                            | UI overlay / labelling               | 🔧 The tool we are building           |
```

### 1.5 Supplementary Reading List for Week 1

- **Regulation (EU) 2024/1689** — Full consolidated text (EUR-Lex), Recitals 132–137
- **Digital Omnibus on AI (July 2026)** — Amendments to the original AI Act, referenced in the Article 50 text as "AMENDED"
- Hacker, P. (2024). *The European AI Liability Directives.* arXiv:2310.13601
- Smuha, N.A. (2021). *From a 'Race to AI' to a 'Race to AI Regulation'.* Law, Innovation and Technology, 13(1)

### 1.6 Week 1 Schedule

| Day | Task | Hours |
|:---:|:-----|:-----:|
| Mon | Read Art. 50 full text + Recitals 132–137; begin compliance matrix | 4h |
| Tue | Read Code of Practice PDF; extract WG1/WG2 obligations | 4h |
| Wed | Read Guidelines on Transparency + Market Surveillance Authorities docs | 3h |
| Thu | Resolve the 4 legal questions (§1.3); annotate with paragraph citations | 4h |
| Fri | Finalize compliance matrix; write 3-page summary note for Friday colloquium | 4h |

**Week 1 Exit Criteria:** You can explain to Prof. Oermann, without notes, the exact legal difference between a Provider's Art. 50(2) marking duty and a Deployer's Art. 50(4) disclosure duty, and why each demands a different technical mechanism.

---

## Week 2: Technical Media Provenance Deep Dive (C2PA & Image Watermarking)

### 2.1 C2PA Specification Analysis

The **C2PA (Coalition for Content Provenance and Authenticity)** standard defines how content credentials are cryptographically bound to media assets. Study the following architectural layers:

```
┌─────────────────────────────────────────────────────────────┐
│                     C2PA Manifest Store                      │
│  ┌───────────────────────────────────────────────────────┐   │
│  │ Claim                                                 │   │
│  │  ├── Claim Generator (e.g., "Adobe Photoshop 25.3")   │   │
│  │  ├── Assertions                                       │   │
│  │  │    ├── c2pa.actions (created, edited, published)   │   │
│  │  │    ├── c2pa.hash.data (hard binding → pixel hash)  │   │
│  │  │    ├── stds.exif (camera metadata)                 │   │
│  │  │    └── c2pa.thumbnail (preview image)              │   │
│  │  ├── Ingredient References (provenance chain)         │   │
│  │  └── Signature (X.509 certificate chain)              │   │
│  └───────────────────────────────────────────────────────┘   │
│  Storage: JUMBF box (JPEG) / XMP sidecar / embedded binary  │
└─────────────────────────────────────────────────────────────┘
```

**Key concepts to master:**

| Concept | Description | Why It Matters |
|:---|:---|:---|
| **Hard Binding** | Cryptographic hash of the asset's byte range; any byte change invalidates the signature | Explains why re-compression on Facebook/Instagram **destroys** the credential |
| **Soft Binding** | Perceptual hash or embedded watermark that survives transformations | The C2PA spec supports this, but adoption is nascent; this is where invisible image watermarks (SynthID, Steg.AI) complement C2PA |
| **JUMBF** | JPEG Universal Metadata Box Format — the container for C2PA manifests inside JPEG files | Facebook's CDN pipeline strips non-standard JUMBF boxes during re-encoding |
| **Ingredient chain** | Each manifest can reference a parent manifest, forming a provenance DAG | Enables "edit history" — critical for distinguishing "AI-generated" from "AI-edited" |
| **Trust anchors** | Root certificates in the C2PA Trust List that validate signer identity | If the signing cert is revoked or untrusted, the credential fails open |

### 2.2 Hands-On: C2PA Tooling Setup

Set up the C2PA verification toolchain on your local machine:

```bash
# Install Rust toolchain (if not present)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install c2patool CLI
cargo install c2patool

# Verify installation
c2patool --version

# Inspect a sample C2PA-signed image (download from contentcredentials.org/verify)
c2patool sample_signed.jpg

# Output: JSON manifest tree with assertions, claim generator, signature status
```

**Experiment 1 — Metadata Survival Test:**

```bash
# 1. Take a C2PA-signed image
c2patool signed_original.jpg          # ✅ Valid manifest

# 2. Simulate Facebook upload: re-compress to JPEG Q=75, strip metadata
convert signed_original.jpg -strip -quality 75 fb_simulated.jpg

# 3. Re-verify
c2patool fb_simulated.jpg             # ❌ No manifest found — JUMBF stripped

# 4. Simulate WhatsApp: aggressive re-encode + resize
convert signed_original.jpg -strip -resize 1600x1200 -quality 60 wa_simulated.jpg
c2patool wa_simulated.jpg             # ❌ No manifest found
```

**Document the results** in a test log: `thesis/docs/month_1/c2pa_survival_tests.md`

### 2.3 Meta Platform Media Pipeline Analysis Framework

Define the empirical research framework for **Month 2's** platform analysis. During Week 2, you are building the **methodology**, not yet running the full experiment:

| Platform | Upload Pipeline Characteristics | C2PA Survival Hypothesis |
|:---|:---|:---|
| **Facebook Feed** | Server-side re-encoding to JPEG/WebP; EXIF stripping; max dimension ~2048px; CDN caching with content hash | ❌ Hard-bound C2PA manifests will be stripped. Soft-bound perceptual hashes may survive if the image is not cropped |
| **Instagram Feed/Stories** | Aggressive resizing (1080px width); HEIC/WebP trans-coding; aspect ratio enforcement; story overlays | ❌ Same stripping behaviour as FB; additional cropping/filter application further degrades soft bindings |
| **Instagram Reels** | Video re-encoding (H.264/H.265); audio normalization; thumbnail generation | ❌ Video C2PA manifests (BMFF-based) stripped during re-encoding |
| **WhatsApp Media** | End-to-end encrypted; aggressive client-side re-encoding before encryption (JPEG Q≈60, max 1600px); no server-side CDN caching of originals | ❌ Most aggressive stripping; E2EE means no server-side metadata injection possible |

> [!IMPORTANT]
> **The core research insight from Week 2:** C2PA in its current hard-binding form is fundamentally incompatible with social media CDN pipelines. This gap is what motivates the need for **invisible watermarks** (image) and **statistical text watermarks** (text) as complementary mechanisms — and is the central technical argument of your thesis.

### 2.4 Anthropic's Dual Approach: Text Watermarks + C2PA for Files

From the [Anthropic paper](file:///Users/pratyay/Documents/THWS/thesis/How%20Claude%27s%20text%20watermarking%20works%20_%20Anthropic.pdf), note the critical architectural split:

- **Text outputs → SynthID-Text statistical watermark** (invisible, no extra tokens, key-based PRNG modulation)
- **File outputs (.png, .jpg, .svg) → C2PA content credential** ("a small, cryptographically signed note in the file's metadata, saying that the file was made or processed with Claude")

This means Anthropic itself acknowledges that **C2PA is adequate for files** (where metadata survives) but **insufficient for text** (where no metadata container exists). Your thesis must formalize this duality.

### 2.5 Supplementary Reading List for Week 2

- **C2PA Technical Specification v2.1** — [c2pa.org/specifications](https://c2pa.org/specifications/)
- **JUMBF (ISO 19566-5)** — Structure of JPEG metadata boxes
- Amoroso, D. et al. (2024). *Parents and Children: Distinguishing Multimodal DeepFakes from Natural Images.* ACM CCS
- Meta Transparency Center — *How Meta handles content credentials* (if publicly documented)
- Content Authenticity Initiative (CAI) — Open-source SDKs: `c2pa-rs`, `c2pa-node`, `c2pa-python`

### 2.6 Week 2 Schedule

| Day | Task | Hours |
|:---:|:-----|:-----:|
| Mon | Read C2PA spec chapters: Manifest Store, Claims, Assertions, Trust Model | 4h |
| Tue | Install `c2patool`; run Experiment 1 (metadata survival test across simulated pipelines) | 4h |
| Wed | Study JUMBF structure; read Anthropic's C2PA implementation for file outputs | 3h |
| Thu | Draft the Meta Platform Media Pipeline Analysis Framework table | 3h |
| Fri | Write 4-page C2PA technical breakdown note; present at Friday colloquium | 4h |

**Week 2 Exit Criteria:** You have a documented, reproducible experiment proving C2PA hard-binding fails on simulated social media uploads, and a clear articulation of **why soft binding / invisible watermarking is the necessary complement**.

---

## Week 3: Invisible Statistical Text Watermarking (SynthID-Text Deep Dive)

### 3.1 Core Mechanism from the Anthropic Paper

From [How Claude's text watermarking works](file:///Users/pratyay/Documents/THWS/thesis/How%20Claude%27s%20text%20watermarking%20works%20_%20Anthropic.pdf), extract the following architectural pipeline:

```
┌──────────────────────────────────────────────────────────────────────┐
│              SynthID-Text Watermark Injection Pipeline                │
│                                                                      │
│  1. LLM computes logit distribution P(token | context)               │
│                        ↓                                             │
│  2. Secret key K + preceding N tokens → PRNG seed                    │
│                        ↓                                             │
│  3. PRNG generates pseudo-random scores for each candidate token     │
│                        ↓                                             │
│  4. Tournament sampling: token selection biased by PRNG scores       │
│     (only among tokens with comparable logit probabilities)          │
│                        ↓                                             │
│  5. Selected token is emitted → PRNG advances → repeat              │
│                                                                      │
│  Key property: Only "low-stakes" choices are affected.               │
│  High-confidence tokens (e.g., "Mathematica" after "Principia")      │
│  are NOT nudged — the watermark has "nothing to act on."             │
└──────────────────────────────────────────────────────────────────────┘
```

**Critical design principles from the paper:**

| Principle | Anthropic's Stated Behaviour | Thesis Implication |
|:---|:---|:---|
| **No extra tokens** | "Watermarking doesn't require extra tokens, and will not be more expensive" | Zero overhead for users; but also means the signal is purely statistical, not structural |
| **No hidden characters** | "Nothing is added to the text and there are no hidden characters" | Distinguishes SynthID-Text from Unicode steganography or zero-width character injection |
| **Key-based detection** | "Detectable to anyone who has a key that encodes it" | Detection requires Anthropic's private key → only their Detection API can verify. **Third-party validators cannot independently verify without API access** |
| **Probabilistic output** | "One can assign a probability that the text was generated by Claude" | Not binary (watermarked/not), but a p-value / confidence score. Requires sufficient token length |
| **Identity-free** | "Carries no identifying information and can't be traced to a specific person, organization, or chat" | Privacy-preserving by design; but also means you cannot attribute a watermarked post to a specific deployer |
| **Sparse on factual/code** | "Watermarking is sparser on factual passages where there are fewer choices" | Low-entropy domains (code, dates, proper nouns) have fewer "nudgeable" token positions → reduced signal strength |
| **Light edit resilience** | "Light editing probably won't remove the watermark completely; a complete rewrite where every word is replaced will" | Gradual degradation model, not cliff-edge failure |

### 3.2 Detection: Statistical Hypothesis Testing

The detection process (performed by Anthropic's Detection API) works as follows:

```
Detection Pipeline:
1. Input: candidate text T = [t₁, t₂, ..., tₙ]
2. For each token tᵢ, compute the PRNG score that would have been
   generated using key K and the preceding context
3. Aggregate: test statistic S = Σ f(PRNG_score(tᵢ), actual_token(tᵢ))
4. Null hypothesis H₀: text was NOT generated with key K (human-written)
5. Compute p-value: P(S ≥ observed | H₀)
6. Decision: if p-value < threshold α → "likely watermarked"

Key parameters:
- Minimum token count for statistical significance: ~200-250 tokens
  (shorter texts → insufficient signal → inconclusive)
- False positive rate target: < 10⁻⁵ (1 in 100,000 human texts
  falsely flagged)
```

### 3.3 Perturbation Resilience Analysis for Social Media

Map the specific threat model for text watermarks across Meta's platforms:

| Perturbation Type | Meta Platform Context | Expected Impact on Watermark | Research Question |
|:---|:---|:---|:---|
| **Copy-paste (verbatim)** | User copies Claude output directly into FB post or IG caption | ✅ Full signal preserved | Baseline case |
| **Light editing** | User fixes typos, changes a few words before posting | ⚠️ Partial signal preserved; detection confidence decreases proportionally to edit fraction | At what edit ratio does detection drop below α? |
| **Truncation** | Instagram captions have 2,200-char limit; FB posts are typically short | ⚠️ If truncated below ~200 tokens, signal may be insufficient | What is the minimum viable excerpt length? |
| **Translation** | "A translation produced by Claude carries a watermark, because in this case every word is chosen by Claude" (Anthropic) | ✅ Translated text IS watermarked (new generation) | But what if a user translates watermarked EN text using Google Translate (non-watermarked LLM)? → Signal destroyed |
| **Paraphrasing via another LLM** | User pastes Claude output into GPT-4 with "rewrite this" | ❌ Complete signal destruction — new token distribution | Most adversarial scenario; no technical mitigation |
| **Screenshot of text** | User screenshots a Claude response and posts as image on FB | ❌ Text watermark is inapplicable to pixel data | Requires OCR → text extraction → watermark check pipeline |
| **WhatsApp forwarding** | Text forwarded through E2EE messaging | ✅ Text itself is unchanged by WhatsApp's pipeline | But message metadata (sender context) is lost |

### 3.4 Foundational Academic Papers

Build a reading stack that contextualises Anthropic's approach within the broader watermarking literature:

| Paper | Key Contribution | Relation to Anthropic/SynthID |
|:---|:---|:---|
| **Aaronson (2022)** — *My AI Safety Lecture at UT Austin* | First proposal of cryptographic text watermarking via exponential minimum sampling with secret keys | Direct intellectual ancestor; SynthID-Text generalises this to tournament sampling |
| **Kirchenbauer et al. (ICML 2023)** — *A Watermark for Large Language Models* | Green/Red list partitioning of vocabulary; bias green-list tokens during sampling | Alternative approach; more detectable by adversaries because it creates vocabulary-level statistical bias |
| **Google DeepMind (Nature 2024)** — *Scalable watermarking for identifying large language model outputs* | SynthID-Text: tournament sampling with pseudo-random scoring functions; deployed at scale on Gemini | **The exact method Anthropic adopted.** Claude's watermark "is a version of the SynthID-Text approach published by Google DeepMind in a Nature paper in 2024" |
| **Christ, Gunn & Zamir (2024)** — *Undetectable Watermarks for Language Models* | Cryptographically undetectable watermarks (information-theoretic indistinguishability) | Theoretical upper bound on watermark stealth; SynthID-Text is a practical approximation |

### 3.5 Hands-On: Entropy Analysis Scratch Script

Write a Python script to build intuition about where watermarks can and cannot be injected:

```python
"""
Scratch script: Analyse token-level entropy of sample texts to estimate
watermark injection density across different content types.

Save to: thesis/docs/month_1/scripts/entropy_analysis.py
"""
import math
from collections import Counter

def estimate_token_entropy(text: str, n: int = 3) -> float:
    """Estimate per-token entropy using character n-gram model as proxy."""
    ngrams = [text[i:i+n] for i in range(len(text) - n + 1)]
    counts = Counter(ngrams)
    total = sum(counts.values())
    entropy = -sum((c/total) * math.log2(c/total) for c in counts.values())
    return entropy

# Sample texts representing different watermark density scenarios
samples = {
    "creative_prose": (
        "The ancient lighthouse stood sentinel against the churning sea, "
        "its beam cutting through fog like a golden blade. Sailors whispered "
        "that on moonless nights, the keeper's ghost still climbed the stairs."
    ),
    "factual_report": (
        "Isaac Newton published Philosophiæ Naturalis Principia Mathematica "
        "on 5 July 1687. The work contains Newton's laws of motion and his "
        "law of universal gravitation."
    ),
    "python_code": (
        "def fibonacci(n):\n    if n <= 1:\n        return n\n"
        "    return fibonacci(n-1) + fibonacci(n-2)"
    ),
    "social_media_caption": (
        "Just saw the most amazing sunset at the beach today! "
        "The colors were unreal 🌅 #blessed #nature #photography"
    ),
}

for label, text in samples.items():
    entropy = estimate_token_entropy(text)
    word_count = len(text.split())
    print(f"{label:25s} | words: {word_count:3d} | entropy: {entropy:.2f} bits | "
          f"watermark density: {'HIGH' if entropy > 4.5 else 'MEDIUM' if entropy > 3.5 else 'LOW'}")
```

### 3.6 Week 3 Schedule

| Day | Task | Hours |
|:---:|:-----|:-----:|
| Mon | Read Anthropic paper in full; extract the mechanism table (§3.1) and detection pipeline (§3.2) | 4h |
| Tue | Read DeepMind Nature 2024 SynthID-Text paper; compare with Kirchenbauer et al. green/red list approach | 5h |
| Wed | Build the perturbation resilience analysis table (§3.3) for Meta platforms | 3h |
| Thu | Write and run the entropy analysis script; document results | 3h |
| Fri | Write 4-page SynthID-Text technical summary; present at Friday colloquium | 4h |

**Week 3 Exit Criteria:** You can whiteboard the SynthID-Text injection pipeline (key → PRNG → tournament sampling → token emission), explain why detection is a hypothesis test, and articulate the specific failure modes on each Meta platform.

---

## Week 4: Synthesis, Research Gap Analysis & Pre-Architecture Specification

### 4.1 The Legal-Technical Cross-Walk

This is the intellectual core of Month 1. Construct a **mapping table** that directly connects each Article 50 obligation to the technical mechanism that (attempts to) fulfil it:

| Art. 50 Requirement | Technical Mechanism | Fulfils Requirement? | Gap on Meta Platforms |
|:---|:---|:---:|:---|
| "Marked in a machine-readable format" (50(2)) — **Images** | C2PA manifest with JUMBF embedding | ✅ At generation time | ❌ Stripped by FB/IG/WA upload pipelines |
| "Marked in a machine-readable format" (50(2)) — **Text** | SynthID-Text statistical watermark | ✅ At generation time | ⚠️ Survives copy-paste; degrades with edits; requires API access to verify |
| "Detectable as artificially generated" (50(2)) — **Images** | C2PA verification + soft-binding watermarks | ⚠️ Partially | ❌ No client-side detection after metadata stripping without invisible watermark fallback |
| "Detectable as artificially generated" (50(2)) — **Text** | SynthID-Text Detection API | ⚠️ Partially | ⚠️ Minimum ~200 tokens; low-entropy text undetectable; API access restricted to "eligible organizations" |
| "Effective, interoperable, robust, and reliable" (50(2)) | Cross-vendor watermark interoperability | ❌ Not yet | ❌ Each provider (Anthropic, Google, OpenAI) uses a different key; no cross-provider detection protocol exists |
| "Disclose deepfakes" (50(4a)) | Platform-level labelling UI | ⚠️ Depends on platform | ⚠️ Meta's "Made with AI" label exists but relies on voluntary C2PA adoption and is easily circumvented |
| "Disclose AI text on public interest" (50(4b)) | No automated mechanism exists | ❌ | ❌ **Complete gap** — no technical mechanism currently automates deployer-side text disclosure |
| "Clear, distinguishable, at first exposure" (50(5)) | User-facing visual label/overlay | ❌ No standard exists | 🔧 **This is the exact gap the thesis tool fills** |

> [!TIP]
> **This table is the single most important artifact of Month 1.** It proves the research gap, motivates the tool, and will appear directly in Chapter 2 of your thesis.

### 4.2 Platform-Specific Research Questions for Month 2

Formalize the empirical questions that Month 2's architecture design and Facebook use-case mapping must answer:

**Facebook Feed:**
1. Does Facebook preserve any C2PA JUMBF data in uploaded images as of Q4 2026?
2. Does Facebook's "Made with AI" label trigger on images with valid C2PA credentials? What about images without C2PA but with invisible watermarks?
3. What is the average post length (in tokens) for public-interest text posts? Is it above the ~200-token SynthID-Text detection threshold?

**Instagram:**
1. Do Instagram Stories (24h ephemeral) receive the same "Made with AI" labelling treatment as permanent feed posts?
2. How does Instagram's aspect-ratio cropping affect soft-binding perceptual hashes?
3. Are Instagram Reels (video) subject to C2PA BMFF manifest preservation?

**WhatsApp (Comparative Benchmark):**
1. Does WhatsApp's client-side re-encoding strip C2PA before E2E encryption, or after?
2. Can a browser extension intercept WhatsApp Web DOM elements for text watermark analysis?
3. How does message forwarding ("Forwarded" label) interact with provenance tracking?

### 4.3 Tool Architecture Functional Requirements

Based on Weeks 1–3, define the **minimum functional requirements** that the "AI Transparency & Provenance Validator" must satisfy:

```
┌────────────────────────────────────────────────────────────────────┐
│          Functional Requirements Specification (v0.1)              │
│          Input to Month 2: Architecture Design                    │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  FR-01: Image Provenance Extraction                               │
│    - Extract C2PA manifests from images in FB/IG DOM               │
│    - Fallback: detect invisible image watermarks (SynthID-Image)   │
│    - Output: provenance status (verified / stripped / absent)      │
│                                                                    │
│  FR-02: Text Watermark Detection                                  │
│    - Extract text content from post DOM elements                   │
│    - Submit to SynthID-Text Detection API (or equivalent)          │
│    - Output: confidence score (p-value) + token count              │
│                                                                    │
│  FR-03: Compliance Engine                                         │
│    - Map FR-01 and FR-02 outputs to Art. 50 requirements           │
│    - Determine: is this content compliant with 50(2)? With 50(4)? │
│    - Output: compliance status per obligation                      │
│                                                                    │
│  FR-04: User Interface Overlay                                    │
│    - Inject visual indicators into the social media feed DOM       │
│    - Display: provenance badge, compliance score, advisory text    │
│    - Conform to Art. 50(5) "clear and distinguishable" standard    │
│                                                                    │
│  FR-05: Platform Abstraction Layer                                │
│    - Support Facebook Feed, Instagram Feed, WhatsApp Web           │
│    - Handle platform-specific DOM structures and update cycles     │
│                                                                    │
│  NFR-01: Privacy                                                  │
│    - No user content transmitted to external servers without       │
│      explicit consent (C2PA verification can be local;             │
│      text watermark detection requires API call)                   │
│                                                                    │
│  NFR-02: Performance                                              │
│    - Overlay rendering < 200ms per post                            │
│    - API detection calls batched and asynchronous                  │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### 4.4 Comparative Analysis Table: C2PA vs. SynthID-Text

| Dimension | C2PA (Image/File Provenance) | SynthID-Text (Text Watermarking) |
|:---|:---|:---|
| **Signal type** | Cryptographic signature + metadata manifest | Statistical pattern in token selection |
| **Embedding location** | JUMBF box / XMP sidecar (file metadata) | Distributed across the token sequence itself |
| **Detection method** | Manifest parsing + certificate chain validation | Hypothesis test against secret key (API call) |
| **Detection access** | Open — any C2PA-aware tool can verify | Closed — requires provider's Detection API + key |
| **Resilience: re-compression** | ❌ Hard binding destroyed; soft binding partially survives | N/A (text, not image) |
| **Resilience: light editing** | ❌ Any byte change invalidates signature | ⚠️ Graceful degradation; signal weakens proportionally |
| **Resilience: complete rewrite** | N/A | ❌ Signal fully destroyed |
| **Minimum content size** | Any file with metadata support | ~200–250 tokens for statistical significance |
| **Privacy** | Signing certificate may reveal identity of creator | No identifying information; model-family level only |
| **Art. 50(2) compliance** | ✅ Machine-readable + detectable (when metadata survives) | ✅ Machine-readable + detectable (when API accessible) |
| **Cross-vendor interop** | ✅ Open standard; any C2PA tool verifies any provider's credential | ❌ Each provider has its own key; no cross-provider protocol |
| **Cost / overhead** | Minimal (metadata attachment) | Zero ("no extra tokens," "same price") |

### 4.5 Month 1 Final Deliverables Checklist

Ensure each artifact is committed to your thesis repository and ready for discussion at the Friday colloquium:

| # | Deliverable | Location | Format | Status |
|:---:|:---|:---|:---|:---:|
| 1 | **Annotated Bibliography** (≥25 entries) | `thesis/docs/month_1/bibliography.bib` | BibTeX | ☐ |
| 2 | **Article 50 Compliance Matrix** | `thesis/docs/month_1/art50_compliance_matrix.md` | Markdown table | ☐ |
| 3 | **C2PA Technical Breakdown** (4pp) | `thesis/docs/month_1/c2pa_analysis.md` | Markdown | ☐ |
| 4 | **C2PA Survival Test Log** | `thesis/docs/month_1/c2pa_survival_tests.md` | Markdown + screenshots | ☐ |
| 5 | **SynthID-Text Mechanism Summary** (4pp) | `thesis/docs/month_1/synthid_text_analysis.md` | Markdown | ☐ |
| 6 | **Perturbation Resilience Table** | `thesis/docs/month_1/perturbation_analysis.md` | Markdown table | ☐ |
| 7 | **Legal-Technical Cross-Walk** (§4.1) | `thesis/docs/month_1/legal_technical_crosswalk.md` | Markdown table | ☑ |
| 8 | **C2PA vs. SynthID-Text Comparison** | `thesis/docs/month_1/c2pa_vs_synthid_comparison.md` | Markdown table | ☑ |
| 9 | **Tool Functional Requirements Spec v0.1** | `thesis/docs/month_1/tool_requirements_v01.md` | Structured spec | ☑ |
| 10 | **Entropy Analysis Script + Results** | `thesis/docs/month_1/scripts/entropy_analysis.py` | Python | ☑ |
| 11 | **Draft Chapter 2 outline** (section headings + 1-para summaries) | `thesis/docs/month_1/chapter2_outline.md` | Markdown | ☑ |

### 4.6 Week 4 Schedule

| Day | Task | Hours |
|:---:|:-----|:-----:|
| Mon | Build the Legal-Technical Cross-Walk table (§4.1) | 4h |
| Tue | Formalize platform-specific research questions (§4.2); draft tool requirements spec (§4.3) | 4h |
| Wed | Complete the C2PA vs. SynthID-Text comparison (§4.4); finalize annotated bibliography | 4h |
| Thu | Draft Chapter 2 outline with section headings and 1-paragraph summaries per section | 4h |
| Fri | Final review of all 11 deliverables; **Month 1 milestone presentation at Friday colloquium** | 4h |

**Week 4 Exit Criteria:** You can present the Legal-Technical Cross-Walk to Prof. Oermann and conclusively demonstrate that (a) no single provenance mechanism satisfies all Art. 50 obligations on Meta platforms, (b) a complementary approach (C2PA + statistical watermarking + client-side overlay) is necessary, and (c) the tool's functional requirements are well-defined for Month 2 architecture design.

---

## Key Questions to Present to Prof. Oermann at the End of Month 1

1. **"Can C2PA alone satisfy Art. 50(2) on Facebook/Instagram?"** → No. Hard-bound manifests are stripped on upload. Soft bindings are nascent and not yet deployed at scale by Meta. This motivates the need for invisible watermarks as a complementary layer.

2. **"How does SynthID-Text handle the short-text problem on social media?"** → Posts below ~200 tokens yield inconclusive detection. Average Facebook posts are significantly shorter. The tool must report "insufficient signal" rather than false negatives in these cases.

3. **"Who bears the Art. 50(4) disclosure obligation when a user posts AI content on Meta's platform?"** → The *deployer* (the posting user, or Meta if Meta's own AI tools generated the content). The provider (e.g., Anthropic) has already fulfilled their Art. 50(2) marking obligation by embedding the watermark. This distinction is critical for the compliance engine's logic.

4. **"How does WhatsApp's E2EE model affect provenance tracking?"** → E2EE prevents any server-side metadata injection. C2PA stripping occurs client-side before encryption. Text watermarks survive because the text itself is unchanged. However, there is no server-side "Made with AI" labelling mechanism — the browser extension would be the only verification layer.

5. **"What is the path to cross-provider interoperability?"** → Currently, each provider (Anthropic, Google, OpenAI) uses a different watermarking key. The Code of Practice encourages "interoperable" solutions (Art. 50(2)), but no cross-provider detection protocol exists. The thesis should flag this as a **regulatory gap** that the EU AI Office's implementing acts (Art. 50(7)) may need to address.
