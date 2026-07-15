#!/usr/bin/env python3
"""
Evidence Collector — Runs all evidence collection in sequence.
Call after each build to capture: metrics, FPS, screenshots.
"""
import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path


def run_script(script_path: str, args: list, python_exe: str) -> dict:
    """Run a Python script and capture output."""
    cmd = [python_exe, script_path] + args
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError:
        return {"error": f"Failed to parse: {result.stdout[:500]}", "stderr": result.stderr[:500]}


def collect_evidence(project_dir: str, game_url: str, python_exe: str) -> dict:
    """Run all evidence collection scripts."""
    scripts_dir = Path(project_dir) / "scripts"
    metrics_dir = Path(project_dir) / "metrics"
    metrics_dir.mkdir(exist_ok=True)

    evidence = {
        "timestamp": datetime.now().isoformat(),
        "project": Path(project_dir).name,
        "metrics": {},
        "fps": {},
        "screenshot": {},
    }

    # 1. Collect build metrics
    print("1/3 Collecting build metrics...")
    evidence["metrics"] = run_script(
        str(scripts_dir / "collect-metrics.py"),
        [project_dir],
        python_exe
    )

    # 2. Collect FPS data (only if game is running)
    print("2/3 Collecting FPS data...")
    evidence["fps"] = run_script(
        str(scripts_dir / "trace-fps.py"),
        [game_url, "5"],
        python_exe
    )

    # 3. Take screenshot and diff
    print("3/3 Capturing screenshot evidence...")
    evidence["screenshot"] = run_script(
        str(scripts_dir / "screenshot-diff.py"),
        [game_url, str(metrics_dir / "screenshots"), project_dir],
        python_exe
    )

    # Save combined evidence
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    evidence_file = metrics_dir / f"evidence-{timestamp}.json"
    with open(evidence_file, "w") as f:
        json.dump(evidence, f, indent=2)

    print(f"\nEvidence saved to {evidence_file}")

    # Summary
    print("\n=== EVIDENCE SUMMARY ===")
    m = evidence.get("metrics", {})
    if "error" not in m:
        print(f"Bundle: {m.get('bundle', {}).get('total_kb', '?')} KB")
        print(f"TS errors: {m.get('typescript', {}).get('typescript_errors', '?')}")
        print(f"Build: {'PASS' if m.get('build', {}).get('build_success') else 'FAIL'}")
        print(f"Git: {m.get('git', {}).get('commit_short', '?')}")

    f = evidence.get("fps", {})
    if "error" not in f:
        print(f"FPS: {f.get('avg_fps', '?')} avg ({f.get('min_fps', '?')}-{f.get('max_fps', '?')})")
        print(f"Console errors: {f.get('console_errors', '?')}")
    else:
        print(f"FPS: {f.get('error', 'unavailable')}")

    s = evidence.get("screenshot", {})
    if "error" not in s:
        print(f"Screenshot: {s.get('screenshot', '?')}")
        print(f"Diff: {s.get('diff_percentage', '?')}% change")
    else:
        print(f"Screenshot: {s.get('error', 'unavailable')}")

    return evidence


if __name__ == "__main__":
    project_dir = sys.argv[1] if len(sys.argv) > 1 else "."
    game_url = sys.argv[2] if len(sys.argv) > 2 else "http://localhost:5173"
    python_exe = sys.argv[3] if len(sys.argv) > 3 else sys.executable

    collect_evidence(project_dir, game_url, python_exe)
