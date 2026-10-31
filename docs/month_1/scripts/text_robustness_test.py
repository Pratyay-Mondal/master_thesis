#!/usr/bin/env python3
"""
text_robustness_test.py — Social-Media Text Watermark Stress Harness
====================================================================

Master's Thesis: "AI Transparency in the Wild"
Author: Pratyay Mondal · THWS · M.Sc. Artificial Intelligence
Week 3 Deliverable — Robustness of statistical text watermarks

Purpose:
    Take a green-list watermarked passage and apply platform-realistic
    transformations, then re-run the zero-shot z-test (detect iff z > 3.0).

    Transformations
    ---------------
    verbatim              copy-paste into a post (baseline)
    char_substitution     typos / keyboard-neighbour noise
    word_substitution     casual user edits
    caption_truncation    first 50 words (mobile feed clip)
    paraphrase            drop modifiers / swap connectives
    translation_de        glossary EN→DE (proxy for platform MT)
    translation_es        glossary EN→ES
    emoji_hashtag_noise   social-media stuffing
    full_shuffle          adversarial word permutation (rewrite lower bound)

Dependencies:
    pip install numpy scipy

Usage:
    python text_robustness_test.py
    python text_robustness_test.py --json ../../test_results/text_watermark_robustness.json
    python text_robustness_test.py --bias 3.0 --seed 7
"""

from __future__ import annotations

import argparse
import json
import random
import re
import sys
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

from synthid_text_simulator import (
    HUMAN_CONTROL,
    WATERMARK_SOURCE,
    Z_THRESHOLD,
    apply_watermark,
    detect_watermark,
    tokenize,
    detokenize,
)

# ---------------------------------------------------------------------------
# Lightweight MT glossaries (proxies — not production NMT)
# ---------------------------------------------------------------------------

EN_DE = {
    "article": "Artikel",
    "european": "europäisch",
    "union": "Union",
    "act": "Gesetz",
    "requires": "verlangt",
    "providers": "Anbieter",
    "provider": "Anbieter",
    "mark": "markieren",
    "synthetic": "synthetisch",
    "text": "Text",
    "machine": "Maschine",
    "readable": "lesbar",
    "format": "Format",
    "remains": "bleibt",
    "detectable": "erkennbar",
    "after": "nach",
    "distribution": "Verteilung",
    "social": "sozial",
    "media": "Medien",
    "platforms": "Plattformen",
    "platform": "Plattform",
    "typical": "typisch",
    "caption": "Bildunterschrift",
    "comment": "Kommentar",
    "public": "öffentlich",
    "interest": "Interesse",
    "post": "Beitrag",
    "rather": "eher",
    "than": "als",
    "long": "lang",
    "report": "Bericht",
    "statistical": "statistisch",
    "watermarking": "Wasserzeichen",
    "changes": "ändert",
    "only": "nur",
    "sampling": "Stichprobe",
    "tokens": "Token",
    "token": "Token",
    "secret": "geheim",
    "green": "grün",
    "list": "Liste",
    "red": "rot",
    "during": "während",
    "generation": "Erzeugung",
    "detector": "Detektor",
    "knows": "kennt",
    "key": "Schlüssel",
    "count": "zählt",
    "without": "ohne",
    "original": "original",
    "prompt": "Eingabe",
    "model": "Modell",
    "weights": "Gewichte",
    "truncation": "Kürzung",
    "reduces": "verringert",
    "sample": "Stichprobe",
    "size": "Größe",
    "paraphrase": "Paraphrase",
    "translate": "übersetzen",
    "german": "deutsch",
    "spanish": "spanisch",
    "replaces": "ersetzt",
    "every": "jedes",
    "destroy": "zerstören",
    "signal": "Signal",
    "light": "leicht",
    "typos": "Tippfehler",
    "should": "sollte",
    "degrade": "verschlechtern",
    "score": "Wert",
    "full": "vollständig",
    "rewrite": "Umschreibung",
    "human": "menschlich",
    "review": "Prüfung",
    "visible": "sichtbar",
    "labels": "Kennzeichnungen",
    "necessary": "notwendig",
    "because": "weil",
    "invisible": "unsichtbar",
    "satisfy": "erfüllen",
    "clear": "klar",
    "duty": "Pflicht",
    "third": "dritte",
    "party": "Partei",
    "cannot": "kann nicht",
    "verify": "prüfen",
    "never": "niemals",
    "disclosed": "offengelegt",
    "the": "der",
    "and": "und",
    "of": "von",
    "to": "zu",
    "a": "ein",
    "in": "in",
    "on": "auf",
    "for": "für",
    "or": "oder",
    "is": "ist",
    "are": "sind",
    "this": "dies",
    "that": "dass",
    "with": "mit",
}

EN_ES = {
    "article": "artículo",
    "european": "europeo",
    "union": "unión",
    "act": "ley",
    "requires": "exige",
    "providers": "proveedores",
    "provider": "proveedor",
    "synthetic": "sintético",
    "text": "texto",
    "machine": "máquina",
    "readable": "legible",
    "format": "formato",
    "detectable": "detectable",
    "social": "social",
    "media": "medios",
    "platforms": "plataformas",
    "platform": "plataforma",
    "caption": "leyenda",
    "comment": "comentario",
    "public": "público",
    "interest": "interés",
    "post": "publicación",
    "statistical": "estadístico",
    "watermarking": "marca de agua",
    "sampling": "muestreo",
    "tokens": "tokens",
    "secret": "secreto",
    "green": "verde",
    "list": "lista",
    "red": "rojo",
    "generation": "generación",
    "detector": "detector",
    "key": "clave",
    "truncation": "truncamiento",
    "paraphrase": "paráfrasis",
    "german": "alemán",
    "spanish": "español",
    "signal": "señal",
    "rewrite": "reescritura",
    "human": "humano",
    "visible": "visible",
    "labels": "etiquetas",
    "invisible": "invisible",
    "duty": "deber",
    "the": "el",
    "and": "y",
    "of": "de",
    "to": "a",
    "a": "un",
    "in": "en",
    "on": "en",
    "for": "para",
    "or": "o",
    "is": "es",
    "this": "este",
    "that": "que",
    "with": "con",
}

MODIFIERS = {
    "intentionally", "typically", "rather", "only", "therefore", "however",
    "ordinary", "secret", "statistical", "machine-readable", "high-entropy",
    "complementary", "visible", "invisible", "clear", "distinguishable",
    "public-interest", "platform-level", "light", "full", "original",
}

PARAPHRASE_MAP = {
    "however": "but",
    "therefore": "so",
    "because": "since",
    "requires": "needs",
    "remains": "stays",
    "reduces": "cuts",
    "replaces": "swaps",
    "destroy": "remove",
    "degrade": "weaken",
    "compute": "get",
    "report": "give",
    "mandates": "asks",
    "ensures": "makes sure",
}

KEYBOARD_NEIGHBOURS = {
    "a": "sqw", "b": "vgn", "c": "xvd", "d": "sfce", "e": "wrsd",
    "f": "dgrt", "g": "fhty", "h": "gjyu", "i": "ujko", "j": "hkui",
    "k": "jlio", "l": "kop", "m": "njk", "n": "bmh", "o": "iklp",
    "p": "ol", "q": "wa", "r": "etdf", "s": "adwe", "t": "ryfg",
    "u": "yihj", "v": "cb", "w": "qeas", "x": "zc", "y": "tugh", "z": "x",
}


# ---------------------------------------------------------------------------
# Transforms
# ---------------------------------------------------------------------------

def xf_verbatim(text: str, rng: random.Random) -> str:
    return text


def xf_char_substitution(text: str, rng: random.Random, rate: float = 0.06) -> str:
    chars = list(text)
    letters = [i for i, ch in enumerate(chars) if ch.isalpha()]
    n_flip = max(1, int(len(letters) * rate))
    for i in rng.sample(letters, k=min(n_flip, len(letters))):
        ch = chars[i]
        nbs = KEYBOARD_NEIGHBOURS.get(ch.lower(), "e")
        repl = rng.choice(nbs)
        chars[i] = repl.upper() if ch.isupper() else repl
    return "".join(chars)


def xf_word_substitution(text: str, rng: random.Random, rate: float = 0.12) -> str:
    tokens = tokenize(text)
    word_idx = [i for i, t in enumerate(tokens) if t.isalpha() and len(t) > 3]
    n_sub = max(1, int(len(word_idx) * rate))
    fillers = ["thing", "stuff", "maybe", "kind", "really", "pretty", "somewhat", "extra"]
    for i in rng.sample(word_idx, k=min(n_sub, len(word_idx))):
        tokens[i] = rng.choice(fillers)
    return detokenize(tokens)


def xf_caption_truncation(text: str, rng: random.Random, n_words: int = 50) -> str:
    words = text.split()
    return " ".join(words[:n_words])


def xf_paraphrase(text: str, rng: random.Random) -> str:
    """Heavier than synonym-swap: drop modifiers and rewrite ~40% of content words."""
    tokens = tokenize(text)
    fillers = ["thing", "point", "issue", "case", "idea", "move", "shift", "change"]
    kept: list[str] = []
    for tok in tokens:
        low = tok.lower()
        if low in MODIFIERS and rng.random() < 0.9:
            continue
        if low in PARAPHRASE_MAP and rng.random() < 0.85:
            repl = PARAPHRASE_MAP[low]
            kept.append(repl[:1].upper() + repl[1:] if tok[:1].isupper() else repl)
            continue
        if tok.isalpha() and len(tok) > 4 and rng.random() < 0.40:
            kept.append(rng.choice(fillers))
            continue
        kept.append(tok)
    return detokenize(kept)


def _surface_case(original: str, mapped: str) -> str:
    if original.isupper():
        return mapped.upper()
    if original[:1].isupper():
        return mapped[:1].upper() + mapped[1:]
    return mapped


def _pseudo_mt_token(word: str, table: dict[str, str], suffixes: tuple[str, ...]) -> str:
    """Every alphabetic token changes: glossary hit or deterministic target-looking suffix."""
    mapped = table.get(word.lower())
    if mapped is not None:
        return _surface_case(word, mapped)
    if not word.isalpha():
        return word
    digest = sum(ord(c) for c in word.lower())
    suffix = suffixes[digest % len(suffixes)]
    stem = word[: max(2, len(word) // 2)]
    return _surface_case(word, stem + suffix)


def _glossary_translate(text: str, table: dict[str, str], suffixes: tuple[str, ...]) -> str:
    return re.sub(
        r"[A-Za-z']+",
        lambda m: _pseudo_mt_token(m.group(0), table, suffixes),
        text,
    )


def xf_translation_de(text: str, rng: random.Random) -> str:
    return _glossary_translate(text, EN_DE, ("ung", "heit", "lich", "isch", "keit"))


def xf_translation_es(text: str, rng: random.Random) -> str:
    return _glossary_translate(text, EN_ES, ("ción", "mente", "idad", "oso", "ar"))


def xf_emoji_hashtag_noise(text: str, rng: random.Random) -> str:
    emojis = ["🔥", "✅", "⚠️", "📣", "🧠", "📌"]
    tags = ["#AIAct", "#EU", "#transparency", "#SynthID", "#C2PA", "#Meta"]
    prefix = " ".join(rng.sample(emojis, k=3) + rng.sample(tags, k=3))
    suffix = " ".join(rng.sample(tags, k=2)) + " " + rng.choice(emojis)
    return f"{prefix} {text} {suffix}"


def xf_full_shuffle(text: str, rng: random.Random) -> str:
    words = text.split()
    rng.shuffle(words)
    return " ".join(words)


def xf_other_lm_rewrite(text: str, rng: random.Random) -> str:
    """Paste into a second model: resample under a different secret key."""
    return apply_watermark(
        text,
        secret_key="other-provider-not-claude",
        bias=2.5,
        rng_seed=rng.randint(0, 10_000),
        force_replace=True,
    )


def xf_severe_truncation(text: str, rng: random.Random) -> str:
    return xf_caption_truncation(text, rng, n_words=12)


TRANSFORMS: list[tuple[str, str, Callable[[str, random.Random], str]]] = [
    ("verbatim", "Copy-paste of watermarked text into a post", xf_verbatim),
    ("char_substitution", "Keyboard-neighbour typos (~6% of letters)", xf_char_substitution),
    ("word_substitution", "Casual lexical edits (~12% of content words)", xf_word_substitution),
    ("caption_truncation", "Mobile feed clip: first 50 words", xf_caption_truncation),
    ("severe_truncation", "Very short caption / snippet: first 12 words", xf_severe_truncation),
    ("paraphrase", "Drop modifiers + rewrite ~40% of content words", xf_paraphrase),
    ("translation_de", "EN→DE proxy for platform auto-translate (all tokens change)", xf_translation_de),
    ("translation_es", "EN→ES proxy for platform auto-translate (all tokens change)", xf_translation_es),
    ("emoji_hashtag_noise", "Emoji/hashtag stuffing around an intact span", xf_emoji_hashtag_noise),
    ("other_lm_rewrite", "Rewrite with a different keyed sampler (paste into another LLM)", xf_other_lm_rewrite),
    ("full_shuffle", "Adversarial bag-of-words permutation", xf_full_shuffle),
]


# ---------------------------------------------------------------------------
# Comparison matrix (Week 2 empirical vs Week 3 simulation)
# ---------------------------------------------------------------------------

COMPARISON_MATRIX: list[dict[str, str]] = [
    {
        "dimension": "Carrier",
        "c2pa": "Hard-bound manifest in the file container (JUMBF / caBX / BMFF)",
        "synthid_text": "Token identities in the UTF-8 string (no sidecar)",
    },
    {
        "dimension": "Meta image CDN (resize + JPEG/WebP + APP strip)",
        "c2pa": "0% survival (Week 2: Facebook, Instagram, WhatsApp)",
        "synthid_text": "Not applicable — text does not traverse that pipeline",
    },
    {
        "dimension": "Verbatim copy-paste / WhatsApp text forward",
        "c2pa": "N/A for pure text posts",
        "synthid_text": "Signal preserved (z remains above threshold if T is large)",
    },
    {
        "dimension": "Truncation / caption clip",
        "c2pa": "Any byte change invalidates c2pa.hash.data",
        "synthid_text": "Graceful power loss ∝ √T; short captions may fall below z=3",
    },
    {
        "dimension": "Light edit / typo",
        "c2pa": "Cliff-edge invalidation",
        "synthid_text": "Partial degradation; remaining aligned n-grams still score",
    },
    {
        "dimension": "Paraphrase / other-LM rewrite",
        "c2pa": "N/A",
        "synthid_text": "Severe to total loss of green-list alignment",
    },
    {
        "dimension": "Platform machine translation",
        "c2pa": "N/A",
        "synthid_text": "Total loss (new tokens, new language, broken context hashes)",
    },
    {
        "dimension": "Third-party verifiability",
        "c2pa": "Yes, given a public trust list",
        "synthid_text": "No — requires the provider key or a detection API",
    },
    {
        "dimension": "Art. 50(2) robustness/reliability on Meta",
        "c2pa": "Fails for images at ingestion",
        "synthid_text": "Holds for intact text; fails rewrite/MT; length-dependent",
    },
    {
        "dimension": "Art. 50(5) first-exposure disclosure",
        "c2pa": "Credential UI rarely surfaced in FB/IG feeds",
        "synthid_text": "Invisible by design — cannot satisfy 50(5) alone",
    },
]


@dataclass
class TransformResult:
    name: str
    description: str
    n_chars: int
    scored_tokens: int
    green_count: int
    green_proportion: float
    z_score: float
    p_value: float
    above_threshold: bool
    snippet: str


def evaluate_span(name: str, description: str, text: str, secret_key: str) -> TransformResult:
    det = detect_watermark(text, secret_key=secret_key)
    snippet = re.sub(r"\s+", " ", text).strip()
    if len(snippet) > 160:
        snippet = snippet[:157] + "..."
    return TransformResult(
        name=name,
        description=description,
        n_chars=len(text),
        scored_tokens=int(det["scored_tokens"]),
        green_count=int(det["green_count"]),
        green_proportion=float(det["green_proportion"]),
        z_score=float(det["z_score"]),
        p_value=float(det["p_value"]),
        above_threshold=bool(det["z_score"] > Z_THRESHOLD),
        snippet=snippet,
    )


def print_table(rows: list[TransformResult]) -> None:
    print("\n" + "=" * 96)
    print(f"{'transform':<22} {'T':>5} {'green':>7} {'rate':>7} {'z':>8} {'p':>11} {'z>3':>5}")
    print("-" * 96)
    for r in rows:
        flag = "YES" if r.above_threshold else "no"
        print(
            f"{r.name:<22} {r.scored_tokens:>5} {r.green_count:>7} "
            f"{r.green_proportion:>7.3f} {r.z_score:>8.3f} {r.p_value:>11.2e} {flag:>5}"
        )
    print("=" * 96)


def print_comparison_matrix() -> None:
    print("\nC2PA image provenance (Week 2) vs statistical text watermark (Week 3)")
    print("-" * 96)
    for row in COMPARISON_MATRIX:
        print(f"\n{row['dimension']}")
        print(f"  C2PA          : {row['c2pa']}")
        print(f"  SynthID-Text  : {row['synthid_text']}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Social-media watermark robustness harness (Week 3).")
    parser.add_argument("--key", type=str, default="THWS_Thesis_Secret_Key_2026")
    parser.add_argument("--bias", type=float, default=2.5)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--json", type=str, default=None, help="Write a JSON report to this path.")
    args = parser.parse_args()

    rng = random.Random(args.seed)

    print("=" * 96)
    print("Social-media text watermark stress test")
    print("THWS Master's thesis · Week 3 · detection threshold z > 3.0")
    print("=" * 96)

    watermarked = apply_watermark(WATERMARK_SOURCE, secret_key=args.key, bias=args.bias, rng_seed=args.seed)
    human = evaluate_span("human_control", "Unwatermarked prose (null)", HUMAN_CONTROL, args.key)
    baseline = evaluate_span("watermarked_source", "Green-list rewrite, unmodified", watermarked, args.key)

    print(f"\nHuman control     z={human.z_score:.3f}  detected={human.above_threshold}")
    print(f"Watermarked base  z={baseline.z_score:.3f}  detected={baseline.above_threshold}")
    if not baseline.above_threshold:
        print("ERROR: baseline watermarked text did not exceed z>3. Increase --bias.", file=sys.stderr)
        return 2

    rows = [human, baseline]
    for name, desc, fn in TRANSFORMS:
        transformed = fn(watermarked, rng)
        rows.append(evaluate_span(name, desc, transformed, args.key))

    print_table(rows)

    survivors = [r.name for r in rows if r.name not in {"human_control"} and r.above_threshold]
    failures = [r.name for r in rows if r.name not in {"human_control"} and not r.above_threshold]
    print(f"\nSurvived z>3 : {', '.join(survivors) or '(none)'}")
    print(f"Fell below   : {', '.join(failures) or '(none)'}")
    print(
        "\nReading note: EN→DE/ES here rewrites every alphabetic token (glossary + "
        "pseudo-suffix). Real platform MT also reorders syntax, so field damage is "
        "at least this severe. Light paraphrase on a *long* high-green span can "
        "still clear z>3; that is Kirchenbauer's edit-fraction × √T behaviour, "
        "not a harness bug."
    )

    print_comparison_matrix()

    report = {
        "thesis": "AI Transparency in the Wild",
        "week": 3,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "parameters": {
            "secret_key_name": "THWS_Thesis_Secret_Key_2026" if args.key == "THWS_Thesis_Secret_Key_2026" else "custom",
            "bias": args.bias,
            "z_threshold": Z_THRESHOLD,
            "seed": args.seed,
        },
        "results": [asdict(r) | {"p_value": float(r.p_value)} for r in rows],
        "comparison_matrix": COMPARISON_MATRIX,
        "interpretation": {
            "week2_c2pa": "Hard-bound image credentials showed 0% survival under Meta ingestion.",
            "week3_text": (
                "Statistical watermarks are not container metadata: verbatim posts keep the "
                "signal, truncation costs power, paraphrase/typos degrade it, and translation "
                "or shuffle behave like a rewrite."
            ),
        },
    }

    if args.json:
        out = Path(args.json)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(f"\nWrote JSON report → {out}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
