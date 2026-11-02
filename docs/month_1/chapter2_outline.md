# Chapter 2: Theoretical Background & State of the Art — Draft Outline

**Thesis:** AI Transparency in the Wild: Bridging Technical Provenance and Legal Compliance under the EU AI Act on Social Media Platforms

**Author:** Pratyay Mondal
**Phase:** Month 1 / Week 4
**Date:** November 2026

> [!NOTE]
> Each section heading below is followed by a one-paragraph summary describing what must be written in that section. This outline serves as the structural blueprint for the full Chapter 2 draft.

---

## 2.1 The EU AI Act and Transparency Obligations

### 2.1.1 Legislative Context and Scope

This section situates the EU AI Act (Regulation (EU) 2024/1689) within the broader European digital governance framework (GDPR, DSA, DMA). It explains the risk-based classification system and identifies where AI-generated content obligations fall within the Act's architecture. The section establishes that Art. 50 creates a novel obligation category — transparency for generative AI — that is distinct from high-risk system requirements and applies horizontally to any AI system generating synthetic text, audio, image, or video content, regardless of risk classification.

### 2.1.2 Article 50 Decomposition: Provider, Deployer, and Platform Obligations

This section performs a clause-by-clause legal analysis of Art. 50(1)–(7), decomposing the obligation structure into three actor categories: providers (Art. 50(2) — machine-readable marking), deployers (Art. 50(4a)/(4b) — disclosure of synthetic content in public-interest contexts), and the implicit platform responsibility for user-facing visibility (Art. 50(5)). The analysis highlights the editorial-control exemption in Art. 50(4b), the "effective, interoperable, robust, reliable" criteria for marking mechanisms, and the delegated implementing acts under Art. 50(7) that the EU AI Office may use to specify technical standards. The Guidelines on Transparency Obligations (EU AI Office, 2025) are used as interpretive guidance throughout.

### 2.1.3 Temporal Scope and Enforcement Timeline

This section maps the phased entry-into-force dates relevant to Art. 50 obligations (full applicability from August 2, 2026) and discusses enforcement mechanisms, including the role of national market-surveillance authorities and the EU AI Office. It notes that implementing acts specifying technical watermarking standards (Art. 50(7)) have not yet been adopted as of November 2026, creating regulatory uncertainty for providers choosing between competing technical approaches.

---

## 2.2 Content Provenance and Authenticity Infrastructure

### 2.2.1 The C2PA Standard: Architecture and Trust Model

This section provides a technical deep-dive into the Coalition for Content Provenance and Authenticity (C2PA) specification (v2.1), covering the manifest store architecture (JUMBF superbox structure, CBOR-encoded claims, assertion types including `c2pa.ai_info`), the cryptographic binding mechanism (hard binding via SHA-256/384 byte-range hashes, soft binding via perceptual hashes), the X.509 trust model with Content Authenticity Initiative (CAI) trust anchors, and the ingredient-chain DAG enabling provenance tracking from creation through editing. The section explains why hard binding is a binary invariant that tolerates zero modification.

### 2.2.2 C2PA Failure Modes on Social Media Platforms

This section presents the empirical findings from the Week 2 compression stress test, documenting the three-layer failure taxonomy (physical destruction of JUMBF markers, cryptographic invalidation of hard-binding hashes, semantic loss of provenance chains) across Meta's platform-specific media pipelines. The 0/8 survival rate across Facebook Feed, Instagram Feed/Story, and WhatsApp Standard/HD is reported with pipeline-specific parameters (quality factors, maximum dimensions, metadata stripping behavior). The section distinguishes WhatsApp's uniquely hostile client-side processing (before E2E encryption) from Facebook/Instagram's server-side re-encoding and discusses Meta's "Made with AI" label as a detect-then-discard intermediary that reads C2PA at upload but strips it during CDN distribution.

### 2.2.3 Soft Binding and Invisible Image Watermarking as Complementary Layers

This section surveys the emerging complementary approaches to C2PA hard binding: soft binding via perceptual hashes (supported in C2PA v2.0+ but with nascent adoption), and invisible image watermarking systems (Google SynthID-Image, Adobe Content Authenticity watermark). It analyzes why these approaches are designed to survive lossy compression and format conversion — the exact transformations that destroy hard binding — and discusses their current integration status with Meta's detection pipeline. The section positions invisible image watermarks as the "second layer" in a defense-in-depth provenance architecture.

---

## 2.3 Statistical Text Watermarking for Language Model Outputs

### 2.3.1 The Kirchenbauer Green-List Framework

This section formalizes the foundational statistical text watermarking mechanism (Kirchenbauer et al., ICML 2023): the keyed pseudo-random function \(\mathrm{PRF}_k\) generating context-dependent green/red vocabulary partitions, the soft logit bias \(\delta\) promoting green-list tokens during sampling, and the zero-shot detection via one-proportion \(z\)-test. It derives the detection statistics:

\[
z = \frac{|s|_G - \gamma T}{\sqrt{\gamma(1-\gamma)T}}
\]

and explains why detection power scales with \(\sqrt{T}\), establishing the fundamental length dependency that constrains social media applicability.

### 2.3.2 SynthID-Text and Production Watermarking Systems

This section covers the production generalization: SynthID-Text's tournament sampling with \(m\) independent \(g\)-function layers (Dathathri et al., Nature 2024), the distinction between distortionary and non-distortionary modes, and deployment on Google Gemini. It then discusses Anthropic's Claude watermark as a confirmed SynthID-Text variant. The section emphasizes the operational constraint that detection requires the provider's secret key, making third-party verification impossible without API access or key escrow — a direct tension with Art. 50(2)'s "detectable" requirement.

### 2.3.3 Entropy Dependence and the Social Media Short-Text Problem

This section analyzes why watermark capacity is bounded by conditional token entropy \(H(X_t \mid X_{<t})\) and presents the empirical entropy analysis across four text genres (creative prose, factual report, code, social media caption). It documents the "statistical dead zone" for Instagram captions (\(T \approx 20\) tokens) and code snippets (75% non-nudgeable tokens), and derives the minimum token thresholds for reliable detection at various confidence levels. The regulatory implication is that Art. 50(2) "machine-readable detectability" is both entropy-gated and length-gated, and social media micro-spans cannot reliably carry detectable watermarks.

### 2.3.4 Robustness Under Social Media Transformations

This section presents the empirical stress-test results from Week 3's 13-transformation harness, categorizing transformations by survival: survived (verbatim copy-paste, character/word substitution, caption truncation on long text, moderate paraphrase, emoji noise injection), borderline (aggressive truncation on short text), and destroyed (cross-language translation, other-LM rewrite, full token shuffle). The cascading seed corruption mechanism (\(h\)-gram context dependency) is explained as the root cause: editing one token in the context window invalidates subsequent PRF seeds. Platform-specific risks are mapped: Meta auto-translate (total watermark destruction), WhatsApp text forwarding (watermark preserved), Instagram caption truncation in feed view (power loss).

---

## 2.4 Platform-Specific Analysis: The Meta Ecosystem

### 2.4.1 Media Processing Pipelines: Facebook, Instagram, and WhatsApp

This section provides a unified technical characterization of Meta's three-platform media processing architecture: shared CDN infrastructure for Facebook and Instagram (server-side decode → resize → re-encode), platform-specific parameters (quality factors, maximum dimensions, format conversion to WebP), and WhatsApp's distinct client-side processing before E2E encryption. It documents the metadata stripping behavior across platforms (EXIF, XMP, JUMBF) and explains why WhatsApp is the most hostile environment for container-based provenance (no server-side re-injection opportunity).

### 2.4.2 Meta's "Made with AI" Labelling System

This section analyzes Meta's existing AI content labelling infrastructure as of Q3 2026: the detection pipeline that reads C2PA and invisible watermarks at upload time, the application of "Made with AI" platform labels, and the critical gap that the original provenance metadata is stripped during CDN re-encoding while only Meta's proprietary label persists. The section evaluates this as a "trust-the-platform" model that does not constitute independent cryptographic verification and identifies the implications for Art. 50 compliance assessment by third-party tools.

---

## 2.5 Research Gap Synthesis and Thesis Positioning

### 2.5.1 The Legal-Technical Gap Map

This section synthesizes the cross-walk matrix findings into a formal gap analysis, identifying three primary gaps: (1) the container fragility gap (Art. 50(2) assumes provenance signals survive distribution, but Meta's CDN destroys C2PA), (2) the interoperability gap (C2PA is interoperable but fragile; SynthID-Text is resilient but provider-siloed), and (3) the visibility gap (Art. 50(5) demands first-exposure disclosure, but both C2PA and watermarks are invisible to end users). The section argues that these gaps motivate the thesis's central contribution: a client-side verification overlay that combines surviving technical marks with visible disclosure.

### 2.5.2 Existing Tools and Their Limitations

This section surveys existing content authenticity verification tools (Content Credentials Verify, Truepic, Hive Moderation, GPTZero, etc.) and evaluates their applicability to the Meta ecosystem. It identifies that no existing tool: (a) operates as a browser extension on Meta platforms, (b) combines image provenance and text watermark detection, (c) maps detection outputs to specific Art. 50 obligation statuses, or (d) provides visible first-exposure disclosure. This positions the thesis tool as filling a concrete research and engineering gap.

### 2.5.3 Working Thesis Statement

This section presents the refined working thesis statement emerging from Month 1's analysis: "Neither C2PA hard-bound image provenance nor SynthID-Text statistical watermarking alone satisfies the EU AI Act's Art. 50 transparency obligations on social media platforms. A complementary, layered approach — combining surviving technical marks, deployer disclosure mechanisms, and a client-side verification overlay — is necessary to bridge the gap between regulatory mandate and technical reality in the Meta ecosystem." The section outlines how Chapters 3–5 will operationalize this thesis through architecture design, implementation, and empirical evaluation.

---

> [!IMPORTANT]
> This outline will be refined based on supervisor feedback and updated as Month 2 architecture work produces additional technical findings. The following companion deliverables from Month 1 serve as source material for the full chapter text:
>
> - `legal_technical_crosswalk.md` — Art. 50 obligation-to-mechanism mapping
> - `c2pa_vs_synthid_comparison.md` — Technical comparison of provenance approaches
> - `tool_requirements_v01.md` — Browser extension requirements specification
