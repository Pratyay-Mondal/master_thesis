# Month 4 Documentation: Legal-Technical Synthesis, Policy Advisory Framework, and Defense Architecture

**Thesis Title:** *AI Transparency in the Wild: Bridging Technical Provenance and Legal Compliance under the EU AI Act on Social Media Platforms*  
**Author:** Pratyay Mondal · M.Sc. Artificial Intelligence  
**Institution:** Faculty of Applied Computer Sciences and Humanities, Technical University of Applied Sciences Würzburg-Schweinfurt (THWS)  
**Supervisors:** Prof. Dr. Markus Oermann (Primary Supervisor), Prof. Dr. Ivan Yamshchikov (Secondary Supervisor)  
**Execution Period:** Month 4 of Execution (Proposal Month 6: Legal-Technical Synthesis, Manuscript Assembly & Defense Preparation)  
**License:** Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)  

---

### Intellectual Property & Open Access License Notice

```
Copyright (c) 2026 Pratyay Mondal. All rights reserved.
Technical University of Applied Sciences Würzburg-Schweinfurt (THWS).

This documentation and the underlying empirical and analytical artifacts are licensed
under the Creative Commons Attribution-NonCommercial 4.0 International License (CC BY-NC 4.0).
You are free to share (copy and redistribute the material in any medium or format) and
adapt (remix, transform, and build upon the material) under the following terms:
1. Attribution — You must give appropriate credit, provide a link to the license, and
   indicate if changes were made. You may do so in any reasonable manner.
2. NonCommercial — You may not use the material for commercial purposes.
Full License Legal Code: https://creativecommons.org/licenses/by-nc/4.0/legalcode
```

---

## 1. Executive Summary & Full-Lifecycle Thesis Alignment

With the completion of **Month 4 of execution**, the research and engineering work for this Master's thesis has fully fulfilled all six phases outlined in the original THWS research proposal. By consolidating software engineering across Month 2 and empirical benchmarking across Month 3, Month 4 culminates in a comprehensive legal-technical synthesis, policy advisory framework, full thesis chapter blueprint, and a defense-ready colloquium structure.

### 1.1 Proposal Lifecycle vs. Execution Consolidation Matrix

| Proposal Milestone | Original Scope | Execution Phase | Status | Key Deliverables & Verified Outcomes |
|:---|:---|:---:|:---:|:---|
| **Proposal Month 1** | Legal analysis & state of the art | **Month 1** | **Completed** | `docs/month_1/`, `MONTH_1_DOCUMENTATION.md`, Article 50 matrix, C2PA & SynthID survival tests, tool requirements spec `v0.1`. |
| **Proposal Month 2** | Core extension scaffolding | **Month 2** | **Completed** | `month_2_engineering/` MV3 setup, platform adapters, background service worker, GDPR `NFR-01` privacy compliance. |
| **Proposal Month 3** | Multimodal extraction | **Month 2** | **Completed** | Binary JUMBF pre-scanner (`FR-01`), 2-gram conditional entropy ($H_2$) & 50-token gating pipeline (`FR-02`). |
| **Proposal Month 4** | Compliance engine & UI overlay | **Month 2** | **Completed** | Three-valued legal decision logic (`FR-03`), Shadow DOM Web Components (`FR-04`), reversed drawer UX, 75/75 passing unit tests. |
| **Proposal Month 5** | Empirical evaluation & benchmarking | **Month 3** | **Completed** | `month_3_evaluation/`, Experiment A ($N=12, F_1=1.0000$), Experiment B ($N=144$ live posts, 46/46 C2PA stripped, $75.69\%$ dead zone), Figures `fig1`–`fig3`. |
| **Proposal Month 6** | Synthesis, writing & defense prep | **Month 4** | **Completed** | `month_4_thesis/`, `MONTH_4_DOCUMENTATION.md`, Chapter blueprint (Chapters 1–6), Policy Framework, Defense Slide Deck. |

---

## 2. Legal-Technical Synthesis: The Tripartite Provenance Breakdown

Month 3 empirical field audits ($N = 144$ real-world posts/messages on Facebook, Instagram, and WhatsApp Web) revealed three systemic failure modes preventing the effective enforcement of EU AI Act Article 50 on consumer social networks. Month 4 synthesizes these technical bottlenecks with statutory obligations, establishing concrete remedies for Chapter 5 of the thesis:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        LEGAL-TECHNICAL PROVENANCE SYNTHESIS                            │
├──────────────────────────┬───────────────────────────┬─────────────────────────────────┤
│ EMPIRICAL BOTTLENECK     │ ARTICLE 50 LEGAL IMPACT   │ REGULATORY & TECHNICAL REMEDY   │
├──────────────────────────┼───────────────────────────┼─────────────────────────────────┤
│ 1. 100% C2PA Stripping   │ Article 50(2) & 50(4)     │ Mandatory Metadata Passthrough: │
│    (46/46 audited images │ Providers mark outputs,   │ CDNs must preserve JUMBF boxes. │
│    lost JUMBF metadata   │ but platform transcoding  │ Platforms must re-sign resized  │
│    during CDN ingestion) │ creates a de facto void.  │ media as intermediate deployers.│
├──────────────────────────┼───────────────────────────┼─────────────────────────────────┤
│ 2. 0% Platform Tagging   │ Article 50(4)             │ Automated Enforcement Gates:    │
│    (0/144 live posts had │ Deployer disclosure fails │ Voluntary self-labeling toggles │
│    native "AI info" or   │ because voluntary toggles │ must be replaced with automated │
│    "Made with AI" tags)  │ are universally bypassed. │ provenance-detection injection. │
├──────────────────────────┼───────────────────────────┼─────────────────────────────────┤
│ 3. 75.7% Dead Zone       │ Article 50(2) & Recital   │ Epistemic State & Dual-Layer:   │
│    (109/144 captions <50 │ 133 "technical limits"    │ Short text cannot be verified;  │
│    tokens; 100% on IG,   │ Statistical watermarks    │ tools must show ⚪ Unverifiable;│
│    79.7% on WhatsApp)    │ cannot verify micro-spans.│ couple text with image C2PA.    │
└──────────────────────────┴───────────────────────────┴─────────────────────────────────┘
```

### 2.1 The Container Ingestion Vulnerability (Article 50(2) vs. Platform Practice)
Article 50(2) establishes that providers must output machine-readable markings based on "relevant harmonised standards" (primarily C2PA / ISO/IEC 19566-5). However, our empirical findings demonstrate that container-bound metadata suffers from an inherent structural vulnerability: it is bound to file headers (`APP11` or `caBX` chunks) rather than pixel values. When social media platforms optimize, resize, or compress media, these metadata boxes are systematically discarded.

*Policy Synthesis:* Without binding regulatory rules compelling Very Large Online Platforms (VLOPs) under the Digital Services Act (DSA) and EU AI Act Article 50(4) to preserve provenance metadata, provider-side watermarking under Article 50(2) is legally and practically ineffective.

### 2.2 The Platform Self-Regulation Illusion (Article 50(4) vs. Voluntary Disclosure)
Platforms currently satisfy Article 50(4) by providing voluntary self-labeling toggles in the upload interface (e.g., Meta's "AI info" label). In our audit of 144 live public posts across consumer feeds, not a single post activated this label ($0.0\%$). Deployers omit labels due to fear of algorithmic penalties, reduced virality, or lack of awareness.

*Policy Synthesis:* Voluntary self-disclosure represents regulatory theatre. Article 50(4) enforcement requires platforms to deploy mandatory, automated ingestion scanners that scan for provenance manifests and automatically lock the post's disclosure status to "AI info".

### 2.3 The Micro-Span Blind Spot (Article 50(2) vs. Information-Theoretic Bounds)
Recital 133 of the EU AI Act recognizes that watermarking obligations must account for "the specificities and limitations of the different types of content." Our empirical data provides the first quantitative proof of this limitation in consumer feeds: $75.69\%$ of social media captions contain fewer than 50 tokens (median 16 on Instagram, 26 on WhatsApp Web).

*Policy Synthesis:* Standard statistical watermarking (such as SynthID-Text) experiences mathematical failure in short text spans because token entropy $H_2$ is insufficient to compute statistically significant $z$-scores ($z > 3.0$). Regulators must not penalize providers or deployers for failing to detect micro-spans, and audit interfaces must display an explicit `⚪ Unverifiable` epistemic state to avoid misleading the public with false "Human" or "Authentic" claims.

---

## 3. Targeted Stakeholder Advisory Framework (Chapter 5 Blueprint)

Full operational details and regulatory timelines are codified in [`month_4_thesis/POLICY_AND_ADVISORY_FRAMEWORK.md`](file:///Users/pratyay/Documents/THWS/thesis/month_4_thesis/POLICY_AND_ADVISORY_FRAMEWORK.md):

1. **For AI Providers (Article 50(2)):**
   - **Mandatory Dual-Layer Architecture:** Embed both cryptographic container assertions (C2PA) and generative statistical watermarks (SynthID / distortion-free watermarking) into all synthetic outputs.
   - **Standardized Public Verification Endpoints:** Expose zero-knowledge verification APIs allowing downstream auditors to verify statistical watermarks without exposing private seed keys or compromising user privacy (`NFR-01`).
   - **Alignment with Code of Practice Milestones:** Prepare for the European AI Office's final Code of Practice deadline on **December 2, 2026** and full statutory enforcement on **February 2, 2027**.

2. **For Social Media Platforms & Deployers (Article 50(4)):**
   - **Preservation of Provenance Boxes:** Reconfigure CDN ingestion and transcoding software to pass through ISO/IEC 19566-5 JUMBF metadata boxes during image compression.
   - **Automated Label Injection:** Automatically detect incoming C2PA and watermark signals during upload and bind the post to an immutable, conspicuous "AI info" badge.
   - **E2EE Metadata Preservation:** Preserve client-side metadata headers in end-to-end encrypted messaging channels (WhatsApp Web) without violating E2EE cryptographic boundaries.

3. **For End-Users & Independent Auditors (Article 50(5)):**
   - **Decentralized Verification Tooling:** Institutionalize client-side browser extensions as independent watchdogs capable of auditing platform compliance without relying on platform self-reporting.
   - **Progressive Disclosure UI Standards:** Implement a reversed information hierarchy displaying plain-English legal verdicts at the top while tucking technical metrics ($z$-score, $H_2$, token count) into a collapsible rollover panel.

---

## 4. Master Artifact, Code & Figure Cross-Reference Index

This master index provides a single, unified reference table mapping all code modules, unit tests, empirical datasets, publication figures, and documentation files across Months 1–4 to their exact destination chapters in the thesis manuscript:

| Thesis Target Chapter | Code / Data Artifact Path | Supporting Documentation | Key Output / Verified Result | Deliverable ID |
|:---|:---|:---|:---|:---:|
| **Chapter 1** (Introduction) | `docs/month_1/` | `MONTH_1_DOCUMENTATION.md` (§1)<br>`MONTH_3_DOCUMENTATION.md` (§1) | Problem formulation, RQs 1–3, Scope & Methodology | D-1.1 |
| **Chapter 2** (Legal & SOTA) | `docs/month_1/art50_compliance_matrix.md`<br>`docs/month_1/legal_technical_crosswalk.md` | `MONTH_1_DOCUMENTATION.md` (§2, §3, §4)<br>`docs/month_1/c2pa_vs_synthid_comparison.md` | Art. 50 statutory matrix, C2PA JUMBF specs, SynthID $z$-score formulation | D-1.2, D-1.3, D-1.4, D-1.5 |
| **Chapter 3** (Architecture) | `month_2_engineering/manifest.json`<br>`src/content/platform_adapters.js`<br>`src/content/content_script.js` | `MONTH_2_DOCUMENTATION.md` (§1, §2) | MV3 architecture, DOM adapters, Viewport observation (`IntersectionObserver`) | D-2.1, D-2.2 |
| **Chapter 3** (Image Engine) | `src/modules/image_provenance.js` | `MONTH_2_DOCUMENTATION.md` (§3.1) | Binary JUMBF pre-scanner (`APP11`, `caBX`), zero-WASM fast path | D-2.3 |
| **Chapter 3** (Text Engine) | `src/modules/text_extractor.js`<br>`src/modules/text_analyzer.js` | `MONTH_2_DOCUMENTATION.md` (§3.2) | 2-gram conditional entropy ($H_2$), 50-token gating pipeline | D-2.4 |
| **Chapter 3** (Compliance) | `src/modules/compliance_engine.js` | `MONTH_2_DOCUMENTATION.md` (§3.3) | Three-valued statutory decision logic (`COMPLIANT`, `NON_COMPLIANT`, `UNKNOWN`) | D-2.5 |
| **Chapter 3** (UI Design) | `src/ui/badge_component.js`<br>`src/ui/drawer_component.js`<br>`src/content/ui_injector.js` | `MONTH_2_DOCUMENTATION.md` (§3.4) | Shadow DOM isolation, reversed hierarchy, plain-English legal verdicts | D-2.6 |
| **Chapter 3** (Verification) | `month_2_engineering/tests/unit/*.test.js` | `MONTH_2_DOCUMENTATION.md` (§4) | 75/75 passing unit tests across 12 test suites (100% pass rate) | D-2.7 |
| **Chapter 4** (Exp. A Benchmark) | `month_2_engineering/tests/mock_pages/`<br>`raw_logs/audit_log_*_mock.json` | `MONTH_3_DOCUMENTATION.md` (§4)<br>`results/EMPIRICAL_SUMMARY.md` (§2) | Controlled benchmark ($N=12$), Confusion Matrix, Macro $F_1 = 1.0000$ | D-3.5 |
| **Chapter 4** (Exp. B Audit) | `month_3_evaluation/raw_logs/`<br>(32 FB, 38 IG, 74 WA logs) | `MONTH_3_DOCUMENTATION.md` (§5)<br>`results/EMPIRICAL_SUMMARY.md` (§3) | In-the-wild audit ($N=144$), 46/46 C2PA stripped, $75.69\%$ dead zone | D-3.5 |
| **Chapter 4** (Figure 1) | [`results/fig1_verdict_distribution.png`](file:///Users/pratyay/Documents/THWS/thesis/month_3_evaluation/results/fig1_verdict_distribution.png) | `MONTH_3_DOCUMENTATION.md` (§5.6) | 300-DPI stacked bar chart of Article 50 verdicts across Meta platforms | D-3.6 |
| **Chapter 4** (Figure 2) | [`results/fig2_token_length_deadzone.png`](file:///Users/pratyay/Documents/THWS/thesis/month_3_evaluation/results/fig2_token_length_deadzone.png) | `MONTH_3_DOCUMENTATION.md` (§5.6) | 300-DPI boxplot showing caption distributions and 50-token dead zone | D-3.7 |
| **Chapter 4** (Figure 3) | [`results/fig3_processing_latency.png`](file:///Users/pratyay/Documents/THWS/thesis/month_3_evaluation/results/fig3_processing_latency.png) | `MONTH_3_DOCUMENTATION.md` (§5.6) | 300-DPI grouped bar chart verifying latency SLA ($50.86\text{ ms} < 200\text{ ms}$) | D-3.8 |
| **Chapter 5** (Policy & Reform) | `month_4_thesis/POLICY_AND_ADVISORY_FRAMEWORK.md` | `MONTH_4_DOCUMENTATION.md` (§2, §3) | Tripartite Advisory Framework, Code of Practice roadmap | D-4.1, D-4.2 |
| **Chapter 6** (Conclusion) | `month_4_thesis/DEFENSE_OUTLINE.md` | `MONTH_4_DOCUMENTATION.md` (§5) | Thesis contributions, research limitations, future technical directions | D-4.3 |

---

## 5. Pre-Submission & Colloquium Verification Checklist

To guarantee a seamless thesis submission and oral defense at THWS, this checklist tracks all academic, technical, and regulatory validation items:

### 5.1 Technical & Engineering Verification
- [x] **Unit Test Suite Integrity:** All 75 automated unit tests pass with zero failures (`npm --prefix month_2_engineering test`).
- [x] **Performance Budget Adherence:** Real-time client-side processing latency confirmed at mean $50.86\text{ ms}$ and median $6.0\text{ ms}$, well below the $< 200\text{ ms}$ threshold (`NFR-02`).
- [x] **GDPR Privacy Compliance:** Verified that in-memory telemetry recording (`window.__AI_VALIDATOR_AUDIT_LOG__`) records strictly technical variables, with zero transmission or persistence of PII, usernames, post text, or URLs (`NFR-01`).
- [x] **Mock Testbed Reproducibility:** Deterministic local mock servers confirm 100% precision, recall, and macro-$F_1 = 1.0000$ across all 4 visual states.
- [x] **Figure Rendering Quality:** All three thesis figures (`fig1`–`fig3`) rendered at 300 DPI with zero glyph warnings, no legend overlaps, and publication-standard typography.

### 5.2 Legal & Policy Rigor
- [x] **Statutory Precision:** Full alignment with the final enacted text of Regulation (EU) 2024/1689 (EU AI Act), specifically Articles 50(2), 50(4), 50(5), and Recitals 131–134.
- [x] **Enforcement Timeline Accuracy:** Correct mapping of the European AI Office Code of Practice timeline (December 2, 2026 drafting deadline; February 2, 2027 statutory application).
- [x] **Balanced 50/50 Allocation:** Exact equilibrium between legal doctrinal analysis and computer science engineering across all thesis chapters.

### 5.3 Thesis Manuscript & Defense Readiness
- [x] **Complete Chapter Blueprint:** All 6 chapters mapped from research question to empirical evidence in [`month_4_thesis/THESIS_STRUCTURE_AND_MAPPING.md`](file:///Users/pratyay/Documents/THWS/thesis/month_4_thesis/THESIS_STRUCTURE_AND_MAPPING.md).
- [x] **Policy Framework Drafted:** Tripartite advisory framework codified in [`month_4_thesis/POLICY_AND_ADVISORY_FRAMEWORK.md`](file:///Users/pratyay/Documents/THWS/thesis/month_4_thesis/POLICY_AND_ADVISORY_FRAMEWORK.md).
- [x] **Colloquium Presentation Structured:** 15-minute, 14-slide defense presentation with speaking notes and anticipated Q&A responses in [`month_4_thesis/DEFENSE_OUTLINE.md`](file:///Users/pratyay/Documents/THWS/thesis/month_4_thesis/DEFENSE_OUTLINE.md).
- [x] **Open Access Licensing:** All documentation files and empirical scripts published under the **CC BY-NC 4.0** license.

---

```
Document compiled and maintained under documentation/MONTH_4_DOCUMENTATION.md
THWS Master's Thesis Writing Workspace · Month 4 Deliverables
```
