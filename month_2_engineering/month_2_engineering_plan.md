# Month 2 Engineering Plan: AI Transparency & Provenance Validator

**Thesis:** *AI Transparency in the Wild: Bridging Technical Provenance and Legal Compliance under the EU AI Act on Social Media Platforms*  
**Candidate:** Pratyay Mondal · M.Sc. Artificial Intelligence · THWS  
**Supervisors:** Prof. Dr. Markus Oermann (Primary), Prof. Dr. Ivan Yamshchikov (Secondary)  
**Phase:** Month 2 — Architecture, Platform Abstraction & Prototype Engineering  
**Target System:** Manifest V3 Browser Extension (Chromium)  
**Repository Path:** `thesis/month_2_engineering/`  

---

## 1. Executive Summary & Architectural Vision

Month 1 established the empirical and legal foundations:
1. **The Container Transcoding Gap:** Meta's server-side ingestion pipelines completely destroy C2PA hard-bound JUMBF metadata across Facebook, Instagram, and WhatsApp (0/8 survival in our empirical stress tests, `compression_survival_report.json`).
2. **The Cryptographic Silo & Statistical Dead Zone:** SynthID-Text watermarks survive copy-pasting intact (\(z = 13.59\)), but require provider private keys for zero-shot detection and suffer catastrophic power collapse on short social media captions (\(T < 50\) tokens, \(z < 3.0\)).
3. **The User Visibility Gap:** Neither standard fulfills Article 50(5)'s requirement for clear, distinguishable disclosure at first exposure without an external presentation layer.

Month 2 translates these findings into an operational client-side software system: the **AI Transparency & Provenance Validator** browser extension. The extension acts as a client-side auditing and compliance overlay that intercepts DOM content on Facebook, Instagram, and WhatsApp Web, extracts media and text artifacts, coordinates provenance verification, and injects Article 50(5)-compliant visual badges via isolated Shadow DOM containers.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│               AI Transparency & Provenance Validator — Extension Pipeline              │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│  [ DOM Layer: Meta Platforms (FB / IG / WA) ]                                          │
│        │                                                                               │
│        ▼ (MutationObserver: detects dynamic React virtual DOM node insertion)          │
│  [ Post Discovery & Viewport Throttling ]                                              │
│        │                                                                               │
│        ▼ (IntersectionObserver: queues only visible posts; unobserves processed nodes) │
│  [ Ingestion Pipeline ]                                                                │
│        ├── Media Elements (<img>, <video>) ──► Week 2: C2PA WASM + Watermark Router    │
│        └── Text Nodes (Captions, Posts)    ──► Week 3: Token Counter + SynthID Router  │
│                                                          │                             │
│                                                          ▼                             │
│  [ Week 4: Compliance Engine ] ◄─────────────────────────┘                             │
│        ├── Art. 50(2) Provider Marking Verification                                    │
│        ├── Art. 50(4) Deployer Disclosure Extraction                                   │
│        └── Art. 50(4b) Editorial Review Exemption Classifier                           │
│        │                                                                               │
│        ▼                                                                               │
│  [ Week 1 / Week 4: UI Injection Layer ]                                               │
│        └── Isolated Shadow DOM Badge (Green / Amber / Red / Grey) + Provenance Drawer   │
│                                                                                        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Four-Week Technical Execution Roadmap

### Week 1: Platform Abstraction, Scaffolding & Viewport Performance
* **Objective:** Establish the Manifest V3 scaffolding, package build system, platform adapter abstraction layer, and dual-observer (`MutationObserver` + `IntersectionObserver`) pipeline capable of handling Meta's dynamic React Virtual DOM without introducing frame drops or memory leaks.
* **Core Deliverables:**
  1. `manifest.json`: Manifest V3 specification with targeted host permissions (`*://*.facebook.com/*`, `*://*.instagram.com/*`, `*://*.whatsapp.com/*`) and background service worker registration.
  2. `src/background/background.js`: Service worker routing messages between content scripts, managing off-screen canvas contexts, and handling CORS-restricted binary media fetches.
  3. `src/content/content_script.js`: Unified content script coordinating platform detection, DOM mutation monitoring, and viewport intersection queueing.
  4. `src/content/platform_adapters.js`: Modular adapter pattern implementing resilient multi-strategy CSS/ARIA selectors for Facebook, Instagram, and WhatsApp Web.
  5. `src/content/ui_injector.js`: Isolated Shadow DOM container injection utility preventing CSS bleed between host platforms and transparency badges.
* **Key Technical Challenge:** Meta platforms constantly change obfuscated CSS class names (e.g., `.x1yzt...`) and re-render DOM nodes on scroll. Selectors must prioritize stable ARIA roles (`role="article"`, `role="feed"`, `role="row"`), data attributes (`data-pagelet`, `data-id`), and structural tree traversals.
* **Required Reading:**
  - Chrome Extensions Manifest V3 Documentation: *Service Workers & Content Scripts*.
  - W3C Intersection Observer API Specification.
  - React Virtual DOM reconciliation and DOM mutation patterns.

---

### Week 2: Image Provenance Module (FR-01 & WASM Integration)
* **Objective:** Implement client-side binary media interception and compile a lightweight WebAssembly (WASM) C2PA manifest reader directly into the extension service worker / content script.
* **Core Deliverables:**
  1. `c2pa-rs` WebAssembly Build: Minimal Rust-to-WASM compilation pipeline emitting `c2pa_validator.wasm` and JS bindings stripped of write capabilities (read-only verification).
  2. `src/modules/image_provenance.js`: Image binary interceptor that retrieves raw blobs via background service worker (`fetch` with arrayBuffer response).
  3. JUMBF Scanner: Quick-scan binary header parser that checks for JPEG `APP11` markers (`FF EB`), PNG `caBX` chunks, or WebP `RIFF` chunks prior to invoking full WASM parsing.
  4. Platform Label Parser: Secondary fallback parser extracting Meta's upstream `"Made with AI"` badges from post header menus and aria-labels.
* **Key Technical Challenge:** Passing large binary images between the content script and background worker can saturate IPC channels. Must use `OffscreenCanvas`, transferable `ArrayBuffer` objects, or client-side WASM execution in a sandboxed iframe.
* **Required Reading:**
  - C2PA Specification v2.1: §6 (Manifest Store) and §8 (Hard/Soft Binding).
  - WebAssembly bindings for Rust (`wasm-bindgen`, `c2pa-rs`).
  - ISO 19566-5:2023 (JPEG Universal Metadata Box Format - JUMBF).

---

### Week 3: Text Provenance Module (FR-02 & Privacy-Preserving Routing)
* **Objective:** Construct the text extraction, tokenization, entropy estimation, and privacy-preserving API routing pipeline for statistical text watermarking verification.
* **Core Deliverables:**
  1. `src/modules/text_provenance.js`: Text node normalizer extracting post bodies, captions, and comments while filtering platform boilerplate (timestamps, "Like", "Reply").
  2. Client-Side BPE Tokenizer: Lightweight client-side token estimator (e.g., GPT/Llama byte-pair tokenizer) calculating token length \(T\).
  3. Entropy Pre-Check: Fast client-side character \(n\)-gram Shannon entropy calculator identifying low-entropy spans (code, dates) where watermarking is statistically precluded.
  4. Privacy-Preserving API Router: Background service worker client dispatching anonymous SHA-256 hashed or isolated text spans to a simulated SynthID-Text detection endpoint without transmitting cookies, URLs, or user identifiers (NFR-01).
* **Key Technical Challenge:** Distinguishing true negative text from under-powered micro-spans. Spans with \(T < 50\) tokens must be flagged as `INSUFFICIENT_LENGTH` to prevent false confidence in human origin.
* **Required Reading:**
  - Dathathri et al. (Nature 2024), *Scalable watermarking for identifying large language model outputs*.
  - Kirchenbauer et al. (ICML 2023), *A Watermark for Large Language Models*.
  - GDPR Article 5(1)(c) (Data Minimisation in Browser Extension Telemetry).

---

### Week 4: Compliance Status Engine & UI Overlay (FR-03, FR-04 & Evaluation)
* **Objective:** Implement the multi-signal regulatory logic engine that synthesizes image and text verification results into formal Article 50 compliance verdicts, rendering interactive UI badges into the social feeds.
* **Core Deliverables:**
  1. `src/modules/compliance_engine.js`: Formal deterministic rule engine evaluating compliance across Art. 50(2), Art. 50(4a/b), and Art. 50(5).
  2. `src/ui/badge_component.js`: Shadow DOM custom element with 4 discrete visual states:
     - 🟢 **Verified Provenance:** C2PA manifest valid or statistical watermark confirmed (\(z \ge 3.0\)).
     - 🟡 **Platform Disclosed:** Meta "Made with AI" label detected, but underlying cryptographic proof destroyed.
     - 🔴 **Undisclosed Synthetic Media:** AI signal detected without accompanying deployer disclosure statement.
     - ⚪ **No Provenance / Micro-Span:** Null-consistent or insufficient signal length.
  3. `src/ui/drawer_component.js`: Slide-out audit drawer displaying signing certificates, ingredient DAGs, token count, \(z\)-score, and legal compliance rationale.
  4. Integration & Benchmarking Suite: Synthetic test harness executing end-to-end evaluation against mock Facebook and Instagram feed pages.
* **Key Technical Challenge:** Ensuring the Shadow DOM styling is 100% immune to Meta's aggressive global CSS resets while maintaining responsive alignment next to dynamic post headers.
* **Required Reading:**
  - EU AI Office (2025): *Guidelines on Transparency Obligations for Providers and Deployers*.
  - W3C Shadow DOM v1 Specification (Custom Elements & Encapsulation).

---

## 3. Architecture & Directory Structure

```
month_2_engineering/
├── month_2_engineering_plan.md      # This comprehensive roadmap
├── package.json                     # Node/Vite dependency management
├── manifest.json                    # Chromium Manifest V3 configuration
├── vite.config.js                   # Build and bundling configuration
├── public/
│   ├── icons/                       # Extension action icons (16, 48, 128px)
│   │   ├── icon16.png
│   │   ├── icon48.png
│   │   └── icon128.png
│   └── wasm/                        # Pre-compiled C2PA WASM modules (Week 2)
│       ├── c2pa_validator.wasm
│       └── c2pa_validator.js
├── src/
│   ├── background/
│   │   └── background.js            # MV3 service worker & cross-origin fetcher
│   ├── content/
│   │   ├── content_script.js        # Main content script entry point
│   │   ├── platform_adapters.js     # FB, IG, WA DOM selector strategies
│   │   └── ui_injector.js           # Isolated Shadow DOM injection utility
│   ├── modules/
│   │   ├── image_provenance.js      # (Week 2) C2PA WASM & metadata scanner
│   │   ├── text_provenance.js       # (Week 3) Token counter & SynthID router
│   │   └── compliance_engine.js     # (Week 4) Statutory Art. 50 rule evaluator
│   ├── ui/
│   │   ├── badge_component.js       # (Week 4) Shadow DOM badge element
│   │   ├── drawer_component.js      # (Week 4) Provenance audit drawer
│   │   └── styles.css               # Encapsulated component styles
│   └── common/
│       ├── constants.js             # Platform IDs, message types, compliance enums
│       └── logger.js                # Structured client-side debugging utility
└── tests/
    ├── mock_pages/                  # Static HTML fixtures of FB, IG, and WA feeds
    │   ├── facebook_mock.html
    │   ├── instagram_mock.html
    │   └── whatsapp_mock.html
    └── unit/
        ├── platform_adapters.test.js
        └── ui_injector.test.js
```

---

## 4. Milestone Schedule & Verification Gates

| Week | Milestone Description | Exit Verification Gate |
|:---:|:---|:---|
| **Week 1** | Platform Abstraction & Extension Scaffold | Extension loads cleanly in `chrome://extensions`; injects Shadow DOM placeholders into live or mocked FB, IG, and WA feeds without layout shifts or console errors. |
| **Week 2** | Image Provenance Module (FR-01) | Browser extension intercepts image URLs, scans binary bytes via WASM, detects test C2PA manifests, and accurately flags stripped Meta CDN images. |
| **Week 3** | Text Provenance Module (FR-02) | Extension extracts post text, computes token counts, correctly flags spans with \(T < 50\) as `INSUFFICIENT_LENGTH`, and receives mock SynthID API responses. |
| **Week 4** | Compliance Engine & UI Overlay (FR-03 & 04) | Full end-to-end integration: visible badges render beside posts, drawer reveals multi-signal audit logs, and compliance states map strictly to EU AI Act Article 50. |

---

*Lead Software Architecture Specification · Month 2 · Pratyay Mondal · THWS M.Sc. AI · November 2026*

