# AI Transparency & Provenance Validator — Extension Prototype

**Thesis:** *AI Transparency in the Wild: Bridging Technical Provenance and Legal Compliance under the EU AI Act on Social Media Platforms*  
**Candidate:** Pratyay Mondal · M.Sc. Artificial Intelligence · THWS  
**Supervisors:** Prof. Dr. Markus Oermann (Primary), Prof. Dr. Ivan Yamshchikov (Secondary)  
**Engineering Phase:** Month 2 (Architecture, Scaffolding & Verification Engine)

---

## 1. Overview

This directory contains the production-ready browser extension prototype implementing the requirements specified in [`tool_requirements_v01.md`](../docs/month_1/tool_requirements_v01.md). 

The extension monitors live feed items across the Meta ecosystem (**Facebook Feed**, **Instagram Feed**, and **WhatsApp Web**), intercepts newly rendered virtual DOM elements via a dual-observer architecture (`MutationObserver` + `IntersectionObserver`), extracts media and text targets, and attaches an isolated **Shadow DOM container** presenting Article 50(5)-compliant provenance badges.

---

## 2. Directory Structure

```
month_2_engineering/
├── manifest.json              # Chromium Manifest V3 configuration
├── package.json               # Node dependency management & test scripts
├── vite.config.js             # Optional bundler configuration
├── month_2_engineering_plan.md# 4-week detailed technical roadmap
├── public/
│   └── icons/                 # Extension icons (16px, 48px, 128px)
├── src/
│   ├── background/
│   │   └── background.js      # MV3 Service Worker (cross-origin binary fetcher)
│   ├── content/
│   │   ├── loader.js          # Dynamic ES module bootstrap loader
│   │   ├── content_script.js  # Main dual-observer coordinator
│   │   ├── platform_adapters.js # Resilient ARIA/data-attribute DOM selectors
│   │   └── ui_injector.js     # W3C Shadow DOM v1 isolation & badge injection
│   └── common/
│       ├── constants.js       # Enumerations, message types, compliance statuses
│       └── logger.js          # Namespaced audit logger
└── tests/
    ├── mock_pages/            # Static HTML feeds for Facebook, Instagram, WhatsApp
    │   ├── facebook_mock.html
    │   ├── instagram_mock.html
    │   └── whatsapp_mock.html
    └── unit/
        └── platform_adapters.test.js # Native Node.js unit tests (11 passing)
```

---

## 3. Quick Start & Setup

### 3.1 Run Unit Tests
```bash
cd month_2_engineering
node --test tests/unit/platform_adapters.test.js
```

### 3.2 Load Unpacked in Chrome / Brave / Edge
1. Open Chromium browser and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (toggle in top right).
3. Click **Load unpacked**.
4. Select the `month_2_engineering/` folder.
5. The extension `"AI Transparency & Provenance Validator"` (v0.1.0) will appear with its service worker active.

### 3.3 Test Against Mock Feeds
Open any of the provided mock test pages in your browser:
```bash
open tests/mock_pages/facebook_mock.html
open tests/mock_pages/instagram_mock.html
open tests/mock_pages/whatsapp_mock.html
```
Open Developer Tools (`F12` / `Cmd+Option+I`) to observe the `[AI-Transparency-Validator]` logging messages as post elements intersect the viewport.

---

## 4. Architectural Highlights (Week 1 Scaffold)

1. **Dual-Observer Pattern:** Meta’s React Virtual DOM dynamically appends and recycles DOM nodes on scroll. The `MutationObserver` captures newly inserted nodes, while the `IntersectionObserver` defers inspection until the post scrolls into the visible viewport. Elements are unobserved immediately after evaluation, maintaining 60 FPS scrolling performance (fulfilling **NFR-02**).
2. **Resilient Selectors:** Instead of fragile, obfuscated class names (`.x1yzt...`), `platform_adapters.js` targets stable ARIA roles (`role="article"`, `role="feed"`, `role="row"`), data attributes (`data-pagelet`), and semantic structural trees.
3. **Shadow DOM Encapsulation:** `ui_injector.js` attaches an isolated shadow root (`mode: 'open'`) to anchor points in post headers. This prevents Meta's global CSS resets from distorting the transparency badges, and prevents badge styles from bleeding into the host feed (fulfilling **FR-04** and **Art. 50(5)**).
4. **GDPR Data Minimisation (NFR-01):** The service worker (`background.js`) fetches media buffers without sending cookies or session headers, ensuring zero user identity leakage during external provenance checks.
