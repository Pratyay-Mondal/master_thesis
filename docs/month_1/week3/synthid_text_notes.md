# Week 3 — Statistical Text Watermarking: Kirchenbauer Green-Lists, SynthID-Text, and Social-Media Failure Modes

**Thesis:** *AI Transparency in the Wild: Bridging Technical Provenance and Legal Compliance under the EU AI Act on Social Media Platforms*
**Phase:** Month 1 / Week 3 — Invisible Statistical Text Watermarking
**Date:** 28 October – 1 November 2026
**Companion artefacts:** `docs/month_1/scripts/synthid_text_simulator.py`, `docs/month_1/scripts/text_robustness_test.py`, `docs/month_1/scripts/entropy_analysis.py`

---

## Reading stack (priority order)

Read in this order. Week 2 showed that **C2PA hard-binding is a container property** (it dies when bytes change). Week 3 shows that **text watermarks are a sampling property** (they live in *which* tokens were chosen, not in a sidecar).

| Order | Source | What to extract |
|:---:|:---|:---|
| 1 | Kirchenbauer et al., ICML 2023, *A Watermark for Large Language Models* ([PMLR](https://proceedings.mlr.press/v202/kirchenbauer23a.html), [arXiv:2301.10226](https://arxiv.org/abs/2301.10226)) | Green/red partition, logit bias \(\delta\), one-proportion \(z\)-test, entropy dependence |
| 2 | Dathathri et al., *Nature* 634:818–823 (2024), *Scalable watermarking for identifying large language model outputs* | SynthID-Text: tournament sampling, \(g\)-functions, mean \(g\)-score, non-distortionary vs distortionary modes, Gemini production deployment |
| 3 | Anthropic (2024/25), *How Claude’s text watermarking works* (workspace PDF) | Provider-key detection, no extra tokens, sparse on low-entropy text, light-edit vs rewrite, Art. 50 relevance |
| 4 | Aaronson (2022), *My AI Safety Lecture at UT Austin* | Cryptographic ancestor: Gumbel-max / exponential-minimum sampling with a secret PRF |
| 5 | Google AI, *SynthID Text* developer docs | `keys`, `ngram_len`, repeated-ngram skip, Transformers logits-processor API |
| 6 | Christ, Gunn & Zamir (2024), *Undetectable Watermarks for Language Models* | Information-theoretic undetectability vs practical detectability trade-off |

**Colloquium one-liner:** Kirchenbauer is the *pedagogical* mechanism (explicit green/red lists + \(z\)-test). SynthID-Text is the *production* mechanism (tournament \(g\)-scores, quality-preserving). Claude implements a SynthID-Text variant. Neither is a metadata tag; both are hypothesis tests on token choices.

---

## 1. Core mechanism of statistical text watermarking

### 1.1 What is being marked

A language model does not emit a string in one shot. Given preceding tokens \(x_{<t} = (x_1,\ldots,x_{t-1})\) and vocabulary \(V\), it produces logits \(\ell_t(v)\) and a next-token distribution

\[
p_{\mathrm{LM}}(v \mid x_{<t}) = \mathrm{softmax}(\ell_t)_v.
\]

**Generative watermarking never retrains the model and never writes hidden Unicode.** It only changes *how* \(x_t\) is sampled from that distribution, using a secret key \(k\). Detection later asks: “Did these tokens win more often than chance under the keyed rule?”

This is the right contrast with Week 2:

| | C2PA (images) | Statistical text watermark |
|:---|:---|:---|
| Carrier | Manifest bytes in the file container (JUMBF / `caBX` / BMFF) | The *identity* of sampled tokens |
| Binding | Cryptographic hash of asset bytes | Correlation between tokens and a keyed PRF |
| Detector needs | Trust list + signature verification | Secret key (or provider detection API) |
| Survives re-encoding? | No (hard binding) | Yes, if the *words* survive |

### 1.2 Pseudo-random function keyed to preceding context

At each step \(t\), a **random seed generator** hashes a sliding window of the last \(h\) tokens (an \(h\)-gram) together with \(k\):

\[
r_t = \mathrm{PRF}_k(x_{t-h},\ldots,x_{t-1}).
\]

In Kirchenbauer’s public implementation this is typically a hash of the previous token (or a short window) seeding a PRNG. SynthID-Text uses the same sliding-window idea with \(H=4\) in the Nature experiments, plus a list of integer `keys` that define independent \(g\)-function layers.

**Why hash context rather than a global green list?**

1. A *fixed* green list (the same 50% of \(V\) always boosted) is a public statistical artefact: adversaries and even casual frequency analysis can learn it.
2. A *context-dependent* partition makes the green set \(G_t\) different at every position. The detector can still reconstruct \(G_t\) because it sees the same preceding tokens and knows \(k\).
3. Longer \(h\) (SynthID `ngram_len`) makes partitions look more random and raises detectability *on intact text*, but makes the scheme **brittle**: edit one context token and every subsequent seed \(r_t\) is wrong. That is the central social-media tension.

Cryptographically, \(\mathrm{PRF}_k\) should be a keyed HMAC (e.g. HMAC-SHA256), not Python’s salted `hash()`. The simulator in this week uses HMAC so a detector with the wrong key sees noise.

### 1.3 Green list vs red list (Kirchenbauer)

Given seed \(r_t\), randomly partition \(V\) into

\[
V = G_t \cup R_t, \qquad |G_t| = \gamma |V|.
\]

Typical default: \(\gamma = 1/2\) (equal green/red). Then apply a **soft** watermark: add bias \(\delta > 0\) to green logits before softmax:

\[
\hat{\ell}_t(v) =
\begin{cases}
\ell_t(v) + \delta & v \in G_t \\
\ell_t(v) & v \in R_t
\end{cases}
\qquad
\hat{p}(v) = \mathrm{softmax}(\hat{\ell}_t)_v.
\]

The **hard** variant (Algorithm 1 in Kirchenbauer) samples *only* from \(G_t\). It is easy to analyse and easy to detect, but it destroys quality on low-entropy spans (“Principia ___” almost has to be “Mathematica”). Production systems use the soft rule.

**What \(\delta\) does, intuitively**

- High-entropy positions (many plausible next words: adjectives, connectives, paraphrastic verbs) have a large green subset among the high-probability mass, so the sampler *can* prefer green without looking weird.
- Low-entropy positions (code, dates, named entities, “EU AI ___” → “Act”) have peaked \(p_{\mathrm{LM}}\). Adding \(\delta\) barely moves the argmax. Anthropic’s phrasing: the watermark has “nothing to act on.”

Expected green-token rate under the *null* (human / unwatermarked model, \(\gamma=0.5\)) is \(1/2\). Under the *alternative* (soft-watermarked generation) it is strictly larger than \(\gamma\), with the gap growing in \(\delta\) and in the spike entropy of \(p_{\mathrm{LM}}\). Kirchenbauer give an information-theoretic account: watermark strength scales with the model’s *consumed entropy*.

### 1.4 SynthID-Text: tournament sampling (production cousin)

SynthID-Text (Dathathri et al., 2024) does **not** publish an explicit green list. It still uses a keyed seed \(r_t\) from recent tokens, but then:

1. Define \(m\) independent pseudorandom **\(g\)-functions** \(g_\ell(v, r_t) \in \{0,1\}\) (DeepMind’s open toolkit: a list of `keys`; length of `keys` = number of tournament layers).
2. Sample \(M = 2^m\) candidate tokens from \(p_{\mathrm{LM}}\) (repeats allowed).
3. Run an \(m\)-layer **tournament**: pair candidates; at layer \(\ell\), keep the one with higher \(g_\ell\); continue until one winner \(x_t\).

Detection does not count green tokens. It averages \(g\)-values:

\[
\mathrm{Score}(x) = \frac{1}{mT} \sum_{t=1}^{T} \sum_{\ell=1}^{m} g_\ell(x_t, r_t).
\]

Watermarked text is biased toward high \(g\); human text has \(\mathbb{E}[g] \approx 1/2\) per bit. DeepMind also provide a **non-distortionary** configuration (quality-preserving; theoretically the marginal token distribution can match \(p_{\mathrm{LM}}\)) and a **distortionary** configuration (stronger detectability, quality cost). Tournament sampling was chosen so the scheme can sit *after* top-\(k\)/top-\(p\) and compose with **speculative decoding** — the reason it shipped on Gemini.

**Anthropic’s Claude watermark** is explicitly “a version of the SynthID-Text approach.” Operational properties that matter for Article 50:

| Property | Implication for this thesis |
|:---|:---|
| No extra tokens, no hidden characters | Not steganography; cannot be stripped like C2PA APP11 markers |
| Detection requires the provider key | A third-party “Transparency Validator” **cannot** independently verify Claude/Gemini text without an API or a disclosed key |
| Identity-free | Satisfies privacy; fails *attribution* of a specific deployer |
| Sparse on factual/code | Captions that are mostly hashtags + proper nouns are the worst-case social-media genre |
| Light edits degrade gradually; full rewrite kills the signal | Opposite of C2PA’s cliff-edge invalidation |

The Week 3 simulator implements the **Kirchenbauer green-list + \(z\)-test** because it is inspectable, matches your requested API (`apply_watermark` / `detect_watermark`), and is the standard pedagogical reduction of the same idea: keyed PRF → bias sampling → hypothesis test. Treat SynthID tournament scores as the industrial generalisation of “green.”

---

## 2. Detection and statistical significance

### 2.1 Zero-shot detection (no prompt, no weights)

The detector is given only:

- candidate string \(x = (x_1,\ldots,x_T)\),
- secret key \(k\),
- algorithm parameters \((\gamma, h)\) — *not* \(\delta\), *not* the LM.

It retokenises \(x\), and for each position \(t > h\) reconstructs \(G_t\) from \(\mathrm{PRF}_k(x_{t-h:t})\). Let \(|s|_G\) be the number of tokens that landed in their own green list, and let \(T\) be the number of *scored* tokens (usually \(T = n - h\)).

This is **not** membership inference against a model. Any party with \(k\) can run it. Any party *without* \(k\) cannot; that is why Art. 50(2)’s “detectable as artificially generated” currently collapses to **provider-operated APIs** unless keys are escrowed to market-surveillance authorities.

### 2.2 Hypothesis test

\[
H_0:\ \text{the span was generated with no knowledge of } k
\qquad\text{(human text, or a different model/key).}
\]

Under \(H_0\), if the PRF is unbiased, each scored token is green independently with probability \(\gamma\) (approximation: ignore token-distribution skew). Then

\[
|s|_G \sim \mathrm{Binomial}(T, \gamma),
\qquad
\mathbb{E}[|s|_G] = \gamma T,
\qquad
\mathrm{Var}(|s|_G) = \gamma(1-\gamma)T.
\]

One-proportion \(z\)-statistic (Kirchenbauer Eq. 2 generalised beyond \(\gamma=1/2\)):

\[
z = \frac{|s|_G - \gamma T}{\sqrt{\gamma(1-\gamma)\,T}}.
\]

For \(\gamma = 1/2\) this reduces to \(z = 2(|s|_G - T/2)/\sqrt{T}\).

One-sided \(p\)-value against the upper tail:

\[
p = 1 - \Phi(z) = \mathbb{P}(Z \ge z \mid H_0),\quad Z\sim\mathcal{N}(0,1).
\]

Decision rule used in this week’s harness (aligned with Kirchenbauer’s illustrative threshold, slightly relaxed from their \(z>4\) example):

\[
\text{detect if } z > 3.0 \quad (p \approx 1.35\times 10^{-3}).
\]

Kirchenbauer note that \(z>4\) gives a one-sided FPR \(\approx 3\times 10^{-5}\). Provider systems typically target even lower FPR (\(<10^{-5}\)) because falsely labelling a human as AI-generated is a political and legal incident, not just an ML metric.

### 2.3 Why length is not optional

\(z\) scales like \(\sqrt{T}\) times the excess green rate. If watermarked text achieves green rate \(\gamma+\varepsilon\),

\[
\mathbb{E}[z \mid H_1] \approx \varepsilon \sqrt{\frac{T}{\gamma(1-\gamma)}}.
\]

Worked example, \(\gamma=0.5\), \(\varepsilon=0.25\) (green rate 75% — plausible for a strong soft watermark on high-entropy prose):

| Scored tokens \(T\) | Expected \(z\) | Verdict at \(z>3\) |
|:---:|:---:|:---|
| 20 (short IG caption) | \(\approx 2.2\) | Usually **miss** |
| 50 (clipped mobile snippet) | \(\approx 3.5\) | Borderline **hit** |
| 200 (short FB post / Anthropic’s ~200–250 guidance) | \(\approx 7.1\) | Strong **hit** |
| 16, *perfect* hard watermark (\(\varepsilon=0.5\)) | \(=4\) | Kirchenbauer’s “tweet-length” hard-watermark bound |

**Thesis implication for Art. 50(2) + 50(4b):** machine-readable detectability of AI text is a **sample-size property**. Instagram captions, YouTube community posts, and WhatsApp forwards are often below the statistically honest operating point. A deployer label (visible disclosure) is not a substitute for a provider watermark, but it is the only mechanism that still works when \(T\) is too small.

SynthID’s mean \(g\)-score has the same \(\sqrt{T}\) concentration. Tournament layers \(m\) buy a tighter estimator, not immunity to truncation.

### 2.4 What the detector does *not* prove

- It does not identify the *user*.
- It does not prove the text is “false.”
- A failed detection is not proof of humanity (rewrite, translation, wrong key, too short, low entropy).
- A passed detection with key \(k_{\text{Claude}}\) does not bind Meta as deployer; it binds the *sampling process* of the keyed model.

That last point is the legal-technical hinge for Chapter 2: Art. 50(2) is a **provider** marking duty; Art. 50(4b) is a **deployer** disclosure duty for public-interest text. A \(z\)-score can support the former; the latter still needs UI.

---

## 3. Social media vulnerability landscape (“in the wild”)

C2PA died in Week 2 because **servers rewrote bytes**. Text watermarks die when **users or platforms rewrite tokens**, or when **\(T\) collapses**.

### 3.1 Truncation (captions, “see more”, mobile clipping)

| Platform reality | Effect on the statistic |
|:---|:---|
| Instagram caption clip in feed; “more” behind a tap | Detector on the *visible* snippet may be under-powered even if the full caption would pass |
| WhatsApp preview / reply-quote truncation | Same: \(T\downarrow \Rightarrow z\downarrow\) |
| Character limits (IG 2,200; X 280 historically) | Hard cap on \(\mathbb{E}[z]\) |

Truncation is **not an attack on the PRF**. Remaining tokens keep their original context *if the prefix is kept*. It is a **power** problem, not a **bias** problem. Prefix truncation (keep first 50 words) is milder than suffix-only or random deletion, because green lists for early tokens still see the correct left context.

**Experimental prediction (harness):** a first-50-word clip of a *strongly* watermarked long post often stays above \(z=3\) because power scales with \(\sqrt{T}\) *times excess green rate*. A 12-word snippet can still pass if the green rate is near 1 (hard-watermark regime). A naturally short caption that was never long enough to accumulate excess greens will not. The production implication is the same: **do not treat feed snippets as a reliable Art. 50(2) detector**.

### 3.2 Paraphrasing / rewriting / auto-correct

Any substitution of \(x_t\) has two effects:

1. **Direct:** that position may flip from green to red (\(\approx 50\%\) chance under a random synonym).
2. **Cascading:** \(x_t\) is part of the context hash for \(x_{t+1},\ldots,x_{t+h}\). One edit randomises the next \(h\) seeds. With \(h=1\) (Kirchenbauer default), damage is local. With SynthID `ngram_len=5`, a single word-edit can scramble five subsequent tests — **robustness falls as detectability on clean text rises**.

Social-media instantiations:

- User “makes it sound like me” before posting.
- iOS/Android autocorrect and Meta’s own text suggestions.
- “Rewrite with Meta AI” / paste into another LLM — this is **full resampling under a different key** (or no key): expected \(z \to 0\).

Kirchenbauer already emphasise that synonym-level attacks degrade \(z\) roughly with the edit fraction; a complete rewrite removes the watermark. Anthropic: “Light editing probably won’t remove the watermark completely; a complete rewrite where every word is replaced will.”

**Art. 50 reading:** a watermark that vanishes under ordinary editorial practice collides with the Art. 50(4b) *editorial responsibility* carve-out. If a journalist’s light edit both (a) may legally exempt disclosure and (b) may drop \(z\) below threshold, then **technical detectability and legal disclosure come apart** — the validator cannot treat \(z<3\) as “this was human.”

### 3.3 Multi-lingual translation (platform auto-translate)

Three distinct cases, often confused:

| Case | Who samples the output tokens? | Watermark |
|:---|:---|:---|
| User asks Claude/Gemini to *write in German* | Watermarked model | **Present** in DE (new generation under \(k\)) |
| User posts EN watermarked text; FB/IG **Show translation** | Platform MT system (not keyed with \(k\)) | **Destroyed** — every token is new, n-grams do not match |
| User runs Google Translate / DeepL on a Claude paragraph, then posts | Third-party MT | **Destroyed** |

Anthropic’s sentence “a translation produced by Claude carries a watermark” refers only to case 1. Meta auto-translate is case 2 and is the in-the-wild default for a German thesis corpus (EN posts shown in DE, DE posts shown in EN/ES).

Translation is worse than paraphrase: it changes tokenisation *and* language model, so both the identity of \(x_t\) and the context window are wrong. Glossary substitution in the harness is a lower bound on that damage (real NMT also reorders syntax).

### 3.4 Other platform-native perturbations

| Perturbation | Typical effect |
|:---|:---|
| Typos, keyboard-neighbour substitutions | Mild if word-level tokenisation still matches; harsher under BPE (one typo → different subwords → context break) |
| Emoji / hashtag / URL stuffing | Adds unwatermarked tokens, dilutes \(|s|_G/T\) |
| Copy-paste into an image (screenshot) | Text watermark **inapplicable** until OCR; then OCR errors ≈ noise injection |
| WhatsApp forwarding of the *string* | **Preserves** watermark (no CDN re-encode of text) — opposite of Week 2 image result |
| Mixing human comments under an AI post | Detector must be run on the *span*, not the thread |

### 3.5 Article 50 mapping (text)

| Obligation | Technical claim | In-the-wild status |
|:---|:---|:---|
| **50(2)** Provider: machine-readable + detectable, “effective, interoperable, robust, reliable” | Keyed \(z\) / \(g\)-score on the generated span | Detectable **if** key is available **and** \(T\) is large **and** tokens are not rewritten. **Not interoperable** across providers (Claude key ≠ Gemini key ≠ open Kirchenbauer demo). Robustness is **partial**, not C2PA-brittle and not attack-proof |
| **50(4b)** Deployer: disclose AI text on public-interest matters | Visible label; watermark is supporting evidence | Editorial-control exemption + paraphrase/translation mean a validator **cannot** be the sole compliance oracle |
| **50(5)** Clear, distinguishable, at first exposure | UI, not \(z\) | Watermark is invisible by design — it cannot satisfy 50(5) alone |

### 3.6 Empirical Token Entropy and Watermark Density

Statistical text watermarking (Kirchenbauer et al., SynthID-Text, Anthropic Claude) operates without hidden metadata by perturbing token selection during autoregressive sampling. However, the capacity to inject a watermark without perceptual distortion or semantic corruption is strictly bounded by the **conditional entropy** of the language model's output distribution at each generation step:

\[
H(X_t \mid X_{<t}) = -\sum_{v \in V} p(v \mid X_{<t}) \log_2 p(v \mid X_{<t}).
\]

Where conditional entropy is high (multiple plausible continuations), the sampler can freely select a green-list token from the candidate pool. Where entropy collapses to near-zero (deterministic completions), shifting logits (\(\delta\)) either fails to alter token choice or forces syntactically illegal / hallucinated words.

#### Empirical Benchmarking across Text Genres (`entropy_analysis.py`)

Using character \(n\)-gram modeling (\(n=3\) with Laplace conditional smoothing) via `docs/month_1/scripts/entropy_analysis.py`, we evaluated per-token entropy and the proportion of "nudgeable" tokens (defined as tokens possessing \(H \ge 2.50\text{ bits}\) of choice entropy) across four benchmark genres:

| Sample Genre | Tokens (\(T\)) | Chars | Shannon N-gram \(H\) | Mean \(H\) / Token | Nudgeable Tokens (%) | Watermark Density Tier | Est. Signal Capacity |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Creative Prose** | 37 | 201 | 7.35 bits | 4.86 bits | 73.0% (27/37) | **HIGH** | 27.0 bits |
| **Factual Report** | 28 | 162 | 7.11 bits | 5.10 bits | 71.4% (20/28) | **HIGH** | 21.4 bits |
| **Python Code** | 28 | 92 | 5.34 bits | 1.98 bits | 25.0% (7/28) | **INEFFECTIVE** | 8.3 bits |
| **Social Media Caption** | 22 | 107 | 6.57 bits | 4.29 bits | 77.3% (17/22) | **MEDIUM** (Sparse) | 14.2 bits |

#### Analysis: Why Low-Entropy and Micro-Spans Fail

1. **Syntactic Determinism in Code (The "Zero-Choice" Trap):**
   In the Python code sample (`fibonacci`), average entropy drops to \(1.98\text{ bits/token}\), with **75.0% of tokens non-nudgeable**. Syntactic delimiters (`(`, `)`, `:`, indentation) and deterministic control flow tokens (`def`, `if`, `return`) have near-zero conditional entropy in context. Attempting to force a green token in these positions either causes immediate syntax compilation errors (`SyntaxError`) or is completely suppressed by soft logit masking because the top candidate's logit exceeds competitors by orders of magnitude.

2. **The Social Media Micro-Span Dilemma (Power Collapse):**
   Although the social media caption exhibits moderate vocabulary entropy (\(4.29\text{ bits/token}\)), its total length is only \(T = 22\text{ tokens}\) (interspersed with emojis and hashtags like `#blessed`). Because detection confidence scales with sample size (\(\mathbb{E}[z] \approx \varepsilon \sqrt{T / (\gamma(1-\gamma))}\)), a 22-token post cannot accumulate sufficient statistical mass to achieve the detection threshold (\(z > 3.0\)). In social feeds, truncated snippets and captions operate in a statistical dead zone.

3. **Factual Sparsity Islands:**
   In factual passages, named entities (*"Isaac Newton"*, *"Philosophiæ Naturalis Principia Mathematica"*) and strict dates (*"5 July 1687"*) act as low-entropy anchors. The watermark cannot safely touch these tokens without hallucination, restricting injection exclusively to connective verbs and prepositions (*"published"*, *"contains"*, *"and his"*).

**Regulatory Implication for Article 50(2):** Machine-readable statistical text watermarking is **both entropy-gated and length-gated**. AI-generated code snippets, tabular data, and short social media captions cannot reliably carry a detectable statistical watermark in the wild. Consequently, regulatory compliance on social media platforms cannot rely on statistical watermarks alone; visible deployer disclosures (Art. 50(4b)) and UI platform labels remain an indispensable legal requirement.

---

## 4. How to run this week’s artefacts

```bash
pip install numpy scipy
cd docs/month_1/scripts
python synthid_text_simulator.py
python text_robustness_test.py
python text_robustness_test.py --json ../../test_results/text_watermark_robustness.json
python entropy_analysis.py --verbose --json ../test_results/entropy_analysis.json
```

Interpretation discipline (same as Week 2): the simulator is a **mechanistic model**, not Gemini/Claude. `apply_watermark` is an *edit-based stand-in* for logit-boosted sampling (keep green tokens; substitute nearby green words for red tokens). Absolute \(z\) values are not production numbers. The *ordering* of failure modes to take into the colloquium is:

1. Verbatim / WhatsApp text forward / emoji stuffing — **survive**
2. Typos and light lexical edits — **degrade, often still detectable** on long spans
3. Caption truncation — **power loss**, not bias loss
4. Moderate paraphrase — **partial**; may still exceed \(z=3\) if \(T\) is large
5. Platform MT and other-LM rewrite — **null-consistent** (the C2PA analogue of “stripped”)

---

## 5. Comparison matrix — C2PA vs statistical text watermarks

See also the JSON/printed matrix emitted by `text_robustness_test.py`.

| Dimension | C2PA hard-bound image provenance (Week 2) | Kirchenbauer / SynthID-Text statistical watermark (Week 3) |
|:---|:---|:---|
| **Carrier** | Manifest store + `c2pa.hash.data` inside JPEG/PNG/WebP/MP4 | Token identities in the UTF-8 string |
| **Injection point** | Authoring tool / SDK after pixels exist | LM *sampler* during generation |
| **Detector inputs** | File bytes, trust list, X.509 chain | Text span + secret key (no weights, no prompt) |
| **Null hypothesis** | Signature verifies and hash matches | Green rate (or mean \(g\)) consistent with chance |
| **Failure on Meta image CDN** | **Total.** Resize + JPEG/WebP re-encode + APP-marker strip → 0% survival (FB/IG/WA) | N/A for images; text path does not hit that pipeline |
| **Failure on verbatim text post** | N/A | **None.** \(z\) preserved |
| **Failure on truncation** | Hash mismatch if any byte changes (images); N/A for text | **Graceful power loss** (\(\propto \sqrt{T}\)); may drop below \(z=3\) on captions |
| **Failure on light edit / typo** | Immediate invalidation of hard binding | Partial; remaining aligned n-grams still score |
| **Failure on paraphrase / other-LM rewrite** | N/A | **Severe to total** |
| **Failure on platform MT** | N/A | **Total** (new tokens, new language) |
| **Third-party verifiability** | Yes, if trust list is public | **No**, unless the provider discloses \(k\) or a detection API |
| **Art. 50(2) “machine-readable”** | Yes (assertions) — until the container is stripped | Yes (statistical mark in the text itself) |
| **Art. 50(2) “robust / reliable”** | Fails Meta ingestion | Holds for copy-paste; fails rewrite/MT; length-dependent |
| **Art. 50(5) user-facing disclosure** | Not by itself (credential UI is rare on IG/FB) | Not by itself (intentionally invisible) |
| **Complementarity** | Soft-binding / invisible *image* watermarks | Visible deployer labels + provider detection APIs |

**Week 3 working thesis sentence:** *C2PA fails as a binary container invariant; SynthID-style text watermarks fail as a decaying statistical test. Article 50 needs both a surviving technical mark and a disclosure surface that does not depend on \(z>3\).*
