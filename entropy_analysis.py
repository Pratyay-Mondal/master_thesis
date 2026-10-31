#!/usr/bin/env python3
"""Week 3 entry point. Canonical module: docs/month_1/scripts/entropy_analysis.py"""
from pathlib import Path
import runpy

_TARGET = Path(__file__).resolve().parent / "docs" / "month_1" / "scripts" / "entropy_analysis.py"
runpy.run_path(str(_TARGET), run_name="__main__")

