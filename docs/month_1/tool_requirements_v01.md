# AI Transparency & Provenance Validator — Functional Requirements Specification v0.1

**Thesis:** *AI Transparency in the Wild: Bridging Technical Provenance and Legal Compliance under the EU AI Act on Social Media Platforms*

**Author:** Pratyay Mondal
**Phase:** Month 1 / Week 4 — Pre-Architecture
**Date:** November 2026

> [!NOTE]
> This specification is grounded in the empirical findings from the Week 2 C2PA survival audit and the Week 3 SynthID-Text watermark robustness experiments, as well as the legal-technical cross-walk analysis mapping EU AI Act Article 50 obligations to technical provenance mechanisms.

---

## 1. System Overview

The AI Transparency & Provenance Validator is a browser extension targeting Chromium-based browsers (Chrome 120+, Edge 120+) that operates on pages within the Meta ecosystem — specifically `facebook.com`, `instagram.com`, and `web.whatsapp.com`. The system functions as a client-side detection and compliance-assessment tool that monitors DOM-rendered content for signals of AI-generated provenance, including C2PA manifests, invisible watermarks (e.g., SynthID-Image, SynthID-Text), and platform-native disclosure labels.

The extension's primary purpose is to bridge the gap between the transparency mandates codified in Article 50 of the EU AI Act and the technical reality that provenance signals are either destroyed or rendered invisible on social media platforms. As established in the Week 2 empirical audit, C2PA manifests exhibit a 0/8 survival rate across Meta's content delivery infrastructure due to server-side re-encoding. Meanwhile, the Week 3 experiments demonstrate that statistical text watermarks (SynthID-Text) survive verbatim copy-paste (\(z = 13.59\)) but remain entirely invisible to end users in the absence of dedicated detection tooling. Neither mechanism, in its current deployed state, satisfies Art. 50(5)'s requirement that AI-generated content be disclosed in a manner that is "clear, distinguishable, and accessible at first exposure."

The extension addresses this compliance gap by performing client-side detection of available AI-generated content markers and surfacing their compliance status via visible UI overlays injected into the host page's DOM. By combining multi-signal detection (C2PA extraction, watermark API queries, and platform-label parsing) with a compliance-status engine that maps detection outputs to specific Art. 50 sub-obligations, the system provides a unified view of whether — and to what extent — a given content item satisfies the EU AI Act's transparency requirements. This positions the extension as both a research prototype for the thesis evaluation and a proof-of-concept for how third-party tooling can compensate for platform-level compliance shortfalls.

---

## 2. Functional Requirements

### FR-01: Image Provenance Detection

| Field | Value |
|:------|:------|
| **ID** | FR-01 |
| **Priority** | MUST |
| **Description** | The system shall detect AI provenance signals in images rendered in the DOM on supported Meta platform pages. |

**Technical Grounding.** The Week 2 C2PA survival audit established that C2PA JUMBF manifests are stripped by Meta's server-side re-encoding pipeline, with 0 out of 8 test images retaining valid manifests after upload to Facebook, Instagram, and WhatsApp. Consequently, the system cannot rely on C2PA extraction from CDN-served images as a primary detection strategy and must implement a multi-signal fallback architecture.

**Sub-requirements:**

- **FR-01.1:** The system shall attempt C2PA manifest extraction from image binaries fetched via the DOM (for edge cases where metadata may survive, e.g., direct image links or platform policy changes).
- **FR-01.2:** When C2PA extraction fails (expected on FB/IG/WA), the system shall fall back to invisible watermark detection APIs (e.g., Google SynthID-Image detection endpoint, if available).
- **FR-01.3:** The system shall detect Meta's platform-level "Made with AI" label via DOM parsing of platform-specific CSS/HTML selectors as a tertiary signal.
- **FR-01.4:** The system shall report one of the following detection statuses: `VERIFIED_C2PA`, `WATERMARK_DETECTED`, `PLATFORM_LABEL_DETECTED`, `NO_SIGNAL`, `ERROR`.

**Acceptance Criteria.** Given a CDN-served image on `facebook.com` that was originally AI-generated, the system detects at least one signal (platform label or watermark) within 2 seconds of image render.

---

### FR-02: Text Watermark Detection

| Field | Value |
|:------|:------|
| **ID** | FR-02 |
| **Priority** | MUST |
| **Description** | The system shall detect statistical text watermarks (SynthID-Text / Kirchenbauer green-list) in text content rendered on supported Meta platform pages. |

**Technical Grounding.** The Week 3 SynthID-Text robustness experiments demonstrated that statistical text watermarks survive verbatim copy-paste with high confidence (\(z = 13.59\)), but require two preconditions for reliable detection: (a) access to the provider's secret key or a detection API, and (b) a sufficient token count. Empirical results indicate that reliable detection (\(z > 3.0\)) requires approximately \(T \geq 200\) tokens, with detection power degrading substantially below this threshold.

**Sub-requirements:**

- **FR-02.1:** The system shall extract text content from posts, captions, and comments via DOM text node traversal.
- **FR-02.2:** The system shall submit extracted text to provider detection APIs (e.g., Anthropic/Google watermark detection endpoints) for \(z\)-score / \(g\)-score evaluation.
- **FR-02.3:** The system shall estimate token count before API submission and report `INSUFFICIENT_SIGNAL` for spans below the minimum threshold (configurable, default \(T_{\min} = 50\) tokens).
- **FR-02.4:** The system shall report one of the following detection statuses:
  - `WATERMARK_DETECTED` — \(z > \text{threshold}\)
  - `WATERMARK_NOT_DETECTED` — \(z \leq \text{threshold}\), \(T \geq T_{\min}\)
  - `INSUFFICIENT_SIGNAL` — \(T < T_{\min}\)
  - `API_UNAVAILABLE`
  - `ERROR`
- **FR-02.5:** The system shall handle multi-provider detection (attempt detection against multiple provider APIs if keys are configured).

**Acceptance Criteria.** Given a 250-token watermarked text post on `facebook.com`, the system returns `WATERMARK_DETECTED` with \(z\)-score within 3 seconds.

---

### FR-03: Compliance Status Engine

| Field | Value |
|:------|:------|
| **ID** | FR-03 |
| **Priority** | MUST |
| **Description** | The system shall map detection outputs from FR-01 and FR-02 to EU AI Act Article 50 obligation compliance statuses. |

**Technical Grounding.** The legal-technical cross-walk analysis identifies that Art. 50(2) provider marking, Art. 50(4) deployer disclosure, and Art. 50(5) first-exposure visibility are distinct obligations with different technical satisfaction conditions. No single provenance mechanism currently satisfies all three obligations simultaneously on Meta platforms.

**Sub-requirements:**

- **FR-03.1:** For each detected content item, the system shall evaluate and report compliance status for:
  - Art. 50(2) — Provider Marking
  - Art. 50(4) — Deployer Disclosure
  - Art. 50(5) — User Visibility
- **FR-03.2:** Compliance status values shall be:
  - `COMPLIANT` — all relevant conditions for the obligation are met.
  - `PARTIAL` — some signals present but not all conditions for the obligation are satisfied.
  - `NON_COMPLIANT` — AI-generated content detected but required disclosures are absent.
  - `UNKNOWN` — insufficient data to determine compliance.
- **FR-03.3:** The compliance engine shall consider the editorial-control exemption (Art. 50(4b)) and flag cases where watermark degradation correlates with potential editorial modification.
- **FR-03.4:** The engine shall log compliance assessments with timestamps, content hashes, and signal sources for audit trail purposes.

**Acceptance Criteria.** Given FR-01 returning `PLATFORM_LABEL_DETECTED` and FR-02 returning `WATERMARK_DETECTED`, the system reports:
- Art. 50(2) as `COMPLIANT` (provider marking signal present via watermark),
- Art. 50(4) as `PARTIAL` (no explicit deployer disclosure mechanism detected),
- Art. 50(5) as `COMPLIANT` (extension overlay provides first-exposure visibility to the user).

---

### FR-04: User Interface Overlay

| Field | Value |
|:------|:------|
| **ID** | FR-04 |
| **Priority** | MUST |
| **Description** | The system shall render visual indicators on supported Meta platform pages to disclose AI provenance status to end users, satisfying Art. 50(5)'s "clear, distinguishable, at first exposure" requirement. |

**Sub-requirements:**

- **FR-04.1:** The system shall render a badge/icon overlay on or adjacent to content items where AI provenance signals are detected.
- **FR-04.2:** Badge states shall visually distinguish the following categories:
  - **Confirmed AI-generated** (red/orange) — high-confidence detection.
  - **Possible AI-generated** (yellow/amber) — partial or low-confidence signal.
  - **No signal detected** (grey/none) — no provenance markers found.
  - **Insufficient data** (blue/info) — detection could not be completed.
- **FR-04.3:** Clicking or hovering on the badge shall display a detail panel showing: signal type(s) detected, \(z\)-score (for text), compliance status per Art. 50 sub-obligation, and confidence level.
- **FR-04.4:** The overlay shall not break the host page layout or interfere with platform-native UI elements. Shadow DOM isolation shall be used to encapsulate overlay styles and prevent CSS conflicts.
- **FR-04.5:** The overlay shall render within 500ms of content entering the viewport (lazy evaluation tied to `IntersectionObserver`).

**Acceptance Criteria.** AI-generated content on `facebook.com` displays a visible badge within 500ms of scroll-into-view, and clicking the badge shows a detail panel with a compliance breakdown across Art. 50 sub-obligations.

---

## 3. Non-Functional Requirements

### NFR-01: Privacy

- The system shall perform all DOM parsing and text extraction client-side within the browser extension context.
- API calls to provider detection endpoints shall transmit only the extracted text span; no user identity, page URL, or browsing context shall be included in API requests.
- No user data shall be persisted beyond the browser session unless explicitly configured by the user.
- **Grounding:** GDPR data minimisation (Art. 5(1)(c)) and purpose limitation (Art. 5(1)(b)). Since text spans must be transmitted to external detection APIs, the system must minimise the data envelope to the bare content required for watermark evaluation.

### NFR-02: Performance

- Image provenance checks shall complete within 2 seconds per image.
- Text watermark checks shall complete within 3 seconds per text span.
- The extension shall not increase page load time by more than 200ms (lazy initialization; no blocking scripts in the critical path).
- DOM observation shall use `MutationObserver` with throttled callbacks (\(\leq 1\) evaluation per 500ms per content item) to prevent excessive CPU consumption on dynamic feed pages.

### NFR-03: Security

- Provider API keys shall be stored in the browser's encrypted storage (`chrome.storage.local` with encryption-at-rest where supported by the platform).
- The extension shall use Content Security Policy (CSP) compliant injection — no inline scripts (`unsafe-inline` shall not be required).
- All API communications shall use HTTPS with certificate pinning where supported by the browser's extension API surface.

### NFR-04: Compatibility

- **Target browsers:** Chrome 120+, Edge 120+ (Chromium-based, Manifest V3).
- **Target platforms:** `facebook.com`, `instagram.com`, `web.whatsapp.com`.
- The system shall gracefully degrade if a platform's DOM structure changes. Selector-based detection (FR-01.3) shall use configurable CSS/HTML selectors that can be updated without a full extension release (remote selector configuration or user-editable mappings).

### NFR-05: Auditability

- All detection events shall be logged locally with the following fields: timestamp (ISO 8601), content hash (SHA-256 of the first 500 characters), signal type, detection result, and compliance assessment.
- Logs shall be exportable as JSON for thesis evaluation and reproducibility purposes.

---

## 4. Requirements Traceability Matrix

| Requirement | Grounded In | Art. 50 Obligation | Week 2/3 Finding |
|:------------|:------------|:-------------------|:-----------------|
| FR-01 | Week 2: 0/8 C2PA survival | Art. 50(2), Art. 50(4a) | C2PA JUMBF manifests stripped by Meta CDN re-encoding |
| FR-02 | Week 3: \(z = 13.59\) verbatim, \(z < 3\) on translation | Art. 50(2), Art. 50(4b) | Watermark survives copy-paste, fails machine translation |
| FR-03 | Legal-technical cross-walk matrix | Art. 50(2), Art. 50(4), Art. 50(5) | No single mechanism satisfies all obligations |
| FR-04 | Art. 50(5) visibility gap | Art. 50(5) | Both C2PA and SynthID-Text are invisible to end users |
| NFR-01 | GDPR Art. 5(1)(c) | Privacy | Text spans must be transmitted to external detection APIs |
| NFR-02 | Social media UX constraints | Usability | Real-time detection required on dynamic feed pages |

---

## 5. Open Questions for Month 2 Architecture

- **API Availability:** Will Google and/or Anthropic provide public watermark detection API endpoints for SynthID-Text and SynthID-Image? If not, what fallback detection strategy is viable (e.g., local statistical models, open-source green-list detectors)?
- **Browser Support:** Should the extension support Firefox (non-Chromium)? This carries significant implications for Manifest V3 vs. V2 compatibility and the `chrome.*` vs. `browser.*` API surface.
- **Mixed Content:** How should the system handle partially AI-generated text (e.g., human-edited LLM output)? The editorial-control exemption under Art. 50(4b) introduces ambiguity in compliance assessment for such content.
- **Configurable Obligation Profiles:** Should the compliance engine support configurable Art. 50 obligation profiles with different detection thresholds (e.g., stricter thresholds for public-interest content vs. entertainment)?
- **React Virtual DOM:** How should the extension handle Instagram's React-based virtual DOM and dynamic content loading patterns, where traditional `MutationObserver`-based detection may miss content rendered outside the standard DOM lifecycle?

---

> [!IMPORTANT]
> This is v0.1 of the Functional Requirements Specification. It will be refined during the Month 2 architecture design phase based on supervisor feedback, API availability assessments, and any revisions to the EU AI Act implementing guidance published in the interim.
