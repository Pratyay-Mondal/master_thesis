# Colloquium 1 — Speaking Script (~3 Minutes)

**Setting:** Friday, 16 October 2026 · Roundtable with Prof. Dr. Oermann and fellow thesis students

---

## Opening (≈30 seconds)

Good morning everyone, and thank you Professor Oermann for the opportunity to present.

My thesis is titled *"AI Transparency in the Wild: Bridging Technical Provenance and Legal Compliance under the EU AI Act on Social Media Platforms."*

The core question is straightforward: the EU AI Act — specifically Article 50 — now requires that AI-generated content is machine-readably marked and detectable. But what happens to those marks once content hits real social media platforms? Following Professor Oermann's recommendation, I've expanded the scope from Facebook alone to the full **Meta ecosystem** — Facebook and Instagram as primary targets, since they share the same CDN and compression infrastructure, and WhatsApp as a comparative benchmark to see how end-to-end encryption changes the picture.

---

## Key Insights from the First 9 Days (≈90 seconds)

Over the past nine days I've been working on two parallel tracks — legal and technical — and the most productive result so far is seeing exactly where they collide.

**On the legal side**, I've done a paragraph-level deconstruction of Article 50. The key insight is that the regulation creates two entirely separate obligation chains. **Providers** — companies like Anthropic or OpenAI — must embed machine-readable marks into their outputs at generation time. **Deployers** — which on social media could be the posting user *or* Meta itself, depending on whose AI tools generated the content — must disclose deepfakes and AI-generated text on matters of public interest. The boundary between these two actors is surprisingly ambiguous when a platform acts as both an intermediary and a provider of its own AI tools, and this ambiguity is one of the legal threads I'll be unravelling in the coming weeks.

**On the technical side**, I've been studying the two dominant provenance mechanisms. For images, **C2PA** — the Coalition for Content Provenance and Authenticity — provides cryptographically signed metadata manifests embedded in JUMBF containers inside image files. The problem is that this relies on what's called *hard binding* — a byte-level hash of the image. Any re-compression, which Facebook and Instagram perform on every single upload, completely destroys the manifest. So C2PA, in its current form, is fundamentally incompatible with social media pipelines.

For text, the picture is more nuanced. **SynthID-Text**, the statistical watermarking approach used by both Google's Gemini and Anthropic's Claude, works by subtly biasing token selection during generation using a secret PRNG key. It survives copy-paste perfectly and degrades gracefully with light editing. However, there are two critical limitations: first, detection requires at least two hundred tokens to be statistically significant, and most social media posts are far shorter. Second, detection is **key-gated** — only the provider's own API can verify the watermark — which directly tensions with Article 50's requirement for *interoperable* solutions.

This gap — where the law demands interoperable, robust detection, but neither C2PA nor SynthID-Text can deliver it independently on social media — is precisely the research gap my thesis addresses.

---

## Engineering Next Steps (≈60 seconds)

For the next two weeks, I have three concrete engineering milestones.

**First**, I'm setting up the C2PA toolchain — `c2patool`, the Rust-based CLI — and will run empirical metadata survival tests. I'll take C2PA-signed images, simulate Facebook's upload pipeline using ImageMagick with quality seventy-five and metadata stripping, and formally document the manifest destruction. I'll run the same experiment with simulated WhatsApp parameters — quality sixty, aggressive resizing — to establish the comparative baseline.

**Second**, I'll be doing a deep dive into the foundational SynthID-Text literature — the Aaronson 2022 proposal, the Kirchenbauer green-red list paper from ICML 2023, and the DeepMind Nature 2024 paper that SynthID-Text is based on — to build the perturbation resilience analysis table that maps each type of social media text transformation to its expected impact on the watermark signal.

**Third**, I'll begin setting up a DOM parsing test harness on Facebook Web to understand the post-element structure — where images, text, and platform labels sit in the DOM — because this directly feeds into the browser extension architecture for the prototype tool.

---

## Closing (≈15 seconds)

So in summary: the first nine days have confirmed that the regulatory-technical gap is real, measurable, and well-defined. No single mechanism satisfies all of Article 50's obligations on Meta's platforms, which is what motivates the complementary approach — and the tool — that my thesis proposes. I'm looking forward to your feedback. Thank you.

---

*Total estimated speaking time: ~3 minutes*
*Recommended: practise twice at natural pace; aim for 2:50–3:10*
