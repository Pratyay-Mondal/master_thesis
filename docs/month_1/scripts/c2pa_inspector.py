#!/usr/bin/env python3
"""
c2pa_inspector.py — C2PA Manifest Extractor & Validation Utility
================================================================

Master's Thesis: "AI Transparency in the Wild"
Author: Pratyay Mondal · THWS · M.Sc. Artificial Intelligence
Week 2 Deliverable — Technical Media Provenance Deep Dive

Purpose:
    Reads a media file (JPEG, PNG, WebP, MP4, etc.), extracts its C2PA
    manifest store using the official c2pa-python SDK, and outputs a
    structured JSON report detailing:
      - Whether a C2PA manifest is present
      - Cryptographic signature status and certificate chain info
      - AI generation or editing assertions
      - Ingredient (provenance chain) references
      - Hard/soft binding assertion details

Dependencies:
    pip install c2pa-python

Usage:
    python c2pa_inspector.py <image_path>
    python c2pa_inspector.py <image_path> --output report.json
    python c2pa_inspector.py <image_path> --verbose
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    import c2pa
except ImportError:
    print("ERROR: c2pa-python not installed. Run: pip install c2pa-python")
    sys.exit(1)


# ---------------------------------------------------------------------------
# Core Inspection Logic
# ---------------------------------------------------------------------------

def inspect_c2pa_manifest(file_path: str) -> dict[str, Any]:
    """
    Read and parse the C2PA manifest store from a media file.

    Args:
        file_path: Absolute or relative path to the media asset.

    Returns:
        A structured dictionary containing the full inspection report.
    """
    file_path = Path(file_path).resolve()

    report: dict[str, Any] = {
        "inspection_metadata": {
            "tool": "c2pa_inspector.py",
            "version": "1.0.0",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "file_path": str(file_path),
            "file_name": file_path.name,
            "file_size_bytes": file_path.stat().st_size if file_path.exists() else None,
            "file_extension": file_path.suffix.lower(),
        },
        "c2pa_present": False,
        "manifest_store": None,
        "active_manifest": None,
        "signature_info": None,
        "assertions": {
            "ai_generation": [],
            "actions": [],
            "hard_binding": None,
            "soft_binding": None,
            "exif": None,
            "thumbnails": [],
            "other": [],
        },
        "ingredients": [],
        "validation_status": "NO_MANIFEST",
        "errors": [],
    }

    # --- Guard: File existence ---
    if not file_path.exists():
        report["errors"].append(f"File not found: {file_path}")
        report["validation_status"] = "FILE_NOT_FOUND"
        return report

    if not file_path.is_file():
        report["errors"].append(f"Path is not a file: {file_path}")
        report["validation_status"] = "INVALID_PATH"
        return report

    # --- Attempt C2PA manifest extraction ---
    try:
        manifest_store_json = None
        
        # Strategy 1: Using binary stream with try_create or Reader constructor (c2pa-python >= 0.38)
        try:
            with open(file_path, "rb") as f:
                if hasattr(c2pa.Reader, "try_create"):
                    reader = c2pa.Reader.try_create(stream=f)
                    if reader is None:
                        report["c2pa_present"] = False
                        report["validation_status"] = "NO_MANIFEST"
                        return report
                    manifest_store_json = reader.json()
                else:
                    reader = c2pa.Reader(stream=f)
                    manifest_store_json = reader.json()
        except AttributeError:
            pass
        except Exception as e:
            err_str = str(e)
            if "ManifestNotFound" in type(e).__name__ or "no JUMBF data found" in err_str.lower():
                report["c2pa_present"] = False
                report["validation_status"] = "NO_MANIFEST"
                return report
            # If try_create/stream failed for another reason, try fallback methods

        # Strategy 2: Reader.from_file or Reader(str(file_path)) (legacy versions)
        if manifest_store_json is None:
            if hasattr(c2pa.Reader, "from_file"):
                reader = getattr(c2pa.Reader, "from_file")(str(file_path))
                manifest_store_json = reader.json()
            else:
                try:
                    with open(file_path, "rb") as f:
                        reader = c2pa.Reader(stream=f)
                        manifest_store_json = reader.json()
                except Exception as e_inner:
                    if "ManifestNotFound" in type(e_inner).__name__ or "no JUMBF data found" in str(e_inner).lower():
                        report["c2pa_present"] = False
                        report["validation_status"] = "NO_MANIFEST"
                        return report
                    raise e_inner

        # Parse the manifest store JSON string into a dict
        if isinstance(manifest_store_json, str):
            manifest_store = json.loads(manifest_store_json)
        else:
            manifest_store = manifest_store_json

        report["c2pa_present"] = True
        report["manifest_store"] = manifest_store
        report["validation_status"] = "MANIFEST_FOUND"

        # Check overall validation state from c2pa validator
        val_state = manifest_store.get("validation_state")
        val_results = manifest_store.get("validation_results", {})
        active_val = val_results.get("activeManifest", {}) if isinstance(val_results, dict) else {}

        # --- Extract the active manifest ---
        active_manifest_id = manifest_store.get("active_manifest")
        manifests = manifest_store.get("manifests", {})

        if active_manifest_id and active_manifest_id in manifests:
            active = manifests[active_manifest_id]
            claim_gen_info = active.get("claim_generator_info", [])
            claim_gen_str = active.get("claim_generator")
            if not claim_gen_str and claim_gen_info and isinstance(claim_gen_info, list):
                first_info = claim_gen_info[0]
                if isinstance(first_info, dict):
                    claim_gen_str = f"{first_info.get('name', 'Unknown')}/{first_info.get('version', '')}"

            report["active_manifest"] = {
                "id": active_manifest_id,
                "claim_generator": claim_gen_str or "Unknown",
                "claim_generator_info": claim_gen_info,
                "title": active.get("title", ""),
                "format": active.get("format", ""),
            }

            # --- Extract signature info ---
            signature = active.get("signature_info", {})
            if signature:
                report["signature_info"] = {
                    "issuer": signature.get("issuer", signature.get("common_name", "Unknown")),
                    "cert_serial_number": signature.get("cert_serial_number", ""),
                    "time": signature.get("time", ""),
                    "alg": signature.get("alg", ""),
                }
                report["validation_status"] = "VALID_SIGNATURE"

            # Check validation results for cryptographic integrity vs trust anchor
            failures = active_val.get("failure", [])
            has_crypto_tampering = False
            for failure in failures:
                f_code = failure.get("code", "")
                f_exp = failure.get("explanation", "")
                if "untrusted" in f_code.lower():
                    # Untrusted signing cert (e.g. self-signed test cert) is NOT crypto tampering
                    report["errors"].append(f"Trust notice: {f_code} — {f_exp}")
                else:
                    has_crypto_tampering = True
                    report["errors"].append(f"Validation failure: {f_code} — {f_exp}")

            if has_crypto_tampering:
                report["validation_status"] = "SIGNATURE_INVALID"
            elif signature and (val_state == "Valid" or not has_crypto_tampering):
                report["validation_status"] = "VALID_SIGNATURE"

            # --- Parse assertions ---
            assertions = active.get("assertions", [])
            for assertion in assertions:
                label = assertion.get("label", "")
                data = assertion.get("data", {})

                if label.startswith("c2pa.actions"):
                    actions = data.get("actions", []) if isinstance(data, dict) else []
                    for action in actions:
                        action_type = action.get("action", "")
                        software_agent = action.get("softwareAgent", "")
                        digital_source_type = action.get("digitalSourceType", "")
                        params = action.get("parameters", {})

                        action_entry = {
                            "action": action_type,
                            "when": action.get("when", ""),
                            "softwareAgent": software_agent,
                            "digitalSourceType": digital_source_type,
                            "parameters": params,
                        }
                        report["assertions"]["actions"].append(action_entry)

                        # Check for AI-specific generation markers
                        # 1. IPTC Digital Source Type (C2PA v2 standard)
                        if "trainedAlgorithmicMedia" in digital_source_type or "compositeWithTrainedAlgorithmicMedia" in digital_source_type:
                            report["assertions"]["ai_generation"].append({
                                "source": "digitalSourceType",
                                "value": digital_source_type,
                                "action": action_type,
                                "softwareAgent": software_agent,
                            })
                        # 2. Known AI generation software agents
                        ai_agents = ["dall-e", "midjourney", "stable diffusion", "firefly", "imagen", "thesis_generator", "bing image creator", "flux"]
                        if any(agent in software_agent.lower() for agent in ai_agents):
                            report["assertions"]["ai_generation"].append({
                                "source": "softwareAgent",
                                "value": software_agent,
                                "action": action_type,
                            })
                        # 3. Parameter inputTo
                        if params and isinstance(params, dict):
                            if params.get("ingredient", {}).get("relationship", "") == "inputTo":
                                report["assertions"]["ai_generation"].append({
                                    "source": "action_parameter",
                                    "action": action_type,
                                    "details": params,
                                })

                elif label == "c2pa.ai_info" or label.startswith("c2pa.ai") or "algorithmic" in label.lower():
                    report["assertions"]["ai_generation"].append({
                        "source": "assertion_label",
                        "label": label,
                        "data": data,
                    })

                elif label == "c2pa.hash.data":
                    report["assertions"]["hard_binding"] = {
                        "label": label,
                        "algorithm": data.get("alg", "") if isinstance(data, dict) else "",
                        "hash_present": bool(data.get("hash")) if isinstance(data, dict) else False,
                        "exclusions": data.get("exclusions", []) if isinstance(data, dict) else [],
                    }

                elif label == "c2pa.soft-binding" or "soft" in label.lower():
                    report["assertions"]["soft_binding"] = {
                        "label": label,
                        "data": data,
                    }

                elif label.startswith("stds.exif"):
                    report["assertions"]["exif"] = {
                        "label": label,
                        "data": data,
                    }

                elif "thumbnail" in label.lower():
                    report["assertions"]["thumbnails"].append({
                        "label": label,
                        "format": data.get("format", "") if isinstance(data, dict) else "",
                    })

                else:
                    report["assertions"]["other"].append({
                        "label": label,
                        "data_keys": list(data.keys()) if isinstance(data, dict) else str(type(data)),
                    })

            # --- Parse ingredients (provenance chain) ---
            ingredients = active.get("ingredients", [])
            for ingredient in ingredients:
                report["ingredients"].append({
                    "title": ingredient.get("title", ""),
                    "format": ingredient.get("format", ""),
                    "relationship": ingredient.get("relationship", ""),
                    "manifest_id": ingredient.get("active_manifest", ""),
                    "validation_status": ingredient.get("validation_status", []),
                })

    except Exception as e:
        error_msg = str(e)
        if any(phrase in error_msg.lower() for phrase in [
            "no c2pa", "not found", "no manifest", "unsupported",
            "jumbf", "no content credentials", "manifestnotfound"
        ]):
            report["validation_status"] = "NO_MANIFEST"
            report["errors"].append(f"No C2PA manifest found: {error_msg}")
        else:
            report["validation_status"] = "READ_ERROR"
            report["errors"].append(f"Error reading C2PA data: {error_msg}")

    return report

    return report


# ---------------------------------------------------------------------------
# Human-Readable Summary
# ---------------------------------------------------------------------------

def format_summary(report: dict[str, Any]) -> str:
    """Generate a concise human-readable summary from the inspection report."""
    lines = []
    meta = report["inspection_metadata"]

    lines.append("=" * 72)
    lines.append("C2PA MANIFEST INSPECTION REPORT")
    lines.append("=" * 72)
    lines.append(f"File:      {meta['file_name']}")
    lines.append(f"Size:      {meta['file_size_bytes']:,} bytes" if meta['file_size_bytes'] else "Size:      N/A")
    lines.append(f"Format:    {meta['file_extension']}")
    lines.append(f"Scanned:   {meta['timestamp']}")
    lines.append("-" * 72)

    # --- C2PA Presence ---
    if report["c2pa_present"]:
        lines.append(f"✅ C2PA MANIFEST PRESENT")
        lines.append(f"   Validation: {report['validation_status']}")

        if report["active_manifest"]:
            am = report["active_manifest"]
            lines.append(f"   Generator:  {am['claim_generator']}")
            lines.append(f"   Title:      {am.get('title', 'N/A')}")

        if report["signature_info"]:
            sig = report["signature_info"]
            lines.append(f"   Issuer:     {sig['issuer']}")
            lines.append(f"   Algorithm:  {sig.get('alg', 'N/A')}")
            lines.append(f"   Signed at:  {sig.get('time', 'N/A')}")

        # --- AI Generation ---
        ai_assertions = report["assertions"]["ai_generation"]
        if ai_assertions:
            lines.append("")
            lines.append("   🤖 AI GENERATION ASSERTIONS:")
            for ai in ai_assertions:
                lines.append(f"      Source: {ai.get('source', 'unknown')}")
                if "data" in ai:
                    for k, v in ai["data"].items():
                        lines.append(f"      {k}: {v}")
        else:
            lines.append("   ℹ️  No AI generation assertions found")

        # --- Actions ---
        actions = report["assertions"]["actions"]
        if actions:
            lines.append("")
            lines.append("   📋 ACTIONS:")
            for act in actions:
                agent = act.get("softwareAgent", "")
                when = act.get("when", "")
                lines.append(f"      {act['action']}" +
                             (f" by {agent}" if agent else "") +
                             (f" at {when}" if when else ""))

        # --- Bindings ---
        if report["assertions"]["hard_binding"]:
            hb = report["assertions"]["hard_binding"]
            lines.append(f"\n   🔒 HARD BINDING: {hb['algorithm']} hash present")
        else:
            lines.append("\n   ⚠️  No hard binding assertion found")

        if report["assertions"]["soft_binding"]:
            lines.append("   🔓 SOFT BINDING: Present")
        else:
            lines.append("   ℹ️  No soft binding assertion found")

        # --- Ingredients ---
        if report["ingredients"]:
            lines.append("")
            lines.append("   🔗 PROVENANCE CHAIN (Ingredients):")
            for ing in report["ingredients"]:
                lines.append(f"      → {ing['title']} ({ing['format']}) [{ing['relationship']}]")

    else:
        lines.append("❌ NO C2PA MANIFEST FOUND")
        if report["errors"]:
            for err in report["errors"]:
                lines.append(f"   Reason: {err}")

    lines.append("=" * 72)
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# CLI Entry Point
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="C2PA Manifest Inspector — Extract and validate C2PA content credentials",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    python c2pa_inspector.py photo.jpg
    python c2pa_inspector.py photo.jpg --output report.json
    python c2pa_inspector.py photo.jpg --verbose --json
        """,
    )
    parser.add_argument("file", help="Path to the media file to inspect")
    parser.add_argument("--output", "-o", help="Write JSON report to file")
    parser.add_argument("--json", action="store_true", help="Output raw JSON to stdout")
    parser.add_argument("--verbose", "-v", action="store_true", help="Include full manifest store in output")

    args = parser.parse_args()

    # --- Run inspection ---
    report = inspect_c2pa_manifest(args.file)

    # --- Remove raw manifest store from output unless verbose ---
    if not args.verbose and report["manifest_store"]:
        output_report = {k: v for k, v in report.items() if k != "manifest_store"}
        output_report["manifest_store"] = "<omitted — use --verbose to include>"
    else:
        output_report = report

    # --- Output ---
    if args.json:
        print(json.dumps(output_report, indent=2, default=str))
    else:
        print(format_summary(report))
        if args.verbose and report["c2pa_present"]:
            print("\n--- RAW MANIFEST STORE JSON ---")
            print(json.dumps(report["manifest_store"], indent=2, default=str))

    # --- Save to file ---
    if args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(output_report, f, indent=2, default=str)
        print(f"\n📁 Report saved to: {output_path}")

    # --- Exit code: 0 if manifest found, 1 if not ---
    sys.exit(0 if report["c2pa_present"] else 1)


if __name__ == "__main__":
    main()
