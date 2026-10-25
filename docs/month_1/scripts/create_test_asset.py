#!/usr/bin/env python3
"""
create_test_asset.py — Generate a C2PA-Signed Test Image
=========================================================

Creates a synthetic test image and signs it with a C2PA manifest using
the c2pa-python SDK's Builder class, producing a self-signed asset
suitable for running the compression stress test harness.

Usage:
    python create_test_asset.py
    python create_test_asset.py --output custom_signed.jpg
"""

import json
import sys
from pathlib import Path

try:
    import c2pa
except ImportError:
    print("ERROR: c2pa-python not installed. Run: pip install c2pa-python")
    sys.exit(1)

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("ERROR: Pillow not installed. Run: pip install Pillow")
    sys.exit(1)


def create_synthetic_image(output_path: Path, width: int = 3000, height: int = 2000) -> None:
    """
    Create a synthetic test image with visual markers for compression testing.
    Uses gradients, text, and fine detail to make compression artifacts visible.
    """
    img = Image.new("RGB", (width, height))
    draw = ImageDraw.Draw(img)

    # Background gradient
    for y in range(height):
        r = int(30 + (y / height) * 100)
        g = int(60 + (y / height) * 80)
        b = int(120 + (y / height) * 135)
        draw.line([(0, y), (width, y)], fill=(r, g, b))

    # Grid pattern (makes compression artifacts very visible)
    for x in range(0, width, 50):
        draw.line([(x, 0), (x, height)], fill=(255, 255, 255, 40), width=1)
    for y in range(0, height, 50):
        draw.line([(0, y), (width, y)], fill=(255, 255, 255, 40), width=1)

    # Title text
    try:
        font_large = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 48)
        font_small = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 24)
    except (OSError, IOError):
        font_large = ImageFont.load_default()
        font_small = ImageFont.load_default()

    draw.text(
        (width // 2 - 400, height // 3),
        "C2PA COMPRESSION TEST ASSET",
        fill=(255, 255, 255),
        font=font_large,
    )
    draw.text(
        (width // 2 - 350, height // 3 + 80),
        "Thesis: AI Transparency in the Wild",
        fill=(200, 200, 200),
        font=font_small,
    )
    draw.text(
        (width // 2 - 250, height // 3 + 120),
        "Author: Pratyay Mondal · THWS",
        fill=(200, 200, 200),
        font=font_small,
    )
    draw.text(
        (width // 2 - 350, height // 2 + 40),
        f"Original Resolution: {width}x{height}",
        fill=(180, 220, 255),
        font=font_small,
    )
    draw.text(
        (width // 2 - 350, height // 2 + 80),
        "This image contains a C2PA manifest with AI generation assertion.",
        fill=(180, 220, 255),
        font=font_small,
    )

    # Color test patches (useful for visual compression artifact detection)
    patch_size = 100
    colors = [
        (255, 0, 0), (0, 255, 0), (0, 0, 255),
        (255, 255, 0), (255, 0, 255), (0, 255, 255),
        (128, 128, 128), (255, 255, 255),
    ]
    for i, color in enumerate(colors):
        x = 100 + i * (patch_size + 20)
        y = height - 200
        draw.rectangle([(x, y), (x + patch_size, y + patch_size)], fill=color)

    # Fine detail region (high-frequency content — very sensitive to JPEG compression)
    for x in range(100, 500, 2):
        for y in range(100, 300, 2):
            if (x + y) % 4 == 0:
                draw.point((x, y), fill=(255, 255, 255))

    # Save as high-quality JPEG (the unsigned source)
    img.save(str(output_path), "JPEG", quality=98)
    print(f"   Created synthetic image: {output_path} ({width}x{height})")


def sign_with_c2pa(input_path: Path, output_path: Path) -> bool:
    """
    Sign the image with a C2PA manifest containing an AI generation assertion.
    Uses c2pa.Signer with ES256 credentials and c2pa.Builder.

    Returns True if signing succeeded, False otherwise.
    """
    manifest_definition = {
        "claim_generator_info": [
            {
                "name": "AI Transparency Thesis Test Harness",
                "version": "1.0.0",
            }
        ],
        "title": "C2PA Compression Test Asset",
        "assertions": [
            {
                "label": "c2pa.actions.v2",
                "data": {
                    "actions": [
                        {
                            "action": "c2pa.created",
                            "softwareAgent": "thesis_generator/1.0.0",
                            "digitalSourceType": "http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia",
                        }
                    ]
                },
            },
        ],
    }

    manifest_json = json.dumps(manifest_definition)

    # Resolve cert and key
    script_dir = Path(__file__).resolve().parent
    certs_dir = script_dir.parent / "test_assets" / "certs"
    certs_path = certs_dir / "es256_certs.pem"
    key_path = certs_dir / "es256_private.key"

    if not certs_path.exists() or not key_path.exists():
        certs_dir.mkdir(parents=True, exist_ok=True)
        print("   📥 Downloading official C2PA ES256 test credentials...")
        import urllib.request
        base_url = "https://raw.githubusercontent.com/contentauth/c2pa-python/main/tests/fixtures"
        urllib.request.urlretrieve(f"{base_url}/es256_certs.pem", str(certs_path))
        urllib.request.urlretrieve(f"{base_url}/es256_private.key", str(key_path))

    with open(certs_path, "rb") as f:
        certs_bytes = f.read()
    with open(key_path, "rb") as f:
        key_bytes = f.read()

    try:
        signer_info = c2pa.C2paSignerInfo(
            alg=c2pa.C2paSigningAlg.ES256,
            sign_cert=certs_bytes,
            private_key=key_bytes,
            ta_url=None,
        )
        signer = c2pa.Signer.from_info(signer_info)

        builder = c2pa.Builder.from_json(manifest_json)
        builder.sign_file(
            source_path=str(input_path),
            dest_path=str(output_path),
            signer=signer,
        )
        print(f"   ✅ C2PA manifest signed: {output_path}")
        return True

    except Exception as e:
        print(f"   ❌ Signing failed: {e}")
        print(f"   ℹ️  You can still test with externally-signed C2PA images.")
        print(f"      Download from: https://contentcredentials.org/verify")
        return False


def _get_test_cert() -> str:
    """
    Return a self-signed test certificate for C2PA signing.
    This is a test-only certificate — NOT for production use.
    """
    # Generate a fresh self-signed test certificate using the cryptography library
    from cryptography import x509
    from cryptography.x509.oid import NameOID
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import ec
    import datetime

    # Generate EC key
    key = ec.generate_private_key(ec.SECP256R1())

    subject = issuer = x509.Name([
        x509.NameAttribute(NameOID.COMMON_NAME, "C2PA Test Certificate - Thesis Research"),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, "THWS Thesis Research"),
        x509.NameAttribute(NameOID.COUNTRY_NAME, "DE"),
    ])

    cert = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(issuer)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(datetime.datetime.now(datetime.timezone.utc))
        .not_valid_after(
            datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=365)
        )
        .sign(key, hashes.SHA256())
    )

    # Cache the key for use by _get_test_key
    _get_test_cert._cached_key = key

    cert_pem = cert.public_bytes(serialization.Encoding.PEM).decode()
    return cert_pem


def _get_test_key() -> str:
    """Return the private key corresponding to the test certificate."""
    from cryptography.hazmat.primitives import serialization

    key = getattr(_get_test_cert, "_cached_key", None)
    if key is None:
        # Force cert generation to create the key
        _get_test_cert()
        key = _get_test_cert._cached_key

    key_pem = key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode()
    return key_pem


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Generate a C2PA-signed test image")
    parser.add_argument(
        "--output", "-o",
        default=None,
        help="Output path for the signed image (default: docs/month_1/test_assets/signed_test_image.jpg)",
    )
    args = parser.parse_args()

    # Determine paths
    script_dir = Path(__file__).resolve().parent
    assets_dir = script_dir.parent / "test_assets"
    assets_dir.mkdir(parents=True, exist_ok=True)

    unsigned_path = assets_dir / "unsigned_test_image.jpg"
    signed_path = Path(args.output) if args.output else assets_dir / "signed_test_image.jpg"

    print("\n🎨 Step 1: Creating synthetic test image...")
    create_synthetic_image(unsigned_path)

    print("\n🔏 Step 2: Signing with C2PA manifest...")
    success = sign_with_c2pa(unsigned_path, signed_path)

    if success:
        print(f"\n✅ DONE! Signed test image ready at: {signed_path}")
        print(f"\nNext steps:")
        print(f"  1. Verify:  python c2pa_inspector.py {signed_path}")
        print(f"  2. Test:    python compression_stress_test.py {signed_path}")
    else:
        print(f"\n⚠️  Self-signing failed. You can still proceed by:")
        print(f"  1. Download a C2PA-signed image from https://contentcredentials.org/verify")
        print(f"  2. Save it to: {assets_dir}/")
        print(f"  3. Run: python compression_stress_test.py <downloaded_image.jpg>")


if __name__ == "__main__":
    main()
