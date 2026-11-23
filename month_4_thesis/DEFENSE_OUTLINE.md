# Master's Thesis Defense: Presentation Outline & Colloquium Guide

**Thesis Title:** *AI Transparency in the Wild: Bridging Technical Provenance and Legal Compliance under the EU AI Act on Social Media Platforms*  
**Candidate:** Pratyay Mondal · M.Sc. Artificial Intelligence  
**Institution:** Faculty of Applied Computer Sciences and Humanities, Technical University of Applied Sciences Würzburg-Schweinfurt (THWS)  
**Supervisors:** Prof. Dr. Markus Oermann (Primary Supervisor), Prof. Dr. Ivan Yamshchikov (Secondary Supervisor)  
**Allocated Defense Duration:** 15 Minutes Presentation + 15 Minutes Oral Examination / Colloquium (30 Minutes Total)  
**License:** Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)  

---

## 1. 15-Minute Defense Presentation Slide Deck (14 Slides)

### Slide 1: Title & Authorship (0:00 – 1:00)
- **Visuals:** Formal THWS insignia, thesis title, author credentials, supervisors, and CC BY-NC 4.0 license badge.
- **Key Talking Points:**
  - Introduce thesis title: *"AI Transparency in the Wild: Bridging Technical Provenance and Legal Compliance under the EU AI Act on Social Media Platforms"*.
  - Emphasize the core interdisciplinary focus: A 50/50 balance between legal analysis of the EU AI Act (Regulation (EU) 2024/1689) and technical computer science engineering (Manifest V3 extension, binary JUMBF parsing, statistical text watermarking, and empirical field auditing).

---

### Slide 2: The Core Problem: The De Jure vs. De Facto Transparency Gap (1:00 – 2:00)
- **Visuals:** Split screen: Left side shows the EU AI Act Article 50 statutory text; Right side shows a real-world social media feed with stripped metadata and deepfakes circulating without labels.
- **Key Talking Points:**
  - GenAI outputs are saturating public social feeds, posing severe threats to public discourse, elections, and consumer trust.
  - Brussels enacted Article 50: Mandating machine-readable marking (Art. 50(2)) and deepfake disclosures (Art. 50(4)).
  - *The Central Thesis Contradiction:* The law assumes provenance markers survive on platforms. In reality, platform content delivery networks strip container metadata, deployers bypass voluntary disclosure switches, and short text captions fall into mathematical watermark blind spots.

---

### Slide 3: Research Questions & Dual Legal-Technical Methodology (2:00 – 3:00)
- **Visuals:** Flowchart showing methodological triangulation across Legal Doctrinal Analysis, Software Engineering, and Empirical Field Auditing.
- **Key Talking Points:**
  - **RQ1 (Technical Feasibility):** Can client-side browser extensions verify multimodal AI provenance in real time without sacrificing browser performance or violating GDPR data minimization?
  - **RQ2 (Empirical Reality):** To what extent do current platform pipelines (Facebook, Instagram, WhatsApp) preserve or destroy technical provenance signals in the wild?
  - **RQ3 (Policy Synthesis):** How must Article 50 statutory terms be operationalized into concrete technical standards and regulatory compliance frameworks?

---

### Slide 4: Legal Framework: Deconstructing EU AI Act Article 50 (3:00 – 4:00)
- **Visuals:** Diagram of Article 50's tripartite architecture:
  - Art. 50(2): AI Providers (Machine-readable marking & watermarking).
  - Art. 50(4): Deployers & Platforms (Conspicuous disclosure of deepfakes & synthetic text).
  - Art. 50(5): European AI Office & Codes of Practice (Enforcement milestones: Dec 2, 2026 / Feb 2, 2027).
- **Key Talking Points:**
  - Recitals 131–134 emphasize fundamental rights (EU Charter Arts. 8, 11, 38).
  - The legal-technical translation challenge: Defining "state of the art", "technically feasible", and "appropriate machine-readable format".

---

### Slide 5: The Technical Provenance Landscape: C2PA vs. SynthID-Text (4:00 – 5:00)
- **Visuals:** Side-by-side technical comparison table:
  - Cryptographic Container Metadata (C2PA v2.1, ISO/IEC 19566-5 JUMBF boxes, digital signatures).
  - Generative Statistical Watermarking (SynthID-Text, green/red token partitioning, $z$-score hypothesis testing).
- **Key Talking Points:**
  - The Ingestion Fragility of C2PA: Header-bound metadata is destroyed whenever an image is re-encoded or compressed.
  - The Statistical Dead Zone of SynthID: In short text spans ($T < 50$ tokens) or low-entropy text ($H_2 < 3.0$ bits), statistical power collapses, producing unacceptable false positive rates.

---

### Slide 6: System Architecture: The AI Transparency & Provenance Validator (5:00 – 6:15)
- **Visuals:** Architecture schematic showing Manifest V3 topology:
  - Content Script with `IntersectionObserver` & `PlatformAdapter` (Facebook, Instagram, WhatsApp).
  - Binary Image Engine (`FR-01`): Client-side binary JUMBF pre-scanner (inspecting `APP11`/`caBX` byte sequences without WebAssembly overhead).
  - Statistical Text Engine (`FR-02`): Token estimation + 2-gram Shannon conditional entropy ($H_2$) gating + SynthID verification.
  - Compliance Engine (`FR-03`): Three-valued logic (`COMPLIANT`, `NON_COMPLIANT`, `UNKNOWN`) mapping to 4 visual pill states.
  - UI Injector (`FR-04`): Isolated Shadow DOM Web Components.
- **Key Talking Points:**
  - Privacy-by-Design (`NFR-01`): Zero PII, usernames, post text, or URLs are ever transmitted or stored outside the local client.

---

### Slide 7: Live Prototype Demonstration & User Interface Design (6:15 – 7:45)
- **Visuals:** High-resolution screenshots of the 4 visual badge states and the enlarged `<ai-audit-drawer>`:
  - 🟢 **Verified AI** (Valid provenance + disclosure).
  - 🟡 **Platform Tagged** (Platform labeled AI, but underlying C2PA was stripped by CDN).
  - 🔴 **Undisclosed AI** (Detectable AI text/media, but deployer omitted disclosure).
  - ⚪ **Unverifiable** (Micro-span $<50$ tokens or non-AI signal).
- **Key Talking Points:**
  - *Supervisor Feedback Implemented:* Reversed visual hierarchy—plain-English legal compliance verdicts at the top; collapsible technical diagnostics (C2PA claims, entropy $H_2$, $z$-score) at the bottom.
  - Avoids cognitive overload for everyday users while preserving full auditability for researchers and legal authorities.

---

### Slide 8: Experiment A: Controlled Ground-Truth Benchmark (7:45 – 9:00)
- **Visuals:** Confusion matrix table across $N = 12$ ground-truth items on Facebook, Instagram, and WhatsApp mock testbeds.
- **Key Talking Points:**
  - 100% deterministic accuracy across all 4 visual states:
    - Verified AI: Precision = 1.0000, Recall = 1.0000, $F_1 = 1.0000$.
    - Platform Tagged: Precision = 1.0000, Recall = 1.0000, $F_1 = 1.0000$.
    - Undisclosed AI: Precision = 1.0000, Recall = 1.0000, $F_1 = 1.0000$.
    - Unverifiable: Precision = 1.0000, Recall = 1.0000, $F_1 = 1.0000$.
  - Proves the deterministic correctness of our legal-technical classification logic (`FR-03`) prior to in-the-wild deployment.

---

### Slide 9: Experiment B: In-the-Wild Meta Ecosystem Field Audit ($N = 144$) (9:00 – 10:15)
- **Visuals:** Embedded **`fig1_verdict_distribution.png`** (Multi-platform stacked bar chart showing 100% `NO_SIGNAL` across 32 Facebook, 38 Instagram, and 74 WhatsApp Web live items).
- **Key Talking Points:**
  - Naturalistic field audit of $N = 144$ real-world posts/messages.
  - Across all three platforms, consumer feeds currently operate in a complete transparency vacuum: Zero native platform labels, and zero surviving C2PA containers.

---

### Slide 10: Empirical Discovery 1: Zero C2PA Survival in the Wild (10:15 – 11:15)
- **Visuals:** Visual demonstration of the C2PA Ingestion Trap: Binary dump of a signed image before upload vs. after download from Meta CDN (showing complete removal of `0xFFEB` JUMBF marker).
- **Key Talking Points:**
  - Across all 46 media-bearing posts audited on Instagram and WhatsApp Web, **$46/46$ ($100.0\%$)** of C2PA manifests were stripped.
  - *Crucial Finding:* The EU AI Act's implicit assumption that C2PA container metadata will provide ubiquitous consumer transparency is completely invalidated by current platform CDN compression pipelines.

---

### Slide 11: Empirical Discovery 2: The Micro-Span Verification Dead Zone (11:15 – 12:15)
- **Visuals:** Embedded **`fig2_token_length_deadzone.png`** (Boxplot of caption lengths across Facebook, Instagram, and WhatsApp Web with the 50-token red threshold line).
- **Key Talking Points:**
  - **$75.69\%$ ($109/144$)** of audited captions fell below the 50-token threshold:
    - Instagram: $100.0\%$ under 50 tokens (median 16 tokens).
    - WhatsApp Web: $79.73\%$ under 50 tokens (median 26 tokens).
  - Proves that statistical watermarking cannot verify viral short-form social commentary without generating severe false positive risks, justifying our explicit `⚪ Unverifiable` epistemic state.

---

### Slide 12: Empirical Discovery 3: Real-Time Performance & SLAs (12:15 – 13:00)
- **Visuals:** Embedded **`fig3_processing_latency.png`** (Grouped bar chart of Mean and $p_{95}$ latencies vs. the 200ms budget).
- **Key Talking Points:**
  - Mean processing latency: **$50.86\text{ ms}$** (median $6.0\text{ ms}$, $p_{95} = 187.0\text{ ms}$).
  - 100% compliant with our non-functional latency budget (`NFR-02` $< 200\text{ ms}$), demonstrating that client-side transparency verification can operate seamlessly on live feeds without causing browser frame drops.

---

### Slide 13: Tripartite Policy & Regulatory Advisory Framework (13:00 – 14:15)
- **Visuals:** Summary diagram of the three stakeholder advisory pillars:
  - **AI Providers (Art. 50(2)):** Mandatory dual-layer provenance (coupling C2PA with generative watermarking) + privacy-preserving public verification endpoints.
  - **Platforms / Deployers (Art. 50(4)):** CDN metadata preservation (passing through JUMBF boxes) + automated enforcement gates replacing voluntary toggles.
  - **End-Users & Auditors (Art. 50(5)):** Institutional recognition of client-side browser extensions as independent compliance watchdogs.
- **Key Talking Points:**
  - Guidance for the EU AI Office Code of Practice ahead of the Dec 2, 2026 and Feb 2, 2027 statutory deadlines.

---

### Slide 14: Conclusion, Future Roadmap & Defense Q&A (14:15 – 15:00)
- **Visuals:** Summary bullet points of contributions, GitHub repository QR code, thesis supervisors acknowledgment, and "Questions & Discussion" banner.
- **Key Talking Points:**
  - Summary: Bridged legal mandates and technical reality through empirical data and working software.
  - Future Work: Client-side local neural watermarking (WASM), cross-platform expansion to TikTok and X.
  - Thank supervisors (Prof. Dr. Oermann, Prof. Dr. Yamshchikov) and invite the colloquium committee to ask questions.

---

## 2. Anticipated Colloquium Defense Questions & Model Responses

### Question 1 (Legal Scope):
*"Why does the thesis focus primarily on Article 50 rather than high-risk AI obligations under Article 6 and Annex III?"*
- **Model Response:**  
  *"While Annex III covers high-risk systems deployed in critical domains (e.g., healthcare, law enforcement), Article 50 establishes horizontal transparency duties that directly govern how hundreds of millions of ordinary European citizens interact with everyday generative AI on social media. Article 50 is the primary legal mechanism safeguarding the democratic public sphere against synthetic disinformation. Furthermore, because Article 50 directly mandates 'machine-readable' signals and 'detectable' markers, it represents the exact legal nexus where computer science provenance engineering meets statutory compliance."*

### Question 2 (Technical Scalability):
*"If C2PA is stripped by social media platforms, why didn't you rely exclusively on statistical watermarking like SynthID?"*
- **Model Response:**  
  *"Our empirical evaluation in Chapter 4 demonstrates that statistical watermarking alone cannot solve the social media transparency crisis due to the Micro-Span Dead Zone ($75.69\%$ of captions had fewer than 50 tokens). In short spans, statistical variance is too high to distinguish between genuine AI watermark signals and human language without producing catastrophic false positive rates. Therefore, our thesis advocates for a dual-layer approach: statistical watermarks survive pixel/token edits in long-form media, while container metadata preserves non-repudiable cryptographic identity for verifiable content."*

### Question 3 (GDPR & Data Protection):
*"How does your browser extension verify posts on encrypted platforms like WhatsApp Web without violating GDPR Article 5(1)(c) data minimization or compromising end-to-end encryption?"*
- **Model Response:**  
  *"The extension operates entirely locally in client memory (`NFR-01`). It does not send post text, contact names, phone numbers, or chat transcripts to any remote server. When inspecting captions, only statistical structural properties (token count $T$ and conditional entropy $H_2$) are computed in-memory. For image provenance, the binary JUMBF scanner parses local blob headers without inspecting or transmitting image content. WhatsApp's end-to-end encryption is preserved because verification happens at the decrypted endpoint on the user's display, functioning as an assistive user-agent tool."*

---

```
Document compiled under month_4_thesis/DEFENSE_OUTLINE.md
THWS Master's Thesis Defense Architecture · Month 4 Deliverables
```
