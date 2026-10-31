#!/usr/bin/env python3
"""Week 3 entry point. Canonical module: docs/month_1/scripts/synthid_text_simulator.py"""
from pathlib import Path
import runpy

_TARGET = Path(__file__).resolve().parent / "docs" / "month_1" / "scripts" / "synthid_text_simulator.py"
runpy.run_path(str(_TARGET), run_name="__main__")
