#!/usr/bin/env python3
"""
synthid_text_simulator.py — Green-List Watermarker & Zero-Shot Detector
=======================================================================

Master's Thesis: "AI Transparency in the Wild"
Author: Pratyay Mondal · THWS · M.Sc. Artificial Intelligence
Week 3 Deliverable — Statistical Text Watermarking (Kirchenbauer / SynthID-Text analogue)

Purpose:
    Pedagogical, fully offline simulation of *generative* statistical text
    watermarking. This is NOT Google DeepMind SynthID-Text (tournament
    sampling) and NOT Claude's production detector. It implements the
    inspectable Kirchenbauer et al. (ICML 2023) reduction:

        keyed PRF over a context n-gram
        → green/red partition of the vocabulary
        → logit bias δ on green tokens
        → one-proportion z-test / p-value at detection time

    Detection reconstructs green lists from the secret key and the observed
    text. It does not need the original prompt or model weights.

Dependencies:
    pip install numpy scipy

Usage:
    python synthid_text_simulator.py
    python synthid_text_simulator.py --text "your span here"
    python synthid_text_simulator.py --demo
"""

from __future__ import annotations

import argparse
import hashlib
import hmac
import json
import math
import re
import sys
from dataclasses import asdict, dataclass
from typing import Any, Iterable, Sequence

import numpy as np
from scipy.stats import norm

# ---------------------------------------------------------------------------
# Default parameters (Kirchenbauer-style)
# ---------------------------------------------------------------------------

DEFAULT_SECRET_KEY = "THWS_Thesis_Secret_Key_2026"
DEFAULT_GAMMA = 0.5
DEFAULT_BIAS = 2.5  # logit boost δ
DEFAULT_CONTEXT_WINDOW = 1
Z_THRESHOLD = 3.0

TOKEN_RE = re.compile(r"\w+|[^\w\s]", re.UNICODE)

# Compact closed-class + thesis-domain lexicon. OOV words still get stable IDs
# via hashing so arbitrary social-media text remains scorable.
LEXICON: tuple[str, ...] = (
    "the", "be", "to", "of", "and", "a", "in", "that", "have", "i", "it", "for",
    "not", "on", "with", "he", "as", "you", "do", "at", "this", "but", "his",
    "by", "from", "they", "we", "say", "her", "she", "or", "an", "will", "my",
    "one", "all", "would", "there", "their", "what", "so", "up", "out", "if",
    "about", "who", "get", "which", "go", "me", "when", "make", "can", "like",
    "time", "no", "just", "him", "know", "take", "people", "into", "year",
    "your", "good", "some", "could", "them", "see", "other", "than", "then",
    "now", "look", "only", "come", "its", "over", "think", "also", "back",
    "after", "use", "two", "how", "our", "work", "first", "well", "way", "even",
    "new", "want", "because", "any", "these", "give", "day", "most", "us",
    "very", "still", "should", "here", "such", "much", "those", "too", "may",
    "through", "before", "between", "under", "again", "same", "another",
    "while", "where", "each", "own", "few", "against", "during", "without",
    "around", "among", "every", "both", "however", "therefore", "moreover",
    "although", "whether", "within", "across", "toward", "rather", "quite",
    "almost", "already", "always", "often", "never", "perhaps", "indeed",
    "article", "act", "union", "european", "commission", "regulation",
    "provider", "deployer", "transparency", "obligation", "synthetic",
    "content", "watermark", "detection", "provenance", "platform", "social",
    "media", "facebook", "instagram", "whatsapp", "caption", "comment",
    "post", "model", "generation", "statistical", "token", "green", "red",
    "logit", "probability", "hypothesis", "score", "threshold", "robustness",
    "truncation", "paraphrase", "translation", "metadata", "manifest",
    "signature", "compliance", "machine", "readable", "format", "public",
    "interest", "disclosure", "label", "system", "output", "text", "image",
    "video", "audio", "user", "key", "hash", "context", "window", "sample",
    "distribution", "entropy", "quality", "accuracy", "false", "positive",
    "rate", "span", "sequence", "language", "german", "spanish", "english",
    "clear", "effective", "interoperable", "reliable", "robust", "marking",
    "artificial", "intelligence", "generated", "human", "review", "editorial",
    "responsibility", "deepfake", "misinformation", "pipeline", "upload",
    "compression", "survival", "failure", "complement", "mechanism",
    "research", "thesis", "analysis", "evidence", "legal", "technical",
    "mandate", "authority", "office", "code", "practice", "guideline",
    "significant", "substantial", "assistive", "standard", "editing",
    "interaction", "exposure", "accessible", "distinguishable",
    "recent", "study", "shows", "suggests", "argues", "explains", "describes",
    "requires", "ensures", "remains", "becomes", "includes", "provides",
    "supports", "challenges", "undermines", "preserves", "destroys",
    "survives", "degrades", "applies", "extends", "compares", "measures",
    "policy", "risk", "harm", "trust", "safety", "privacy", "identity",
    "secret", "open", "closed", "third", "party", "validator", "tool",
    "short", "long", "strong", "weak", "high", "low", "partial", "full",
    "original", "modified", "rewritten", "clipped", "noisy", "clean",
)


SYNONYMS: dict[str, tuple[str, ...]] = {
    "however": ("nevertheless", "nonetheless", "still", "yet"),
    "therefore": ("thus", "hence", "accordingly", "so"),
    "important": ("significant", "crucial", "central", "major"),
    "shows": ("demonstrates", "indicates", "reveals", "suggests"),
    "requires": ("demands", "needs", "mandates", "obliges"),
    "content": ("material", "output", "text", "media"),
    "platform": ("service", "network", "site", "application"),
    "generated": ("produced", "created", "synthesised", "written"),
    "detection": ("identification", "recognition", "verification", "scoring"),
    "robust": ("resilient", "durable", "stable", "reliable"),
    "effective": ("successful", "adequate", "workable", "functional"),
    "transparency": ("openness", "disclosure", "visibility", "clarity"),
    "watermark": ("mark", "signal", "signature", "trace"),
    "artificial": ("synthetic", "machine", "generated", "automated"),
    "people": ("users", "persons", "individuals", "citizens"),
    "good": ("strong", "sound", "solid", "useful"),
    "new": ("recent", "novel", "fresh", "updated"),
    "also": ("additionally", "further", "likewise", "too"),
}


# ---------------------------------------------------------------------------
# Tokenisation
# ---------------------------------------------------------------------------

def tokenize(text: str) -> list[str]:
    """Whitespace/punctuation tokenizer (word-level proxy for BPE)."""
    return TOKEN_RE.findall(text)


def detokenize(tokens: Sequence[str]) -> str:
    out: list[str] = []
    for tok in tokens:
        if out and re.fullmatch(r"[^\w\s]", tok) and tok not in {"(", "[", "{"}:
            out[-1] = out[-1].rstrip() + tok
            out.append("")
            continue
        out.append(tok)
    text = " ".join(t for t in out if t)
    text = re.sub(r"\s+([,.;:!?%])", r"\1", text)
    text = re.sub(r"\(\s+", "(", text)
    text = re.sub(r"\s+\)", ")", text)
    return text.strip()


def _token_id(token: str) -> int:
    raw = hashlib.md5(token.lower().encode("utf-8")).digest()
    return int.from_bytes(raw[:8], "big")


# ---------------------------------------------------------------------------
# PRF / green list
# ---------------------------------------------------------------------------

def context_seed(secret_key: str, context: Sequence[str]) -> bytes:
    msg = "\x1f".join(t.lower() for t in context).encode("utf-8")
    return hmac.new(secret_key.encode("utf-8"), msg, hashlib.sha256).digest()


def is_green_token(
    token: str,
    context: Sequence[str],
    secret_key: str,
    gamma: float = DEFAULT_GAMMA,
) -> bool:
    """
    Token is green iff a keyed hash of (context, token) falls in [0, γ).

    Equivalent to drawing a random partition G_t of fractional size γ from
    PRF_k(context), then testing membership — without materialising |V|.
    """
    seed = context_seed(secret_key, context)
    token_digest = hmac.new(seed, token.lower().encode("utf-8"), hashlib.sha256).digest()
    # Map 53 bits into [0, 1)
    unit = int.from_bytes(token_digest[:7], "big") / float(2**56)
    return unit < gamma


# ---------------------------------------------------------------------------
# Result objects
# ---------------------------------------------------------------------------

@dataclass
class DetectionResult:
    status: str
    total_tokens: int
    scored_tokens: int
    green_count: int
    expected_green: float
    green_proportion: float
    gamma: float
    z_score: float
    p_value: float
    is_watermarked: bool
    confidence_level: str
    threshold: float = Z_THRESHOLD

    def to_dict(self) -> dict[str, Any]:
        payload = asdict(self)
        payload["p_value"] = float(self.p_value)
        payload["z_score"] = float(self.z_score)
        return payload


def _confidence(z: float) -> str:
    if z >= 4.0:
        return "Very high (z≥4, one-sided FPR ≈ 3e-5)"
    if z >= 3.0:
        return "High (z≥3, one-sided FPR ≈ 1.3e-3)"
    if z >= 2.0:
        return "Moderate (z≥2, ≈ 2.3% one-sided)"
    if z >= 1.0:
        return "Low"
    return "Null-consistent"


# ---------------------------------------------------------------------------
# Engine
# ---------------------------------------------------------------------------

class StatisticalTextWatermarker:
    """Kirchenbauer-style green-list watermarker + z-test detector."""

    def __init__(
        self,
        secret_key: str = DEFAULT_SECRET_KEY,
        gamma: float = DEFAULT_GAMMA,
        bias: float = DEFAULT_BIAS,
        context_window: int = DEFAULT_CONTEXT_WINDOW,
        vocab: Sequence[str] | None = None,
        rng_seed: int | None = 42,
        force_replace: bool = False,
    ) -> None:
        if not 0.0 < gamma < 1.0:
            raise ValueError("gamma must be in (0, 1)")
        if context_window < 1:
            raise ValueError("context_window must be ≥ 1")
        self.secret_key = secret_key
        self.gamma = gamma
        self.bias = bias
        self.context_window = context_window
        self.vocab = list(dict.fromkeys(vocab if vocab is not None else LEXICON))
        self.rng = np.random.default_rng(rng_seed)
        self.force_replace = force_replace

    def _padded_context(self, tokens: Sequence[str], index: int) -> list[str]:
        start = index - self.context_window
        if start >= 0:
            return list(tokens[start:index])
        pad = ["<bos>"] * (-start)
        return pad + list(tokens[0:index])

    def is_green(self, token: str, context: Sequence[str]) -> bool:
        return is_green_token(token, context, self.secret_key, self.gamma)

    def _surface(self, original: str, replacement: str) -> str:
        if original.isupper():
            return replacement.upper()
        if original[:1].isupper():
            return replacement[:1].upper() + replacement[1:]
        return replacement

    def _local_candidates(self, original: str) -> list[str]:
        """Synonyms and similar-length neighbours — not a random bag of lexicon words."""
        low = original.lower()
        pool = [low, *SYNONYMS.get(low, ())]
        target_len = len(low)
        for w in self.vocab:
            if abs(len(w) - target_len) <= 2 and (w[:1] == low[:1] or abs(len(w) - target_len) == 0):
                pool.append(w)
        uniq: list[str] = []
        seen: set[str] = set()
        for w in pool:
            if w in seen or not w.isalpha():
                continue
            seen.add(w)
            uniq.append(w)
        return uniq

    def _green_replacement(self, original: str, context: Sequence[str]) -> str:
        """Soft watermark: keep green tokens; otherwise pick a nearby green word."""
        if re.fullmatch(r"[^\w\s]", original) or not original.isalpha():
            return original
        if not self.force_replace and self.is_green(original, context):
            return original

        local = self._local_candidates(original)
        green_local = [w for w in local if self.is_green(w, context)]
        if not green_local:
            green_local = [w for w in self.vocab if self.is_green(w, context)]
            if len(green_local) > 80:
                # Length-matched subset keeps substitutions from looking like random noise.
                target = len(original)
                green_local = [w for w in green_local if abs(len(w) - target) <= 3] or green_local[:80]

        if not green_local:
            return original

        # Soft rule: with probability that grows in δ, take a green substitute.
        p_force_green = 1.0 - float(np.exp(-self.bias))  # δ=2.5 → ~0.92
        if self.rng.random() > p_force_green:
            return original

        choice = min(green_local, key=lambda w: (abs(len(w) - len(original)), w))
        return self._surface(original, choice)

    def _sample_green_biased(self, original: str, context: Sequence[str]) -> str:
        return self._green_replacement(original, context)

    def apply_watermark(self, text: str, secret_key: str | None = None, bias: float | None = None) -> str:
        """
        Rewrite `text` so that next-token choices are biased toward the green
        list of the preceding n-gram. This is an *edit-based* stand-in for
        logit-boosted LM sampling: it needs no model weights, keeps mostly
        readable English, and yields a detectable statistical excess of green
        tokens under the same key.
        """
        if secret_key is not None:
            self.secret_key = secret_key
        if bias is not None:
            self.bias = bias
        tokens = tokenize(text)
        if len(tokens) <= self.context_window:
            return text
        watermarked = list(tokens[: self.context_window])
        for i in range(self.context_window, len(tokens)):
            ctx = watermarked[-self.context_window :]
            watermarked.append(self._sample_green_biased(tokens[i], ctx))
        return detokenize(watermarked)

    def detect_watermark(self, text: str, secret_key: str | None = None) -> DetectionResult:
        """
        Zero-shot green-list detector.

        H0: each scored token is independently green with probability γ.
        z = (G - γT) / sqrt(γ(1-γ)T)
        p = 1 - Φ(z)   (one-sided)
        """
        if secret_key is not None:
            self.secret_key = secret_key
        tokens = tokenize(text)
        n = len(tokens)
        if n <= self.context_window:
            return DetectionResult(
                status="INSUFFICIENT_TOKENS",
                total_tokens=n,
                scored_tokens=0,
                green_count=0,
                expected_green=0.0,
                green_proportion=0.0,
                gamma=self.gamma,
                z_score=0.0,
                p_value=1.0,
                is_watermarked=False,
                confidence_level="None",
            )

        green = 0
        scored = 0
        for i in range(self.context_window, n):
            ctx = tokens[i - self.context_window : i]
            scored += 1
            if self.is_green(tokens[i], ctx):
                green += 1

        mean = self.gamma * scored
        var = self.gamma * (1.0 - self.gamma) * scored
        std = math.sqrt(var) if var > 0 else 1.0
        z = (green - mean) / std
        p_value = float(norm.sf(z))
        return DetectionResult(
            status="SUCCESS",
            total_tokens=n,
            scored_tokens=scored,
            green_count=green,
            expected_green=round(mean, 2),
            green_proportion=round(green / scored if scored else 0.0, 4),
            gamma=self.gamma,
            z_score=round(float(z), 4),
            p_value=p_value,
            is_watermarked=bool(z > Z_THRESHOLD),
            confidence_level=_confidence(z),
        )


def apply_watermark(
    text: str,
    secret_key: str = DEFAULT_SECRET_KEY,
    bias: float = DEFAULT_BIAS,
    gamma: float = DEFAULT_GAMMA,
    context_window: int = DEFAULT_CONTEXT_WINDOW,
    rng_seed: int | None = 42,
    force_replace: bool = False,
) -> str:
    """Module-level API required by the Week 3 brief."""
    engine = StatisticalTextWatermarker(
        secret_key=secret_key,
        gamma=gamma,
        bias=bias,
        context_window=context_window,
        rng_seed=rng_seed,
        force_replace=force_replace,
    )
    return engine.apply_watermark(text)


def detect_watermark(
    text: str,
    secret_key: str = DEFAULT_SECRET_KEY,
    gamma: float = DEFAULT_GAMMA,
    context_window: int = DEFAULT_CONTEXT_WINDOW,
) -> dict[str, Any]:
    """Module-level API required by the Week 3 brief."""
    engine = StatisticalTextWatermarker(
        secret_key=secret_key,
        gamma=gamma,
        context_window=context_window,
        rng_seed=None,
    )
    return engine.detect_watermark(text).to_dict()


# ---------------------------------------------------------------------------
# Demo corpus
# ---------------------------------------------------------------------------

DEMO_PROMPT = (
    "European Union AI Act Article 50 mandates transparency for artificial "
    "intelligence systems that generate synthetic content on social media."
)

HUMAN_CONTROL = """
The European Parliament and the Council of the European Union recently
finalised the landmark AI Act. Under Article 50, providers and deployers of
generative AI systems must ensure that synthetic content, including text,
images, audio, and video, is marked in a machine-readable format. This
provision aims to combat misinformation, deepfakes, and automated spam on
social media platforms like Facebook, Instagram, and WhatsApp. However,
platform-level media transformations often strip metadata, creating technical
hurdles for compliance. Independent researchers therefore study complementary
mechanisms such as statistical text watermarking, because captions and comments
do not carry a C2PA manifest store. A natural writer choosing ordinary English
words should not systematically prefer a secret green list keyed to previous
tokens. Detection scores on such human prose are expected to concentrate
around a z-score of zero under the null hypothesis of the one-proportion test.
""".strip()

WATERMARK_SOURCE = """
Article 50 of the European Union AI Act requires providers to mark synthetic
text in a machine-readable format that remains detectable after distribution.
On social media platforms the typical unit of speech is a caption, a comment,
or a short public-interest post rather than a long report. Statistical
watermarking changes only the sampling of tokens: a pseudo-random function
keyed with a secret and the preceding n-gram partitions the vocabulary into
a green list and a red list, then boosts green logits during generation.
A detector that knows the key can count green tokens, compute a z-score, and
report a p-value without the original prompt or the model weights. Truncation
reduces sample size and therefore statistical power. Paraphrase and
auto-correct break context hashes. Platform auto-translate into German or
Spanish replaces every token and is expected to destroy the signal. Light
typos should degrade the score more gently than a full rewrite. This passage
is intentionally long, high-entropy prose so that a soft green-list rewrite
has room to act, mirroring the Anthropic observation that factual code and
proper nouns leave the watermark with nothing to act on. Complementary
visible labels remain necessary because an invisible mark cannot satisfy the
clear and distinguishable first-exposure duty in Article 50(5), and because
a third party cannot verify a provider key that is never disclosed.
""".strip()


def _print_detection(title: str, result: dict[str, Any]) -> None:
    print(f"\n{title}")
    print(f"  tokens scored : {result['scored_tokens']} / {result['total_tokens']} total")
    print(f"  green count   : {result['green_count']} (expected {result['expected_green']} at γ={result['gamma']})")
    print(f"  green rate    : {result['green_proportion']}")
    print(f"  z-score       : {result['z_score']}")
    print(f"  p-value       : {result['p_value']:.6e}")
    print(f"  detected      : {result['is_watermarked']}  [{result['confidence_level']}]")


def run_demo(secret_key: str, bias: float) -> None:
    print("=" * 72)
    print("SynthID-Text analogue — Kirchenbauer green-list simulator")
    print("THWS Master's thesis · Week 3")
    print("=" * 72)
    print(f"key={secret_key!r}  γ={DEFAULT_GAMMA}  δ={bias}  h={DEFAULT_CONTEXT_WINDOW}  detect iff z>{Z_THRESHOLD}")

    watermarked = apply_watermark(WATERMARK_SOURCE, secret_key=secret_key, bias=bias)
    print("\n[Watermarked rewrite snippet]")
    print(watermarked[:420] + ("..." if len(watermarked) > 420 else ""))

    human = detect_watermark(HUMAN_CONTROL, secret_key=secret_key)
    machine = detect_watermark(watermarked, secret_key=secret_key)
    wrong_key = detect_watermark(watermarked, secret_key="wrong-key-not-the-provider-secret")

    _print_detection("1. Human control (should be H0)", human)
    _print_detection("2. Watermarked rewrite (should reject H0)", machine)
    _print_detection("3. Same watermarked text, wrong key (should look like H0)", wrong_key)

    if not machine["is_watermarked"]:
        print("\nWARNING: watermarked sample did not clear z>3. Re-run or raise --bias.", file=sys.stderr)
        sys.exit(2)
    print("\nDemo OK: keyed detector separates human prose from green-list text.")


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Statistical text watermark simulator (Week 3).")
    parser.add_argument("--demo", action="store_true", help="Run human vs watermarked vs wrong-key demo.")
    parser.add_argument("--text", type=str, default=None, help="Detect this span under --key.")
    parser.add_argument("--apply", action="store_true", help="Watermark --text (or the built-in source) and detect.")
    parser.add_argument("--key", type=str, default=DEFAULT_SECRET_KEY)
    parser.add_argument("--bias", type=float, default=DEFAULT_BIAS)
    parser.add_argument("--json", action="store_true", help="Print detection JSON only.")
    args = parser.parse_args(list(argv) if argv is not None else None)

    if args.text and not args.apply:
        result = detect_watermark(args.text, secret_key=args.key)
        if args.json:
            print(json.dumps(result, indent=2))
        else:
            _print_detection("Detection", result)
        return 0

    if args.apply:
        source = args.text if args.text else WATERMARK_SOURCE
        wm = apply_watermark(source, secret_key=args.key, bias=args.bias)
        result = detect_watermark(wm, secret_key=args.key)
        if args.json:
            print(json.dumps({"watermarked_text": wm, "detection": result}, indent=2))
        else:
            print(wm)
            _print_detection("Detection on watermarked output", result)
        return 0

    run_demo(secret_key=args.key, bias=args.bias)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
