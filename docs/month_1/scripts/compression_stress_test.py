#!/usr/bin/env python3
"""
compression_stress_test.py — Meta-Style Compression & C2PA Resilience Test Harness
===================================================================================

Master's Thesis: "AI Transparency in the Wild"
Author: Pratyay Mondal · THWS · M.Sc. Artificial Intelligence
Week 2 Deliverable — Compression Survivability Testing

Purpose:
    Simulates the aggressive image processing pipelines used by Meta's
    platforms (Facebook, Instagram, WhatsApp) to empirically determine
    whether C2PA manifests survive social media upload transformations.

    For each simulated pipeline, the script:
      1. Applies platform-specific transformations (resize, re-compress,
         format conversion, metadata stripping)
      2. Runs C2PA manifest inspection on the transformed output
      3. Records whether the manifest survived, was invalidated, or was stripped
      4. Generates a structured JSON report and human-readable summary

Dependencies:
    pip install c2pa-python Pillow opencv-python-headless

Usage:
    python compression_stress_test.py <signed_image_path>
    python compression_stress_test.py <signed_image_path> --output-dir ./results
    python compression_stress_test.py <signed_image_path> --platforms facebook instagram whatsapp
"""

import argparse
import json
import os
import shutil
import sys
import time
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    from PIL import Image, ImageFilter
except ImportError:
    print("ERROR: Pillow not installed. Run: pip install Pillow")
    sys.exit(1)

# Import the inspector module from the same directory
SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))
from c2pa_inspector import inspect_c2pa_manifest


# ---------------------------------------------------------------------------
# Platform Pipeline Definitions
# ---------------------------------------------------------------------------

@dataclass
class PipelineStep:
    """A single transformation step in a simulated upload pipeline."""
    name: str
    description: str
    transform_fn: str  # Name of the transform function to call
    params: dict = field(default_factory=dict)


@dataclass
class PlatformPipeline:
    """Full simulation of a social media platform's image processing pipeline."""
    platform: str
    variant: str
    description: str
    output_format: str  # "JPEG" or "WEBP"
    steps: list[PipelineStep] = field(default_factory=list)


def define_platform_pipelines() -> list[PlatformPipeline]:
    """
    Define the empirically-derived media processing pipelines for each
    Meta platform variant. Parameters are based on reverse-engineering
    of actual platform behaviour as documented in thesis research notes.
    """
    pipelines = []

    # ── Facebook Feed ──────────────────────────────────────────────────
    pipelines.append(PlatformPipeline(
        platform="Facebook",
        variant="feed_jpeg_high",
        description="Facebook Feed — JPEG high quality (Q=85, max 2048px)",
        output_format="JPEG",
        steps=[
            PipelineStep("resize", "Downscale to max 2048px longest edge",
                         "resize_max_dimension", {"max_dim": 2048}),
            PipelineStep("strip_metadata", "Strip all metadata (EXIF, JUMBF, XMP)",
                         "strip_all_metadata", {}),
            PipelineStep("recompress", "JPEG re-encode at Q=85",
                         "compress_jpeg", {"quality": 85}),
        ],
    ))

    pipelines.append(PlatformPipeline(
        platform="Facebook",
        variant="feed_jpeg_low",
        description="Facebook Feed — JPEG lower quality (Q=71, max 2048px)",
        output_format="JPEG",
        steps=[
            PipelineStep("resize", "Downscale to max 2048px longest edge",
                         "resize_max_dimension", {"max_dim": 2048}),
            PipelineStep("strip_metadata", "Strip all metadata",
                         "strip_all_metadata", {}),
            PipelineStep("recompress", "JPEG re-encode at Q=71",
                         "compress_jpeg", {"quality": 71}),
        ],
    ))

    pipelines.append(PlatformPipeline(
        platform="Facebook",
        variant="feed_webp",
        description="Facebook Feed — WebP conversion (Q=80, max 2048px)",
        output_format="WEBP",
        steps=[
            PipelineStep("resize", "Downscale to max 2048px longest edge",
                         "resize_max_dimension", {"max_dim": 2048}),
            PipelineStep("strip_metadata", "Strip all metadata",
                         "strip_all_metadata", {}),
            PipelineStep("convert_webp", "Convert to WebP at Q=80",
                         "compress_webp", {"quality": 80}),
        ],
    ))

    # ── Instagram Feed ─────────────────────────────────────────────────
    pipelines.append(PlatformPipeline(
        platform="Instagram",
        variant="feed_standard",
        description="Instagram Feed — Standard (Q=80, max 1080px width)",
        output_format="JPEG",
        steps=[
            PipelineStep("resize", "Downscale to max 1080px width",
                         "resize_max_width", {"max_width": 1080}),
            PipelineStep("strip_metadata", "Full metadata strip",
                         "strip_all_metadata", {}),
            PipelineStep("recompress", "JPEG re-encode at Q=80",
                         "compress_jpeg", {"quality": 80}),
        ],
    ))

    pipelines.append(PlatformPipeline(
        platform="Instagram",
        variant="story",
        description="Instagram Story — Aggressive (Q=75, resize to 1080x1920)",
        output_format="JPEG",
        steps=[
            PipelineStep("resize", "Resize/crop to 1080x1920 (9:16)",
                         "resize_and_crop", {"target_width": 1080, "target_height": 1920}),
            PipelineStep("strip_metadata", "Full metadata strip",
                         "strip_all_metadata", {}),
            PipelineStep("recompress", "JPEG re-encode at Q=75",
                         "compress_jpeg", {"quality": 75}),
        ],
    ))

    pipelines.append(PlatformPipeline(
        platform="Instagram",
        variant="feed_webp",
        description="Instagram Feed — WebP (Q=75, max 1080px width)",
        output_format="WEBP",
        steps=[
            PipelineStep("resize", "Downscale to max 1080px width",
                         "resize_max_width", {"max_width": 1080}),
            PipelineStep("strip_metadata", "Full metadata strip",
                         "strip_all_metadata", {}),
            PipelineStep("convert_webp", "Convert to WebP at Q=75",
                         "compress_webp", {"quality": 75}),
        ],
    ))

    # ── WhatsApp ───────────────────────────────────────────────────────
    pipelines.append(PlatformPipeline(
        platform="WhatsApp",
        variant="standard",
        description="WhatsApp Standard — Aggressive client-side (Q=60, max 1600px)",
        output_format="JPEG",
        steps=[
            PipelineStep("resize", "Downscale to max 1600px longest edge",
                         "resize_max_dimension", {"max_dim": 1600}),
            PipelineStep("strip_metadata", "Aggressive metadata strip",
                         "strip_all_metadata", {}),
            PipelineStep("recompress", "JPEG re-encode at Q=60",
                         "compress_jpeg", {"quality": 60}),
        ],
    ))

    pipelines.append(PlatformPipeline(
        platform="WhatsApp",
        variant="hd",
        description="WhatsApp HD — Higher quality (Q=75, max 2560px)",
        output_format="JPEG",
        steps=[
            PipelineStep("resize", "Downscale to max 2560px longest edge",
                         "resize_max_dimension", {"max_dim": 2560}),
            PipelineStep("strip_metadata", "Full metadata strip",
                         "strip_all_metadata", {}),
            PipelineStep("recompress", "JPEG re-encode at Q=75",
                         "compress_jpeg", {"quality": 75}),
        ],
    ))

    # ── Controlled Baselines (for calibration) ─────────────────────────
    pipelines.append(PlatformPipeline(
        platform="Baseline",
        variant="no_transform",
        description="Baseline — Copy with no transformation (control)",
        output_format="JPEG",
        steps=[
            PipelineStep("copy", "Byte-for-byte copy (no transformation)",
                         "passthrough_copy", {}),
        ],
    ))

    pipelines.append(PlatformPipeline(
        platform="Baseline",
        variant="recompress_only_q95",
        description="Baseline — JPEG re-compress at Q=95 (near-lossless, no metadata strip)",
        output_format="JPEG",
        steps=[
            PipelineStep("recompress", "JPEG Q=95 without metadata strip",
                         "compress_jpeg_preserve_metadata", {"quality": 95}),
        ],
    ))

    pipelines.append(PlatformPipeline(
        platform="Baseline",
        variant="strip_only",
        description="Baseline — Metadata strip only (no re-compression)",
        output_format="JPEG",
        steps=[
            PipelineStep("strip_metadata", "Strip metadata only",
                         "strip_all_metadata", {}),
            PipelineStep("save", "Re-save JPEG at Q=100",
                         "compress_jpeg", {"quality": 100}),
        ],
    ))

    return pipelines


# ---------------------------------------------------------------------------
# Transform Functions
# ---------------------------------------------------------------------------

class ImageTransforms:
    """
    Collection of image transformation functions simulating social media
    platform upload pipelines. Each function operates on a PIL Image object.
    """

    def __init__(self, source_path: Path, output_dir: Path):
        self.source_path = source_path
        self.output_dir = output_dir
        self._current_image: Image.Image | None = None

    def load(self) -> Image.Image:
        """Load the source image into memory."""
        self._current_image = Image.open(self.source_path).convert("RGB")
        return self._current_image

    @property
    def image(self) -> Image.Image:
        if self._current_image is None:
            return self.load()
        return self._current_image

    @image.setter
    def image(self, img: Image.Image):
        self._current_image = img

    def resize_max_dimension(self, max_dim: int) -> None:
        """Resize so that the longest edge is at most max_dim pixels."""
        w, h = self.image.size
        if max(w, h) <= max_dim:
            return  # Already within bounds
        scale = max_dim / max(w, h)
        new_w = int(w * scale)
        new_h = int(h * scale)
        self.image = self.image.resize((new_w, new_h), Image.LANCZOS)

    def resize_max_width(self, max_width: int) -> None:
        """Resize so that width is at most max_width pixels, preserving aspect ratio."""
        w, h = self.image.size
        if w <= max_width:
            return
        scale = max_width / w
        new_w = max_width
        new_h = int(h * scale)
        self.image = self.image.resize((new_w, new_h), Image.LANCZOS)

    def resize_and_crop(self, target_width: int, target_height: int) -> None:
        """Resize and center-crop to exact target dimensions (e.g., 1080x1920 for Stories)."""
        target_ratio = target_width / target_height
        w, h = self.image.size
        current_ratio = w / h

        if current_ratio > target_ratio:
            # Image is wider than target — crop width
            new_h = h
            new_w = int(h * target_ratio)
            left = (w - new_w) // 2
            self.image = self.image.crop((left, 0, left + new_w, new_h))
        else:
            # Image is taller than target — crop height
            new_w = w
            new_h = int(w / target_ratio)
            top = (h - new_h) // 2
            self.image = self.image.crop((0, top, new_w, top + new_h))

        self.image = self.image.resize((target_width, target_height), Image.LANCZOS)

    def strip_all_metadata(self) -> None:
        """
        Strip ALL metadata by re-creating the image from raw pixel data.
        This simulates what social media CDNs do: decode → re-encode from scratch.
        The new image has no EXIF, no XMP, no JUMBF — nothing but pixels.
        """
        # Create a fresh image from raw pixel data — no metadata carries over
        stripped = Image.frombytes("RGB", self.image.size, self.image.convert("RGB").tobytes())
        self.image = stripped

    def compress_jpeg(self, quality: int) -> Path:
        """Save as JPEG at the specified quality level."""
        return self._save("JPEG", quality=quality, suffix=".jpg")

    def compress_jpeg_preserve_metadata(self, quality: int) -> Path:
        """
        Re-compress as JPEG but attempt to preserve metadata.
        This tests whether re-compression alone (without stripping) breaks C2PA.
        """
        # Load directly from source to preserve all metadata in the file
        output_path = self.output_dir / f"preserved_q{quality}.jpg"
        original = Image.open(self.source_path)

        # Get EXIF data if present
        exif_data = original.info.get("exif", b"")

        original_rgb = original.convert("RGB")
        if exif_data:
            original_rgb.save(str(output_path), "JPEG", quality=quality, exif=exif_data)
        else:
            original_rgb.save(str(output_path), "JPEG", quality=quality)

        return output_path

    def compress_webp(self, quality: int) -> Path:
        """Convert and save as WebP at the specified quality level."""
        return self._save("WEBP", quality=quality, suffix=".webp")

    def passthrough_copy(self) -> Path:
        """Byte-for-byte copy of the source file (baseline control)."""
        output_path = self.output_dir / f"passthrough{self.source_path.suffix}"
        shutil.copy2(self.source_path, output_path)
        return output_path

    def _save(self, fmt: str, quality: int, suffix: str) -> Path:
        """Save the current image to disk in the specified format."""
        output_path = self.output_dir / f"output{suffix}"
        self.image.save(str(output_path), fmt, quality=quality)
        return output_path


# ---------------------------------------------------------------------------
# Test Harness Engine
# ---------------------------------------------------------------------------

@dataclass
class TestResult:
    """Result of a single pipeline simulation test."""
    pipeline_platform: str
    pipeline_variant: str
    pipeline_description: str
    input_file: str
    input_dimensions: tuple[int, int]
    input_size_bytes: int
    output_file: str
    output_dimensions: tuple[int, int] | None
    output_size_bytes: int
    output_format: str
    c2pa_survived: bool
    c2pa_validation_status: str
    c2pa_errors: list[str]
    size_reduction_pct: float
    steps_applied: list[str]
    execution_time_ms: float


def run_pipeline(
    source_path: Path,
    pipeline: PlatformPipeline,
    output_base_dir: Path,
) -> TestResult:
    """
    Execute a single platform pipeline simulation and test C2PA survival.

    Args:
        source_path: Path to the C2PA-signed source image.
        pipeline: The platform pipeline configuration to simulate.
        output_base_dir: Base directory for test outputs.

    Returns:
        TestResult with full details of the transformation and C2PA check.
    """
    start_time = time.monotonic()

    # Create output directory for this specific pipeline
    pipeline_dir = output_base_dir / f"{pipeline.platform.lower()}_{pipeline.variant}"
    pipeline_dir.mkdir(parents=True, exist_ok=True)

    # Initialize transformer
    transformer = ImageTransforms(source_path, pipeline_dir)
    transformer.load()

    input_size = source_path.stat().st_size
    input_dims = transformer.image.size

    # Execute pipeline steps
    output_path = None
    steps_applied = []

    for step in pipeline.steps:
        fn_name = step.transform_fn

        if fn_name == "passthrough_copy":
            output_path = transformer.passthrough_copy()
            steps_applied.append(f"{step.name}: {step.description}")
            continue

        if fn_name == "compress_jpeg_preserve_metadata":
            output_path = transformer.compress_jpeg_preserve_metadata(**step.params)
            steps_applied.append(f"{step.name}: {step.description}")
            continue

        # Get the method from the transformer
        method = getattr(transformer, fn_name, None)
        if method is None:
            raise ValueError(f"Unknown transform function: {fn_name}")

        result = method(**step.params)

        # If the method returns a path, that's our output file
        if isinstance(result, Path):
            output_path = result

        steps_applied.append(f"{step.name}: {step.description}")

    # If no output path was set (e.g., only resize + strip), save now
    if output_path is None:
        ext = ".webp" if pipeline.output_format == "WEBP" else ".jpg"
        output_path = pipeline_dir / f"output{ext}"
        fmt = pipeline.output_format
        transformer.image.save(str(output_path), fmt, quality=75)

    # Get output file info
    output_size = output_path.stat().st_size
    try:
        out_img = Image.open(output_path)
        output_dims = out_img.size
        out_img.close()
    except Exception:
        output_dims = None

    size_reduction = ((input_size - output_size) / input_size) * 100

    # --- Run C2PA inspection on the transformed file ---
    c2pa_report = inspect_c2pa_manifest(str(output_path))

    elapsed_ms = (time.monotonic() - start_time) * 1000

    return TestResult(
        pipeline_platform=pipeline.platform,
        pipeline_variant=pipeline.variant,
        pipeline_description=pipeline.description,
        input_file=str(source_path),
        input_dimensions=input_dims,
        input_size_bytes=input_size,
        output_file=str(output_path),
        output_dimensions=output_dims,
        output_size_bytes=output_size,
        output_format=pipeline.output_format,
        c2pa_survived=c2pa_report["c2pa_present"],
        c2pa_validation_status=c2pa_report["validation_status"],
        c2pa_errors=c2pa_report["errors"],
        size_reduction_pct=round(size_reduction, 1),
        steps_applied=steps_applied,
        execution_time_ms=round(elapsed_ms, 1),
    )


# ---------------------------------------------------------------------------
# Report Generation
# ---------------------------------------------------------------------------

def generate_report(
    source_path: Path,
    results: list[TestResult],
) -> dict[str, Any]:
    """Generate a comprehensive structured report from all test results."""

    # Inspect the source file first
    source_report = inspect_c2pa_manifest(str(source_path))

    report = {
        "report_metadata": {
            "tool": "compression_stress_test.py",
            "version": "1.0.0",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "thesis": "AI Transparency in the Wild",
            "author": "Pratyay Mondal",
        },
        "source_file": {
            "path": str(source_path),
            "name": source_path.name,
            "size_bytes": source_path.stat().st_size,
            "c2pa_present": source_report["c2pa_present"],
            "c2pa_validation_status": source_report["validation_status"],
            "active_manifest": source_report.get("active_manifest"),
            "signature_info": source_report.get("signature_info"),
        },
        "test_results": [asdict(r) for r in results],
        "summary": {
            "total_tests": len(results),
            "c2pa_survived_count": sum(1 for r in results if r.c2pa_survived),
            "c2pa_destroyed_count": sum(1 for r in results if not r.c2pa_survived),
            "survival_rate_pct": round(
                (sum(1 for r in results if r.c2pa_survived) / len(results)) * 100, 1
            ) if results else 0,
            "by_platform": {},
        },
    }

    # Group results by platform
    platforms: dict[str, list[TestResult]] = {}
    for r in results:
        platforms.setdefault(r.pipeline_platform, []).append(r)

    for platform, platform_results in platforms.items():
        survived = sum(1 for r in platform_results if r.c2pa_survived)
        total = len(platform_results)
        report["summary"]["by_platform"][platform] = {
            "total_tests": total,
            "c2pa_survived": survived,
            "c2pa_destroyed": total - survived,
            "survival_rate_pct": round((survived / total) * 100, 1) if total else 0,
        }

    return report


def print_summary_table(results: list[TestResult]) -> None:
    """Print a human-readable summary table of all test results."""
    print("\n" + "=" * 100)
    print("C2PA COMPRESSION SURVIVABILITY TEST RESULTS")
    print("=" * 100)
    print(f"{'Platform':<12} {'Variant':<20} {'Dims':<14} {'Size Δ':>8} {'C2PA':>8} {'Status':<20}")
    print("-" * 100)

    for r in results:
        dims = f"{r.output_dimensions[0]}x{r.output_dimensions[1]}" if r.output_dimensions else "N/A"
        c2pa_icon = "✅" if r.c2pa_survived else "❌"
        size_delta = f"-{r.size_reduction_pct}%"
        print(
            f"{r.pipeline_platform:<12} "
            f"{r.pipeline_variant:<20} "
            f"{dims:<14} "
            f"{size_delta:>8} "
            f"{c2pa_icon:>8} "
            f"{r.c2pa_validation_status:<20}"
        )

    print("=" * 100)

    # Summary statistics
    survived = sum(1 for r in results if r.c2pa_survived)
    total = len(results)
    print(f"\n📊 SUMMARY: {survived}/{total} pipelines preserved C2PA manifest "
          f"({round(survived/total*100, 1) if total else 0}% survival rate)")

    # Platform breakdown
    platforms: dict[str, list[TestResult]] = {}
    for r in results:
        platforms.setdefault(r.pipeline_platform, []).append(r)

    print("\n📋 BY PLATFORM:")
    for platform, pr in sorted(platforms.items()):
        ps = sum(1 for r in pr if r.c2pa_survived)
        pt = len(pr)
        icon = "✅" if ps == pt else "⚠️" if ps > 0 else "❌"
        print(f"   {icon} {platform}: {ps}/{pt} survived")

    if survived == 0 or (survived > 0 and all(
        r.pipeline_platform == "Baseline" for r in results if r.c2pa_survived
    )):
        print("\n" + "=" * 100)
        print("🔬 THESIS CONCLUSION: C2PA hard-binding manifests are DESTROYED by all")
        print("   simulated Meta platform upload pipelines. Only the byte-for-byte")
        print("   passthrough baseline preserves the manifest. This empirically")
        print("   confirms that C2PA alone cannot fulfil Art. 50(2)'s machine-readable")
        print("   marking requirement on social media — complementary mechanisms")
        print("   (invisible watermarks, statistical text watermarks) are required.")
        print("=" * 100)


# ---------------------------------------------------------------------------
# CLI Entry Point
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Meta-Style Compression & C2PA Resilience Test Harness",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    python compression_stress_test.py signed_image.jpg
    python compression_stress_test.py signed_image.jpg --output-dir ./test_results
    python compression_stress_test.py signed_image.jpg --platforms facebook instagram
        """,
    )
    parser.add_argument("file", help="Path to a C2PA-signed image to test")
    parser.add_argument(
        "--output-dir", "-o",
        default=None,
        help="Directory for test outputs (default: docs/month_1/test_results)",
    )
    parser.add_argument(
        "--platforms", "-p",
        nargs="*",
        default=None,
        help="Filter to specific platforms (facebook, instagram, whatsapp, baseline)",
    )
    parser.add_argument(
        "--report", "-r",
        default=None,
        help="Path to save the JSON report (default: <output-dir>/compression_survival_report.json)",
    )

    args = parser.parse_args()

    source_path = Path(args.file).resolve()
    if not source_path.exists():
        print(f"ERROR: File not found: {source_path}")
        sys.exit(1)

    # Determine output directory
    if args.output_dir:
        output_dir = Path(args.output_dir).resolve()
    else:
        # Default to thesis test_results directory
        output_dir = Path(__file__).resolve().parent.parent / "test_results"
    output_dir.mkdir(parents=True, exist_ok=True)

    # --- Verify source has C2PA manifest ---
    print(f"\n🔍 Inspecting source file: {source_path.name}")
    source_report = inspect_c2pa_manifest(str(source_path))

    if source_report["c2pa_present"]:
        print(f"   ✅ C2PA manifest found — Status: {source_report['validation_status']}")
        if source_report["active_manifest"]:
            print(f"   Generator: {source_report['active_manifest']['claim_generator']}")
    else:
        print(f"   ⚠️  WARNING: Source file has NO C2PA manifest!")
        print(f"   The test will still run, but all results will show 'NO_MANIFEST'.")
        print(f"   For meaningful results, use a C2PA-signed image.")
        print(f"   Download samples from: https://contentcredentials.org/verify")

    # --- Load and filter pipelines ---
    all_pipelines = define_platform_pipelines()

    if args.platforms:
        filter_set = {p.lower() for p in args.platforms}
        pipelines = [p for p in all_pipelines if p.platform.lower() in filter_set]
        if not pipelines:
            print(f"ERROR: No matching platforms. Available: facebook, instagram, whatsapp, baseline")
            sys.exit(1)
    else:
        pipelines = all_pipelines

    # --- Run all pipeline simulations ---
    print(f"\n🚀 Running {len(pipelines)} pipeline simulations...\n")
    results: list[TestResult] = []

    for i, pipeline in enumerate(pipelines, 1):
        print(f"   [{i}/{len(pipelines)}] {pipeline.description}...", end=" ", flush=True)
        try:
            result = run_pipeline(source_path, pipeline, output_dir)
            results.append(result)
            icon = "✅" if result.c2pa_survived else "❌"
            print(f"{icon} ({result.execution_time_ms:.0f}ms)")
        except Exception as e:
            print(f"💥 ERROR: {e}")

    # --- Generate and save report ---
    report = generate_report(source_path, results)

    report_path = Path(args.report) if args.report else output_dir / "compression_survival_report.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, default=str)

    # --- Print summary ---
    print_summary_table(results)
    print(f"\n📁 Full JSON report saved to: {report_path}")
    print(f"📁 Transformed images saved to: {output_dir}/")


if __name__ == "__main__":
    main()
