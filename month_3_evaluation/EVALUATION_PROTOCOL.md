# Empirical Evaluation Protocol: Controlled Ground-Truth & In-the-Wild Audit

**Thesis:** *AI Transparency in the Wild: Bridging Technical Provenance and Legal Compliance under the EU AI Act on Social Media Platforms*  
**Author:** Pratyay Mondal · M.Sc. Artificial Intelligence  
**Institution:** Technical University of Applied Sciences Würzburg-Schweinfurt (THWS)  
**Supervisors:** Prof. Dr. Markus Oermann (Primary), Prof. Dr. Ivan Yamshchikov (Secondary)  
**Evaluation Phase:** Month 3 of Execution (Proposal Month 5: Empirical Robustness Testing & Benchmarking)  
**License:** Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)  

---

## 1. Executive Protocol Overview

This empirical protocol formalizes the evaluation methodology for **Thesis Chapter 4 ("Empirical Evaluation & Results")**. It establishes two rigorous, reproducible experimental tracks designed to evaluate the client-side **AI Transparency & Provenance Validator** browser extension:

1. **Experiment A (Controlled Ground-Truth Benchmark):**  
   Evaluates multi-modal classification accuracy (Precision, Recall, F1 score, and Confusion Matrix) across synthetic, deterministic HTML mock testbeds simulating Facebook, Instagram, and WhatsApp Web with known provenance labels.
2. **Experiment B (In-the-Wild Field Audit):**  
   Measures the real-world prevalence of C2PA manifest stripping, native platform disclosure tags (`"AI info"`, `"KI-Info"`), the $<50$-token statistical dead zone, and client-side processing latency ($\text{ms/post}$) across $N = 90$ live public social media posts.

---

## 2. Telemetry Schema & Privacy Architecture (GDPR Art. 5(1)(c))

To guarantee absolute compliance with the GDPR principle of **Data Minimisation** (Regulation (EU) 2016/679 Art. 5(1)(c)), the extension records strictly structural and statistical telemetry during browsing sessions. No personal identifiable information (PII), usernames, post text strings, profile images, or target URLs are logged.

Each session record in `window.__AI_VALIDATOR_AUDIT_LOG__` adheres to the following schema:

```json
{
  "timestamp": "2026-11-22T14:30:00.000Z",
  "platform": "facebook",
  "isMock": true,
  "postIndex": 1,
  "c2paStatus": "VALID",
  "platformLabel": true,
  "tokenCount": 68,
  "entropyH2": 7.142,
  "entropyGated": false,
  "zScore": 4.150,
  "badgeVerdict": "VERIFIED",
  "art50_2": "COMPLIANT",
  "art50_4": "COMPLIANT",
  "art50_5": "COMPLIANT",
  "processingTimeMs": 42
}
```

### Telemetry Field Dictionary
- `timestamp` (ISO 8601 string): Local client audit execution time.
- `platform` (`"facebook"` | `"instagram"` | `"whatsapp"`): Host platform context.
- `isMock` (boolean): `true` for local mock evaluation pages; `false` for live platform feeds.
- `postIndex` (integer): Sequential index of audited post in active session.
- `c2paStatus` (`"VALID"` | `"STRIPPED"` | `"INVALID"` | `"NONE"`): Binary JUMBF/WASM result.
- `platformLabel` (boolean): `true` if `"AI info"`, `"KI-Info"`, or `"Made with AI"` was detected.
- `tokenCount` (integer): Estimated BPE token count of caption.
- `entropyH2` (float | null): Character 2-gram Shannon conditional entropy (bits).
- `entropyGated` (boolean): `true` if text was gated due to $T < 50$ or $H_2 < 3.0$ bits.
- `zScore` (float | null): One-proportion statistical watermark score from SynthID evaluation.
- `badgeVerdict` (`"VERIFIED"` | `"PLATFORM_TAGGED"` | `"UNDISCLOSED_AI"` | `"NO_SIGNAL"`): Visual pill state.
- `art50_2`, `art50_4`, `art50_5` (`"COMPLIANT"` | `"NON_COMPLIANT"` | `"UNKNOWN"`): Statutory verdicts.
- `processingTimeMs` (integer): End-to-end client-side audit duration in milliseconds.

---

## 3. Experiment A: Controlled Ground-Truth Benchmark

### 3.1 Objective
Quantify classification accuracy, precision, recall, and specificity of the multi-signal compliance engine against known ground-truth inputs across all three target platform layouts.

### 3.2 Testbed Specification (11 Ground-Truth Posts)
The benchmark evaluates 11 canonical ground-truth items across `month_2_engineering/tests/mock_pages/`:

| Testbed File | Item ID | Simulated Modality | Ground-Truth State | Injected Signals | Expected Badge State | Expected Art. 50 Verdict |
|:---|:---|:---|:---|:---|:---|:---|
| `facebook_mock.html` | Post #1 | Image + Text | **Verified AI** | C2PA Valid Header + Watermark ($z=4.2$) + `"AI info"` | `VERIFIED` | 50(2) ✅, 50(4) ✅, 50(5) ✅ |
| `facebook_mock.html` | Post #2 | Image Only | **Platform Tagged** | C2PA Stripped + Native `"AI info"` label | `PLATFORM_TAGGED` | 50(2) ❌, 50(4) ✅, 50(5) ✅ |
| `facebook_mock.html` | Post #3 | Text Only | **Undisclosed AI** | SynthID Watermark ($z=4.4$) + No platform label | `UNDISCLOSED_AI` | 50(2) ✅, 50(4) ❌, 50(5) ✅ |
| `facebook_mock.html` | Post #4 | Text Only | **Unverifiable** | Human micro-span ($T=12$) + No platform label | `NO_SIGNAL` | 50(2) ⚪, 50(4) ⚪, 50(5) ✅ |
| `instagram_mock.html` | Post #1 | Image + Caption | **Verified AI** | Watermark ($z=4.1$) + Native `"AI info"` tag | `VERIFIED` | 50(2) ✅, 50(4) ✅, 50(5) ✅ |
| `instagram_mock.html` | Post #2 | Image + Caption | **Platform Tagged** | C2PA Stripped + Native `"AI info"` tag | `PLATFORM_TAGGED` | 50(2) ❌, 50(4) ✅, 50(5) ✅ |
| `instagram_mock.html` | Post #3 | Image + Caption | **Undisclosed AI** | SynthID Watermark ($z=4.3$) + No platform label | `UNDISCLOSED_AI` | 50(2) ✅, 50(4) ❌, 50(5) ✅ |
| `instagram_mock.html` | Post #4 | Image + Caption | **Unverifiable** | Human micro-span ($T=14$) + No platform label | `NO_SIGNAL` | 50(2) ⚪, 50(4) ⚪, 50(5) ✅ |
| `whatsapp_mock.html` | Msg #1 | Text (Forwarded)| **Verified AI** | Watermark ($z=4.2$) + User disclosure | `VERIFIED` | 50(2) ✅, 50(4) ✅, 50(5) ✅ |
| `whatsapp_mock.html` | Msg #2 | Text (Forwarded)| **Undisclosed AI** | Watermark ($z=4.4$) + No disclosure | `UNDISCLOSED_AI` | 50(2) ✅, 50(4) ❌, 50(5) ✅ |
| `whatsapp_mock.html` | Msg #3 | Text (Chat) | **Unverifiable** | Short micro-span ($T=8$) + No disclosure | `NO_SIGNAL` | 50(2) ⚪, 50(4) ⚪, 50(5) ✅ |

### 3.3 Benchmark Execution Steps
1. Start local mock HTTP server:
   ```bash
   python3 -m http.server 8080 --directory month_2_engineering/tests/mock_pages/
   ```
2. In Chromium with the validator extension loaded:
   - Navigate to `http://localhost:8080/facebook_mock.html` $\to$ scroll through all 4 posts $\to$ click any badge $\to$ click **"📥 Export Session JSON"** $\to$ save to `month_3_evaluation/raw_logs/audit_log_facebook_mock.json`.
   - Navigate to `http://localhost:8080/instagram_mock.html` $\to$ scroll through all 4 posts $\to$ click any badge $\to$ click **"📥 Export Session JSON"** $\to$ save to `month_3_evaluation/raw_logs/audit_log_instagram_mock.json`.
   - Navigate to `http://localhost:8080/whatsapp_mock.html` $\to$ scroll through all 3 messages $\to$ click any badge $\to$ click **"📥 Export Session JSON"** $\to$ save to `month_3_evaluation/raw_logs/audit_log_whatsapp_mock.json`.
3. Target Performance Criteria:
   $$\text{Precision} = 1.00, \quad \text{Recall} = 1.00, \quad F_1 = 1.00$$

---

## 4. Experiment B: In-the-Wild Meta Ecosystem Field Audit

### 4.1 Objective
Measure real-world transparency dynamics in consumer feeds under natural platform transport:
1. **C2PA Stripping Prevalence:** Quantify percentage of image posts retaining valid JUMBF metadata.
2. **Platform Disclosure Tag Frequency:** Measure occurrence of native `"AI info"` / `"KI-Info"` tags.
3. **Micro-Span Dead Zone Prevalence:** Quantify the percentage of post captions falling below the $T < 50$ token statistical watermarking threshold.
4. **Processing Latency Profile:** Measure mean and 95th-percentile client-side processing time (ms/post).

### 4.2 Sampling Strategy ($N = 90$ Total Posts)
- **Sample Allocation:**
  - $n = 30$ posts from Facebook desktop feed (`facebook.com`).
  - $n = 30$ posts from Instagram desktop feed (`instagram.com`).
  - $n = 30$ messages from active group/public chats on WhatsApp Web (`web.whatsapp.com`).
- **Inclusion Criteria:** Consecutive feed/chat items loaded during a continuous 5-minute scrolling session.
- **Auditing Protocol:**
  1. Open live platform in Chrome with extension active.
  2. Scroll steadily to allow `IntersectionObserver` to trigger audits on visible posts.
  3. After reaching 30 inspected items, click on any `<ai-transparency-badge>` to open the `<ai-audit-drawer>`.
  4. Click **"📥 Export Session JSON"** in the drawer footer.
  5. Move the downloaded JSON file into `month_3_evaluation/raw_logs/` (e.g., `audit_log_facebook_live_20261122.json`).

---

## 5. Automated Data Analysis & Report Generation

The analysis script [`month_3_evaluation/scripts/analyze_audit_logs.py`](file:///Users/pratyay/Documents/THWS/thesis/month_3_evaluation/scripts/analyze_audit_logs.py) processes all raw JSON logs:

```bash
# Run analysis pipeline
python3 month_3_evaluation/scripts/analyze_audit_logs.py

# Optional CLI flags:
#   --logs-dir DIR     Custom directory containing exported JSON logs
#   --output-dir DIR   Target directory for generated Markdown reports & charts
```

### Outputs Generated:
- `month_3_evaluation/results/EMPIRICAL_SUMMARY.md`: Formal academic Markdown report containing:
  - Confusion Matrix & Performance Metrics for Experiment A.
  - Distribution breakdown, C2PA stripping rate, and latency quantiles for Experiment B.
- `month_3_evaluation/results/verdict_distribution.png` (if `matplotlib` is installed).
- `month_3_evaluation/results/latency_by_platform.png` (if `matplotlib` is installed).
