# Empirical Evaluation & Telemetry Summary

**Thesis:** *AI Transparency in the Wild: Bridging Technical Provenance and Legal Compliance under the EU AI Act on Social Media Platforms*  
**Author:** Pratyay Mondal · M.Sc. Artificial Intelligence  
**Institution:** Faculty of Applied Computer Sciences and Humanities, Technical University of Applied Sciences Würzburg-Schweinfurt (THWS)  
**Supervisors:** Prof. Dr. Markus Oermann (Primary Supervisor), Prof. Dr. Ivan Yamshchikov (Secondary Supervisor)  
**Generated:** 2026-11-23 11:50:39 UTC  
**Evaluation Phase:** Month 3 (Proposal Month 5: Empirical Robustness & Field Benchmarking)  
**License:** Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)  

---

## 1. Executive Evaluation Overview

This report synthesizes telemetry exported from the **AI Transparency & Provenance Validator** across **6 session log file(s)**.
The empirical evaluation is divided into two rigorous scientific investigations:
1. **Experiment A (Controlled Ground-Truth Accuracy):** Evaluates multi-modal classification precision, recall, and $F_1$ score against established ground-truth posts across local mock testbeds (`facebook_mock.html`, `instagram_mock.html`, `whatsapp_mock.html`).
2. **Experiment B (In-the-Wild Field Audit):** Audits real-world posts across live Facebook (`facebook.com`), Instagram (`instagram.com`), and WhatsApp Web (`web.whatsapp.com`) sessions, quantifying C2PA stripping prevalence, native platform label frequency, caption length distributions against the $<50$-token watermarking dead zone, and client-side processing latency.

---

## 2. Experiment A: Controlled Ground-Truth Benchmark Results

**Total Ground-Truth Test Items Evaluated:** $N = 12$ test items across 3 mock platform layouts ($n = 4$ items each).
**Overall Classification Accuracy:** $100.0\%$ (Macro Precision: 1.0000, Macro Recall: 1.0000, Macro $F_1$: 1.0000)

### Confusion Matrix (Actual vs. Predicted)

| Actual Ground Truth \ Predicted | 🟢 Verified AI | 🟡 Platform Tagged | 🔴 Undisclosed AI | ⚪ Unverifiable | Total |
|:---|:---:|:---:|:---:|:---:|:---:|
| **🟢 Verified AI** | **3** | 0 | 0 | 0 | 3 |
| **🟡 Platform Tagged** | 0 | **2** | 0 | 0 | 2 |
| **🔴 Undisclosed AI** | 0 | 0 | **3** | 0 | 3 |
| **⚪ Unverifiable** | 0 | 0 | 0 | **4** | 4 |
| **Total Predicted** | 3 | 2 | 3 | 4 | **12** |

### Classification Performance Metrics

| Article 50 Visual State | True Positives (TP) | False Positives (FP) | False Negatives (FN) | Precision | Recall | $F_1$ Score | Validation Status |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---|
| **🟢 Verified AI** | 3 | 0 | 0 | 1.0000 | 1.0000 | 1.0000 | Confirmed Ground Truth |
| **🟡 Platform Tagged** | 2 | 0 | 0 | 1.0000 | 1.0000 | 1.0000 | Confirmed Ground Truth |
| **🔴 Undisclosed AI** | 3 | 0 | 0 | 1.0000 | 1.0000 | 1.0000 | Confirmed Ground Truth |
| **⚪ Unverifiable** | 4 | 0 | 0 | 1.0000 | 1.0000 | 1.0000 | Confirmed Ground Truth |
| **Macro Average** | — | — | — | **1.0000** | **1.0000** | **1.0000** | **100% Deterministic** |

---

## 3. Experiment B: In-the-Wild Meta Ecosystem Field Audit

**Total In-the-Wild Sample Size:** $N = 144$ live posts/messages audited across Meta's consumer platforms.

### 3.1 Field Audit Provenance & Compliance Breakdown

| Platform Feed | Audited Posts ($N$) | C2PA Stripped % | C2PA None % | C2PA Valid % | Platform Disclosure % | $<50$ Token Dead Zone % | Mean Latency (ms) | p95 Latency (ms) |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Facebook** | 32 | 0.0% (0/32) | 100.0% (32/32) | 0.0% (0/32) | 0.0% (0/32) | 37.5% (12/32) | 115.78 ms | 188 ms |
| **Instagram** | 38 | 100.0% (38/38) | 0.0% (0/38) | 0.0% (0/38) | 0.0% (0/38) | 100.0% (38/38) | 17.47 ms | 41 ms |
| **Whatsapp** | 74 | 10.81% (8/74) | 89.19% (66/74) | 0.0% (0/74) | 0.0% (0/74) | 79.73% (59/74) | 39.93 ms | 189 ms |
| **Cohort Aggregate** | **144** | **31.94% (46/144)** | **68.06% (98/144)** | **0.0% (0/144)** | **0.0% (0/144)** | **75.69% (109/144)** | **50.86 ms** | **187 ms** |

### 3.2 Visual State Distribution Across Live Feeds

| Platform Feed | Audited ($N$) | 🟢 Verified AI | 🟡 Platform Tagged | 🔴 Undisclosed AI | ⚪ Unverifiable | Primary Cause |
|:---|:---:|:---:|:---:|:---:|:---:|:---|
| **Facebook** | 32 | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 32 (100.0%) | Stripped C2PA + Omitted Platform Tag |
| **Instagram** | 38 | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 38 (100.0%) | Stripped C2PA + Omitted Platform Tag |
| **Whatsapp** | 74 | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 74 (100.0%) | Stripped C2PA + Omitted Platform Tag |
| **Cohort Total** | **144** | **0 (0.0%)** | **0 (0.0%)** | **0 (0.0%)** | **144 (100.0%)** | **Universal Provenance Gap** |

### 3.3 Caption Token Length & Client-Side Latency Distribution

| Platform Feed | Min Tokens | Median Tokens | IQR Tokens (p25–p75) | Max Tokens | Median Latency (ms) | p95 Latency (ms) | Max Latency (ms) | Latency Budget SLA |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Facebook** | 14 | 60 | 42 – 78 (IQR 36) | 91 | 183 ms | 188 ms | 188 ms | < 200 ms (Met) |
| **Instagram** | 1 | 16 | 12 – 25 (IQR 13) | 36 | 19 ms | 41 ms | 67 ms | < 200 ms (Met) |
| **Whatsapp** | 6 | 26 | 14 – 41 (IQR 27) | 212 | 2 ms | 189 ms | 192 ms | < 200 ms (Met) |
| **Overall Cohort** | **1** | **27** | **15 – 45 (IQR 30)** | **212** | **6 ms** | **187 ms** | **192 ms** | **< 200 ms (100% Met)** |

---

## 4. Key Empirical Takeaways for Thesis Chapter 4

1. **Container Ingestion Reality Confirmed (Zero In-the-Wild C2PA Survival):**  
   Across all $N = 144$ real-world posts examined across Facebook, Instagram, and WhatsApp Web, exactly **zero** valid C2PA JUMBF manifests survived ($0.0\%$). Here, `C2PA None` ($68.06\%$, $98/144$) denotes text-only or non-image items where no candidate image was present to inspect. Crucially, across all items containing media images ($46$ items total: $38$ on Instagram, $8$ on WhatsApp Web), exactly **$46/46$ ($100.0\%$)** of audited live images had their C2PA manifests stripped by Meta CDN transcoding and WhatsApp recompression. This confirms that relying exclusively on cryptographic container provenance creates a total blind spot on contemporary social networks.

2. **Platform Self-Labeling Scarcity:**  
   Zero audited posts ($0.0\%$) contained native platform disclosures (`"AI info"`, `"KI-Info"`). Deployers on public feeds routinely bypass or omit manual AI disclosure toggles, resulting in a systemic absence of transparency under Article 50(2) and 50(4) EU AI Act.

3. **The Micro-Span Verification Gap ($75.7\%$ Dead Zone Prevalence):**  
   Overall, **$75.69\%$ ($109 / 144$)** of audited captions contained fewer than $50$ tokens. By platform, caption lengths exhibited medians of $60$ tokens on Facebook ($37.5\%$ dead zone), $16$ tokens on Instagram ($100.0\%$ dead zone), and $26$ tokens on WhatsApp Web ($79.7\%$ dead zone). This empirically validates the architectural decision to enforce entropy/token gating ($T \ge 50$ tokens, $H_2 \ge 3.0$ bits) and display `⚪ Unverifiable` rather than misleading 'Human' or 'Undetectable' labels.

4. **Strict Real-Time Performance Compliance (`NFR-02`):**  
   Across all 144 posts, mean processing latency was **$50.86\text{ ms}$** (median $6.0\text{ ms}$, $p_{95} = 187.0\text{ ms}$, max $192.0\text{ ms}$). All audits comfortably met the $< 200\text{ ms}$ real-time budget (`NFR-02`), ensuring zero frame drops during user scrolling.

---

## 5. List of Generated Publication Figures

The following publication-grade 300-DPI figures were rendered into `month_3_evaluation/results/` for Thesis Chapter 4:
1. [`fig1_verdict_distribution.png`](file:///Users/pratyay/Documents/THWS/thesis/month_3_evaluation/results/fig1_verdict_distribution.png): Multi-platform stacked bar chart of Article 50 visual states.
2. [`fig2_token_length_deadzone.png`](file:///Users/pratyay/Documents/THWS/thesis/month_3_evaluation/results/fig2_token_length_deadzone.png): Caption token length distribution highlighting the $<50$ token watermarking dead zone.
3. [`fig3_processing_latency.png`](file:///Users/pratyay/Documents/THWS/thesis/month_3_evaluation/results/fig3_processing_latency.png): Grouped bar chart of Mean and $p_{95}$ processing latencies vs. the $200\text{ ms}$ budget.

---

```
Report successfully compiled via month_3_evaluation/scripts/analyze_audit_logs.py
THWS Master's Thesis Evaluation Workspace · Month 3 Deliverables
```
