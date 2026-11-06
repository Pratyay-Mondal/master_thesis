# Perturbation Analysis: SynthID-Text Resilience and Social Media Degradation

**Thesis:** *AI Transparency in the Wild: Bridging Technical Provenance and Legal Compliance under the EU AI Act on Social Media Platforms*  
**Author:** Pratyay Mondal · M.Sc. Artificial Intelligence · THWS  
**Phase:** Month 1 Deliverable #6 (Empirical Robustness Analysis)  
**Execution Date:** 31 October 2026  
**Harness Script:** [`docs/month_1/scripts/text_robustness_test.py`](file:///Users/pratyay/Documents/THWS/thesis/docs/month_1/scripts/text_robustness_test.py)  
**Raw JSON Report:** [`docs/month_1/test_results/text_watermark_robustness.json`](file:///Users/pratyay/Documents/THWS/thesis/docs/month_1/test_results/text_watermark_robustness.json)

---

## 1. Experimental Setup & Parameterization

The perturbation benchmark evaluates the survivability of **statistical text watermarking** (Kirchenbauer green-list / DeepMind SynthID-Text analogue) across 13 distinct lexical, typographical, structural, and platform-specific transformations simulating the **Meta ecosystem** (Facebook posts, Instagram captions, WhatsApp forwards, and multi-lingual feeds).

### 1.1 Algorithmic Parameters
- **Secret Key:** `THWS_Thesis_Secret_Key_2026` (HMAC-SHA256 PRF)
- **Partition Ratio ($\gamma$):** $0.50$ (50% green vocabulary, 50% red vocabulary)
- **Logit Bias ($\delta$):** $2.50$ (soft watermarking regime)
- **Context Window ($h$):** $1$ token sliding context ($r_t = \text{PRF}_k(x_{t-1})$)
- **Null Distribution:** $H_0 \sim \text{Binomial}(T, 0.50)$
- **Statutory Detection Criterion:** Reject $H_0 \iff z > 3.00$ ($p < 1.35 \times 10^{-3}$)

---

## 2. Empirical Robustness Benchmark Table

The table below compiles the empirical results emitted by the test suite across all 13 experimental conditions:

| Condition Name | Lexical / Platform Transformation | Scored Tokens ($T$) | Green Tokens ($|s|_G$) | Green Ratio ($\hat{\gamma}$) | $z$-Statistic | One-Sided $p$-Value | Detection Verdict ($z > 3.0$) | Meta Platform Mapping |
|:---|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---|
| **`human_control`** | Unwatermarked human text (Negative Control) | 165 | 78 | 0.4727 | **-0.70** | $7.58 \times 10^{-1}$ | ❌ **Null-Consistent** | Genuine human status update or post |
| **`watermarked_source`**| Unmodified watermarked generation (Positive Control) | 262 | 241 | 0.9198 | **+13.59** | $2.24 \times 10^{-42}$ | ✅ **Detected (Pass)** | Direct output from Claude/Gemini API |
| **`verbatim`** | Verbatim copy-paste into social media feed | 262 | 241 | 0.9198 | **+13.59** | $2.24 \times 10^{-42}$ | ✅ **Detected (Pass)** | Unedited Facebook post / WhatsApp forward |
| **`char_substitution`** | Keyboard-neighbor typos ($\sim 6\%$ of letters) | 262 | 194 | 0.7405 | **+7.78** | $3.50 \times 10^{-15}$ | ✅ **Detected (Pass)** | Mobile virtual keyboard typos / auto-correct |
| **`word_substitution`** | Lexical synonym swaps ($\sim 12\%$ content words) | 262 | 225 | 0.8588 | **+11.61** | $1.74 \times 10^{-31}$ | ✅ **Detected (Pass)** | User "makes it sound like me" before posting |
| **`caption_truncation`** | Mobile feed preview clip: first 50 words | 55 | 51 | 0.9273 | **+6.34** | $1.17 \times 10^{-10}$ | ✅ **Detected (Pass)** | Instagram "See more..." truncated feed view |
| **`severe_truncation`** | Micro-span / status update: first 12 words | 11 | 11 | 1.0000 | **+3.32** | $4.56 \times 10^{-4}$ | ⚠️ **Borderline Pass** | Instagram short image caption / hashtag line |
| **`paraphrase`** | Syntax restructuring + $\sim 40\%$ word rewrite | 255 | 181 | 0.7098 | **+6.70** | $1.04 \times 10^{-11}$ | ✅ **Detected (Pass)** | Light editorial polish by creator/journalist |
| **`translation_de`** | EN $\to$ DE proxy for Meta platform auto-translate | 262 | 121 | 0.4618 | **-1.24** | $8.92 \times 10^{-1}$ | ❌ **Erased (Fail)** | Meta "See Translation" feature to German |
| **`translation_es`** | EN $\to$ ES proxy for Meta platform auto-translate | 264 | 155 | 0.5871 | **+2.83** | $2.32 \times 10^{-3}$ | ❌ **Miss (Borderline)**| Meta "See Translation" feature to Spanish |
| **`emoji_hashtag_noise`**| Emojis & hashtags appended around intact text | 277 | 247 | 0.8917 | **+13.04** | $3.71 \times 10^{-39}$ | ✅ **Detected (Pass)** | Social media caption stuffing (#blessed, 🚀) |
| **`other_lm_rewrite`** | Resampled under different key / unwatermarked LM | 262 | 139 | 0.5305 | **+0.99** | $1.61 \times 10^{-1}$ | ❌ **Erased (Fail)** | "Rewrite with Meta AI" / ChatGPT paraphrase |
| **`full_shuffle`** | Adversarial bag-of-words random permutation | 262 | 144 | 0.5496 | **+1.61** | $5.41 \times 10^{-2}$ | ❌ **Erased (Fail)** | Adversarial bypass attack destroying context |

```
Empirical Detection Profile Across Perturbations (Threshold z = 3.00):
Verbatim Copy-Paste     : z = +13.59 [████████████████████] PASS (Detected)
Emoji & Hashtag Noise   : z = +13.04 [███████████████████░] PASS (Detected)
Word Synonym Swap       : z = +11.61 [█████████████████░░░] PASS (Detected)
Character Typos         : z =  +7.78 [███████████░░░░░░░░░] PASS (Detected)
Moderate Paraphrase     : z =  +6.70 [██████████░░░░░░░░░░] PASS (Detected)
Caption Truncation (50w): z =  +6.34 [█████████░░░░░░░░░░░] PASS (Detected)
Severe Truncation (12w) : z =  +3.32 [█████░░░░░░░░░░░░░░░] BORDERLINE PASS (100% Green Required!)
Spanish Translation     : z =  +2.83 [████░░░░░░░░░░░░░░░░] FAIL (Miss: Below Statutory Threshold)
Full Word Shuffle       : z =  +1.61 [██░░░░░░░░░░░░░░░░░░] FAIL (Null-Consistent)
Other-LM Rewrite        : z =  +0.99 [█░░░░░░░░░░░░░░░░░░░] FAIL (Null-Consistent)
German Auto-Translation : z =  -1.24 [░░░░░░░░░░░░░░░░░░░░] FAIL (Completely Erased)
Human Control (Null)    : z =  -0.70 [░░░░░░░░░░░░░░░░░░░░] NULL (Properly Unflagged)
```

---

## 3. Detailed Failure Mode Analysis

The empirical results reveal three distinct mathematical mechanisms that govern watermark survival or destruction in social media workflows:

### 3.1 Mechanism 1: Transport Immunity (Verbatim, Emojis, and Forwarding)
Unlike C2PA image metadata—which is completely destroyed by Meta's CDN re-encoding—text watermarks exhibit **complete immunity to transport re-encoding**:
- Verbatim copy-pasting maintains the full signal ($z = 13.59, p = 2.24 \times 10^{-42}$).
- Appending emojis, hashtags, and social links (`emoji_hashtag_noise`) dilutes the overall token count ($T = 262 \to 277$) but barely impacts the test statistic ($z = 13.04$), because the intact text core retains its relative green density.
- WhatsApp message forwarding transmits UTF-8 character bytes losslessly across end-to-end encrypted tunnels, preserving the watermark perfectly.

### 3.2 Mechanism 2: Graceful Degradation vs. Context Hash Cascading
When users perform light lexical editing or typos occur:
1. **Direct Substitution Damage:** Modifying token $x_t$ flips its green/red status ($\approx 50\%$ chance of being red).
2. **Cascading Seed Corruption:** Because token $x_t$ forms the context hash for subsequent token seeds:
   $$r_{t+1} = \text{PRF}_k(x_t, \ldots, x_{t-h+1})$$
   Altering a single token scrambles the subsequent $h$ pseudo-random seeds, resetting those positions to chance ($\mathbb{E}[\text{green}] = 0.5$).
- **Empirical Observation:** With $h=1$, damage is strictly localized. Replacing $\sim 12\%$ of content words (`word_substitution`) degrades $z$ from $13.59$ to $11.61$—still comfortably above statutory significance. In production systems using larger contexts (e.g., SynthID-Text with $h=4$ or $h=5$), a single word edit randomizes 5 subsequent seeds, increasing vulnerability to editorial revisions.

### 3.3 Mechanism 3: Catastrophic Destruction via Resampling and Translation
When text undergoes translation or cross-model rewriting, the watermark is completely annihilated:
1. **Platform Auto-Translation (Meta "See Translation"):** When an English watermarked post is auto-translated to German by Meta's translation service, the German text is synthesized by a completely separate translation model lacking key $k$. The token sequence is newly generated, yielding $z = -1.24$ (completely indistinguishable from human text). In Spanish, residual lexical alignment yielded $z = 2.83$, which remains below the $z = 3.00$ regulatory threshold.
2. **Cross-Model Paraphrase ("Rewrite with Meta AI"):** Pasting Claude or Gemini text into another model (or selecting Meta AI's "Rewrite" prompt) resamples the entire token distribution under an unkeyed process, collapsing $z$ to $0.99$ (Null).

---

## 4. Statutory & Regulatory Assessment

### 4.1 Impact on Article 50(2) "Robustness and Reliability"
Article 50(2) requires that marking mechanisms be *"effective, robust, and reliable."* The perturbation analysis demonstrates that SynthID-Text satisfies transport robustness (surviving social media feeds and messaging forwards), but fails **transformation robustness**:
- Any user who runs a post through Google Translate or Meta AI unintentionally erases the statutory mark.
- A regulatory enforcement framework that relies exclusively on statistical text watermarking cannot detect AI-generated text in multi-lingual or paraphrased distribution channels.

### 4.2 The Article 50(4b) Editorial Exemption Disconnect
Article 50(4b) exempts synthetic text from mandatory public disclosure if it has undergone *"a process of human editorial review"* and a natural or legal person holds editorial responsibility. This creates a severe legal-technical paradox:
- When a human editor substantially edits, refines, or rewrites an AI-generated draft, the legal duty to disclose is extinguished under Art. 50(4b).
- Simultaneously, this editorial editing destroys the watermark ($z \to 0$).
- Conversely, if the text retains a strong watermark ($z > 10$), it proves that the text was posted without meaningful human editorial intervention, providing prime-facie evidence that the deployer disclosure mandate of Art. 50(4b) applies!

---

## 5. Architectural Mandates for Month 2 Browser Extension

The empirical findings directly inform the implementation of **FR-02 (Text Provenance Module)** in Month 2:
1. **Length-Gating Threshold ($T \ge 50$):** The extension must compute client-side token counts before submitting text to detection endpoints. Spans with $T < 50$ tokens must return `INSUFFICIENT_LENGTH` rather than a false negative.
2. **Multi-Lingual Translation Alert:** If the extension detects that Meta’s auto-translation feature has been activated on a post, it must flag that the displayed text is an unwatermarked secondary translation of the original source.
3. **Editorial Control Classifier:** If a post exhibits intermediate $z$-scores ($1.5 \le z < 3.0$) and originates from an accredited journalistic organization, the compliance engine should classify the item as `EXEMPT_EDITORIAL_REVIEW_POSSIBLE`.
