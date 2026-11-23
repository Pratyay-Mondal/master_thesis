# Thesis Structure, Chapter Outline, and Artifact Cross-Reference Mapping

**Thesis Title:** *AI Transparency in the Wild: Bridging Technical Provenance and Legal Compliance under the EU AI Act on Social Media Platforms*  
**Author:** Pratyay Mondal · M.Sc. Artificial Intelligence  
**Institution:** Faculty of Applied Computer Sciences and Humanities, Technical University of Applied Sciences Würzburg-Schweinfurt (THWS)  
**Supervisors:** Prof. Dr. Markus Oermann (Primary Supervisor), Prof. Dr. Ivan Yamshchikov (Secondary Supervisor)  
**Execution Phase:** Month 4 of Execution (Proposal Month 6: Legal-Technical Synthesis, Manuscript Assembly & Defense Preparation)  
**License:** Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)  

---

## 1. Thesis Blueprint & 50/50 Legal-Technical Balance

In accordance with THWS Master's thesis guidelines and the approved research proposal, this thesis maintains a strict **50/50 balance between legal analysis and computer science engineering**. It demonstrates that statutory transparency obligations under the EU AI Act (Regulation (EU) 2024/1689) cannot be evaluated through black-letter law alone, nor solved solely through technical protocols; rather, effective transparency requires an empirical, client-side bridge between machine-readable provenance and statutory disclosure.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        MASTER'S THESIS STRUCTURAL ARCHITECTURE                         │
├───────────────────────────────────────────┬────────────────────────────────────────────┤
│         LEGAL ANALYSIS (50%)              │        TECHNICAL ENGINEERING (50%)         │
├───────────────────────────────────────────┼────────────────────────────────────────────┤
│ • EU AI Act Article 50 Statutory Mandate  │ • C2PA JUMBF Container Architecture        │
│ • Tripartite Obligations (Art. 50(2)/(4)/(5))│ • Statistical Watermarking (SynthID-Text)   │
│ • Fundamental Rights & Recitals 131–134   │ • MV3 Browser Extension Implementation     │
│ • Legal-Technical Translation Problem    │ • Dual-Engine Provenance Verification      │
│ • Enforcement Timelines & Codes of Pract. │ • Micro-Span & Conditional Entropy Gating  │
│ • Policy & Regulatory Governance Model    │ • Empirical Telemetry & Meta Ecosystem Audit│
└───────────────────────────────────────────┴────────────────────────────────────────────┘
```

---

## 2. Comprehensive Chapter-by-Chapter Outline

### Chapter 1: Introduction (~10–12 pages)
- **1.1 The Proliferation of Generative AI and the Epistemic Crisis on Social Media:**  
  The scale of synthetic multimodal content (diffusion imagery, neural voice cloning, LLM text generation) on consumer social platforms; epistemic risks to democratic discourse, public trust, and consumer autonomy.
- **1.2 The De Jure vs. De Facto Transparency Gap:**  
  The fundamental contradiction between legal transparency mandates enacted in Brussels and the technical reality of social media platforms where metadata is stripped, watermarks degrade, and platform tagging is omitted.
- **1.3 Problem Statement & Core Thesis:**  
  Relying on platform self-regulation and voluntary disclosures fails to satisfy EU AI Act Article 50 requirements. Verifiable AI transparency requires decentralized, client-side auditing operating directly at the point of consumption.
- **1.4 Research Questions (RQ1–RQ3):**  
  - **RQ1 (Technical Feasibility):** Can a client-side browser extension verify multimodal AI provenance (C2PA metadata and SynthID text watermarks) in real time without degrading browser responsiveness or violating GDPR data minimization?
  - **RQ2 (Empirical Reality):** To what extent do current social media platform pipelines (specifically Meta's Facebook, Instagram, and WhatsApp Web ecosystems) preserve or destroy technical provenance signals in the wild?
  - **RQ3 (Legal-Technical Synthesis):** How must statutory terms under Article 50 ("detectable", "machine-readable", "deep fake") be operationalized into actionable technical standards and regulatory compliance policies?
- **1.5 Methodological Triangulation:**  
  Integration of legal doctrinal analysis, software engineering research (Manifest V3 architecture, Shadow DOM isolation), and empirical observational field auditing.
- **1.6 Structure and Key Contributions of the Dissertation.**

---

### Chapter 2: Legal Framework and Technical State of the Art (~25–30 pages)
- **2.1 The Regulatory Architecture of the EU AI Act (Regulation (EU) 2024/1689):**  
  - Risk-based classification framework and the positioning of Article 50 transparency obligations for AI systems.
  - Legislative history, Recitals 131–134, and the fundamental rights nexus (Charter of Fundamental Rights Arts. 8, 11, 38).
  - Statutory deconstruction of Article 50:
    - **Article 50(2):** Machine-readable marking and watermarking obligations for AI providers.
    - **Article 50(4):** Mandatory disclosure obligations for deployers of deepfakes and AI-generated public text.
    - **Article 50(5):** Codes of Practice, harmonized European standards, and implementation timelines (Dec 2, 2026 / Feb 2, 2027).
- **2.2 Cryptographic Container Provenance: The C2PA Standard:**  
  - Coalition for Content Provenance and Authenticity (C2PA) specification and ISO/IEC 19566-5 JUMBF architecture.
  - Manifest structure: Assertion stores, claim dictionaries, signature boxes, and X.509 PKI trust lists.
  - Binary box parsing (`APP11` markers in JPEG, `caBX` chunks in PNG/WebP).
  - Known container vulnerabilities: Stripping during re-encoding, transcoding pipelines, stripping of EXIF/JUMBF boxes by CDNs, lack of binding to pixel values.
- **2.3 Generative Statistical Watermarking: SynthID-Text:**  
  - Algorithmic foundations: Pseudorandom green/red vocabulary partitioning via $g$-functions during autoregressive token sampling.
  - Statistical hypothesis testing: Computing the one-proportion $z$-score and $p$-value over token sequences.
  - Theoretical bounds: Information-theoretic limits, false positive control, and the Shannon conditional entropy floor ($H_2 \ge 3.0$ bits).
  - The Micro-Span Blind Spot: Severe statistical power degradation in short text spans ($T < 50$ tokens).
- **2.4 Cross-Modal Provenance Comparison:**  
  - Detailed comparative analysis of C2PA container signatures vs. SynthID generative watermarks across survival, adversarial robustness, privacy, and computational complexity.
- **2.5 The Legal-Technical Translation Problem:**  
  - Resolving statutory ambiguities: What constitutes "technically feasible", "state of the art", and "appropriate machine-readable format"?
  - Formulating the legal-technical crosswalk: Mapping statutory compliance criteria to algorithmic outputs.

---

### Chapter 3: System Architecture & Implementation: The AI Transparency & Provenance Validator (~30–35 pages)
- **3.1 Architectural Philosophy: Local Autonomy and Privacy-by-Design:**  
  - The mandate for client-side auditing: Zero reliance on platform-supplied verification APIs.
  - GDPR Article 5(1)(c) data minimization: Processing text and media locally on the user's device without transmitting post content, usernames, or browsing history.
- **3.2 Manifest V3 Multi-Tier Extension Topology:**  
  - Separation of concerns across Content Script, Background Service Worker, and Injected UI.
  - Viewport-gated observation pipeline: `IntersectionObserver` throttling and `MutationObserver` handling of single-page application (SPA) virtual DOMs.
- **3.3 Platform-Specific DOM Adapters:**  
  - Architectural abstraction (`PlatformAdapter` interface).
  - Platform-specific implementation for Facebook Desktop Feed, Instagram Desktop Feed, and WhatsApp Web (E2EE container deduplication).
- **3.4 Binary Image Provenance Engine (`FR-01`):**  
  - Client-side JUMBF pre-scanner operating directly on binary stream headers (`Uint8Array`).
  - Avoiding heavy WebAssembly compilation overhead during viewport scrolling.
  - Fast-path verification: Instant detection of stripped manifests vs. valid C2PA containers.
- **3.5 Statistical Text Provenance Coordinator (`FR-02`):**  
  - DOM text normalization and React virtual DOM boilerplate deduplication (`TextExtractor`).
  - Two-stage statistical gating (`TextAnalyzer`): Sub-50 token gating and character 2-gram conditional entropy ($H_2$) estimation.
  - Background Service Worker coordination and SynthID API invocation for eligible spans.
- **3.6 Statutory Legal Compliance Engine (`FR-03`):**  
  - Three-valued statutory logic (`COMPLIANT`, `NON_COMPLIANT`, `UNKNOWN`).
  - Cross-modal evaluation synthesizing image provenance, text watermarks, and native platform tags.
  - Mapping to four deterministic visual states: 🟢 `VERIFIED`, 🟡 `PLATFORM_TAGGED`, 🔴 `UNDISCLOSED_AI`, ⚪ `NO_SIGNAL`.
- **3.7 Progressive-Disclosure User Interface (`FR-04`):**  
  - Web Components in Shadow DOM isolation (`<ai-transparency-badge>`, `<ai-audit-drawer>`).
  - Reversed visual hierarchy: Plain-English legal compliance verdicts at the top; collapsible technical diagnostics (C2PA claims, entropy, $z$-score) at the bottom.
  - Viewport-clamped top-layer positioning and event isolation (`composedPath()`).
- **3.8 Non-Functional Engineering Verification:**  
  - Unit test suite: 75/75 passing automated tests across all components.
  - Latency budget enforcement: Sub-200ms client-side processing constraint (`NFR-02`).

---

### Chapter 4: Empirical Evaluation & In-the-Wild Benchmarking (~25–30 pages)
- **4.1 Experimental Design and Evaluation Protocol:**  
  - Two-tier empirical methodology combining deterministic laboratory benchmarking and in-the-wild field auditing.
  - Anonymized in-memory telemetry recorder and one-click JSON session exporter (`window.__AI_VALIDATOR_AUDIT_LOG__`).
- **4.2 Experiment A: Controlled Ground-Truth Benchmark ($N = 12$):**  
  - Testbed setup across `facebook_mock.html`, `instagram_mock.html`, and `whatsapp_mock.html`.
  - Multi-modal test case allocation across all four visual states.
  - Confusion matrix and performance metrics: 100% precision, recall, and macro-$F_1 = 1.0000$.
- **4.3 Experiment B: In-the-Wild Meta Ecosystem Field Audit ($N = 144$):**  
  - Naturalistic sampling across Facebook ($n = 32$), Instagram ($n = 38$), and WhatsApp Web ($n = 74$).
  - Field audit results: C2PA stripping rate, platform disclosure prevalence, token count distributions, and client-side processing latencies.
- **4.4 Empirical Findings & Statistical Analysis:**  
  - **Finding 1: Universal Container Stripping:** Exactly $46/46$ ($100.0\%$) of audited media images were stripped of C2PA manifests by platform CDNs and compression pipelines.
  - **Finding 2: Platform Label Scarcity:** Zero audited posts ($0.0\%$) featured native platform disclosures ("AI info", "KI-Info").
  - **Finding 3: The Micro-Span Dead Zone:** $75.69\%$ ($109/144$) of live captions fell below the 50-token watermarking threshold (median 60 on Facebook, 16 on Instagram, 26 on WhatsApp).
  - **Finding 4: Real-Time Performance Compliance:** Overall mean latency of $50.86\text{ ms}$ (median $6.0\text{ ms}$, $p_{95} = 187.0\text{ ms}$), comfortably satisfying the 200 ms budget (`NFR-02`).
- **4.5 Visualizations & Academic Figures:**  
  - Analysis of `fig1_verdict_distribution.png` (Stacked verdict distribution across platforms).
  - Analysis of `fig2_token_length_deadzone.png` (Boxplot of caption lengths and watermarking dead zone).
  - Analysis of `fig3_processing_latency.png` (Mean and $p_{95}$ latency vs. 200ms SLA budget).

---

### Chapter 5: Legal-Technical Synthesis & Policy Recommendations (~20–25 pages)
- **5.1 The De Jure vs. De Facto Reality Check:**  
  - Why the EU AI Act's container-centric assumptions fail on consumer platforms: The tripartite provenance breakdown.
  - Re-evaluating Article 50's legal efficacy in light of empirical evidence.
- **5.2 Targeted Policy Recommendations for AI Providers (Art. 50(2)):**  
  - Mandatory dual-layer provenance: Coupling C2PA container metadata with generative statistical watermarking.
  - Public verification API obligations and interoperability standards under the Dec 2, 2026 / Feb 2, 2027 Codes of Practice.
- **5.3 Targeted Regulatory Obligations for Social Media Platforms (Art. 50(4)):**  
  - Mandatory preservation of JUMBF/APP11 metadata boxes during image ingestion and CDN transcoding.
  - Enforced deployer disclosure workflows: Transitioning from voluntary "Made with AI" toggles to automated and binding compliance gates.
- **5.4 Empowering End-Users and Independent Auditors (Art. 50(5)):**  
  - Institutional recognition of client-side browser extensions as vital transparency tooling for civil society.
  - Interface design principles: Progressive disclosure to eliminate cognitive fatigue while preserving auditability.
- **5.5 Roadmap to the 2026/2027 EU AI Act Enforcement Milestones:**  
  - Guidance for the European AI Office, European Parliament, and standard-setting organizations (CEN-CENELEC).

---

### Chapter 6: Conclusion, Limitations & Future Work (~6–8 pages)
- **6.1 Summary of Contributions:**  
  - Theoretical, legal, technical, and empirical contributions of the thesis.
- **6.2 Limitations of the Research:**  
  - Proprietary SynthID API access constraints; synthetic evaluation of text watermarks; platform obfuscation of DOM structures; cross-platform scope limited to the Meta ecosystem.
- **6.3 Agenda for Future Research:**  
  - Client-side WASM neural watermarking; expanding field audits to TikTok, X, and YouTube Shorts; automated regulatory reporting mechanisms for Digital Services Act (DSA) compliance.

---

## 3. Explicit Source-to-Section Mapping Table

This table maps every artifact, table, metric, script, and documentation section produced across Months 1, 2, and 3 into its exact destination in the final thesis manuscript:

| Thesis Section | Primary Source Artifact(s) | Key Tables, Figures & Empirical Metrics | Deliverable ID |
|:---|:---|:---|:---:|
| **Chapter 1** (Introduction) | `MONTH_1_DOCUMENTATION.md` (§1.1, §1.2)<br>`MONTH_3_DOCUMENTATION.md` (§1.1) | RQs 1–3, Timeline consolidation, Motivation | D-1.1, D-3.1 |
| **Section 2.1–2.2** (EU AI Act) | `MONTH_1_DOCUMENTATION.md` (§2)<br>`docs/month_1/art50_compliance_matrix.md` | Article 50 Compliance Matrix (Arts. 50(2), 50(4), 50(5)) | D-1.2 |
| **Section 2.3** (C2PA) | `MONTH_1_DOCUMENTATION.md` (§3)<br>`docs/month_1/c2pa_analysis.md` | JUMBF Box Hierarchy, APP11/caBX Chunk Layout | D-1.3 |
| **Section 2.4** (SynthID) | `MONTH_1_DOCUMENTATION.md` (§4)<br>`docs/month_1/synthid_text_analysis.md` | SynthID $z$-Score Formulation, Shannon Entropy Bounds | D-1.4 |
| **Section 2.5** (Cross-Modal) | `docs/month_1/c2pa_vs_synthid_comparison.md`<br>`docs/month_1/legal_technical_crosswalk.md` | C2PA vs SynthID Tradeoff Matrix, Statutory Crosswalk | D-1.5, D-1.6 |
| **Section 3.1–3.3** (Architecture) | `MONTH_2_DOCUMENTATION.md` (§1, §2)<br>`month_2_engineering/manifest.json` | Manifest V3 Topology Diagram, Observer Flowchart | D-2.1, D-2.2 |
| **Section 3.4** (Image Engine) | `MONTH_2_DOCUMENTATION.md` (§3.1)<br>`src/modules/image_provenance.js` | JUMBF Pre-Scanner Byte Signatures, Benchmark Table | D-2.3 |
| **Section 3.5** (Text Engine) | `MONTH_2_DOCUMENTATION.md` (§3.2)<br>`src/modules/text_analyzer.js` | 2-Gram Entropy Formulation, 50-Token Gating Rule | D-2.4 |
| **Section 3.6** (Compliance Engine)| `MONTH_2_DOCUMENTATION.md` (§3.3)<br>`src/modules/compliance_engine.js` | Legal Decision Table (6 Deterministic Cases) | D-2.5 |
| **Section 3.7** (UI Components) | `MONTH_2_DOCUMENTATION.md` (§3.4)<br>`src/ui/drawer_component.js` | Reversed Visual Hierarchy, Plain-English Verdict Specs | D-2.6 |
| **Section 3.8** (Unit Testing) | `MONTH_2_DOCUMENTATION.md` (§4)<br>`month_2_engineering/tests/unit/` | 75/75 Passing Unit Tests (Table across 12 suites) | D-2.7 |
| **Section 4.1–4.2** (Exp. A) | `MONTH_3_DOCUMENTATION.md` (§4)<br>`month_3_evaluation/results/EMPIRICAL_SUMMARY.md` | Confusion Matrix ($N=12$), Precision, Recall, $F_1=1.0000$ | D-3.5 |
| **Section 4.3–4.4** (Exp. B) | `MONTH_3_DOCUMENTATION.md` (§5)<br>`month_3_evaluation/results/EMPIRICAL_SUMMARY.md` | In-the-Wild Audit Table ($N=144$), Medians 60/16/26, Latency 50.86ms | D-3.5 |
| **Section 4.5** (Figures) | `month_3_evaluation/results/` | `fig1_verdict_distribution.png`, `fig2_token_length_deadzone.png`, `fig3_processing_latency.png` | D-3.6, D-3.7, D-3.8 |
| **Chapter 5** (Synthesis & Policy) | `month_4_thesis/POLICY_AND_ADVISORY_FRAMEWORK.md`<br>`documentation/MONTH_4_DOCUMENTATION.md` (§3) | Tripartite Governance Model, Policy Recommendations | D-4.1, D-4.2 |
| **Chapter 6** (Conclusion) | `month_4_thesis/DEFENSE_OUTLINE.md` (§12–§14) | Summary of Contributions, Limitations, Future Roadmap | D-4.3 |

---

```
Document compiled and maintained under month_4_thesis/THESIS_STRUCTURE_AND_MAPPING.md
THWS Master's Thesis Writing Workspace · Month 4 Deliverables
```
