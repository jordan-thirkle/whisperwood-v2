#!/usr/bin/env python3
"""
Metrics Collector — Gathers machine-verifiable performance data.
Run after each build to capture: bundle size, build time, TypeScript errors.
"""
import json
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path


def collect_bundle_size(dist_dir: str) -> dict:
    """Measure bundle sizes from Vite build output."""
    assets_dir = Path(dist_dir) / "assets"
    if not assets_dir.exists():
        return {"error": "dist/assets not found", "dist_dir": dist_dir}

    js_files = list(assets_dir.glob("*.js"))
    css_files = list(assets_dir.glob("*.css"))

    total_js = sum(f.stat().st_size for f in js_files)
    total_css = sum(f.stat().st_size for f in css_files)

    return {
        "js_bytes": total_js,
        "js_kb": round(total_js / 1024, 2),
        "css_bytes": total_css,
        "css_kb": round(total_css / 1024, 2),
        "total_bytes": total_js + total_css,
        "total_kb": round((total_js + total_css) / 1024, 2),
        "files": {
            "js": [f.name for f in js_files],
            "css": [f.name for f in css_files],
        },
    }


def collect_build_time(project_dir: str) -> dict:
    """Run Vite build and capture timing."""
    vite_cmd = os.path.join(project_dir, "node_modules", "vite", "bin", "vite.js")
    result = subprocess.run(
        ["node", vite_cmd, "build"],
        capture_output=True, text=True, cwd=project_dir, timeout=120
    )
    build_time_ms = -1
    for line in result.stdout.split("\n"):
        if "built in" in line:
            # Vite outputs: "✓ built in 366ms"
            import re
            m = re.search(r"built in\s+(\d+)ms", line)
            if m:
                build_time_ms = int(m.group(1))
    return {
        "build_success": result.returncode == 0,
        "build_time_ms": build_time_ms,
    }


def collect_typescript_errors(project_dir: str) -> dict:
    """Run tsc --noEmit and count errors."""
    # Use node to invoke tsc directly (avoids Windows path issues with shell=True)
    tsc_js = os.path.join(project_dir, "node_modules", "typescript", "bin", "tsc")
    if not os.path.exists(tsc_js):
        tsc_js = os.path.join(project_dir, "node_modules", "typescript", "bin", "tsc.js")
    result = subprocess.run(
        ["node", tsc_js, "--noEmit"],
        capture_output=True, text=True, cwd=project_dir, timeout=60
    )
    error_lines = [l for l in result.stdout.split("\n") if "error TS" in l]
    return {
        "typescript_errors": len(error_lines),
        "error_details": error_lines[:10],
    }


def collect_git_info(project_dir: str) -> dict:
    """Capture git state for traceability."""
    def run_git(args):
        r = subprocess.run(
            ["git"] + args,
            capture_output=True, text=True, cwd=project_dir, timeout=10
        )
        return r.stdout.strip() if r.returncode == 0 else ""

    return {
        "commit_hash": run_git(["rev-parse", "HEAD"]),
        "commit_short": run_git(["rev-parse", "--short", "HEAD"]),
        "branch": run_git(["branch", "--show-current"]),
        "dirty": bool(run_git(["status", "--porcelain"])),
    }


def collect_all(project_dir: str) -> dict:
    """Collect all metrics."""
    dist_dir = os.path.join(project_dir, "dist")

    ts_errors = collect_typescript_errors(project_dir)
    build = collect_build_time(project_dir)
    bundle = {}
    if build["build_success"]:
        bundle = collect_bundle_size(dist_dir)
    git = collect_git_info(project_dir)

    return {
        "timestamp": datetime.now().isoformat(),
        "project": os.path.basename(project_dir),
        "git": git,
        "typescript": ts_errors,
        "build": build,
        "bundle": bundle,
    }


if __name__ == "__main__":
    project_dir = sys.argv[1] if len(sys.argv) > 1 else "."

    metrics = collect_all(project_dir)

    # Save to metrics directory
    metrics_dir = Path(project_dir) / "metrics"
    metrics_dir.mkdir(exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = metrics_dir / f"metrics-{timestamp}.json"

    with open(output_file, "w") as f:
        json.dump(metrics, f, indent=2)

    print(json.dumps(metrics, indent=2))
