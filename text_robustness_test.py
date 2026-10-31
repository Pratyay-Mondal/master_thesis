#!/usr/bin/env python3
"""Week 3 entry point. Canonical module: docs/month_1/scripts/text_robustness_test.py"""
import sys
from pathlib import Path

_SCRIPTS = Path(__file__).resolve().parent / "docs" / "month_1" / "scripts"
sys.path.insert(0, str(_SCRIPTS))
runpy_target = _SCRIPTS / "text_robustness_test.py"

import runpy

runpy.run_path(str(runpy_target), run_name="__main__")
