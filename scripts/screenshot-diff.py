#!/usr/bin/env python3
"""
Screenshot Diff — Controlled capture + pixel diff against previous iteration.
Append-only storage. Never overwrites. Every screenshot has metadata.
"""
import json
import os
import sys
from datetime import datetime
from pathlib import Path


def take_screenshot(url: str, output_path: str, viewport: dict = None) -> dict:
    """Take a controlled screenshot of the game."""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return {"error": "playwright not installed"}

    vp = viewport or {"width": 1280, "height": 720}

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport=vp)

        page.goto(url, wait_until="networkidle")
        page.wait_for_timeout(3000)  # Let game fully load and stabilize

        page.screenshot(path=output_path, full_page=False)
        browser.close()

        return {"screenshot": output_path, "viewport": vp}


def diff_screenshots(img1_path: str, img2_path: str) -> dict:
    """Compare two screenshots and return diff metrics."""
    try:
        from PIL import Image
        import numpy as np
    except ImportError:
        return {"error": "Pillow/numpy not installed"}

    img1 = Image.open(img1_path).convert("RGB")
    img2 = Image.open(img2_path).convert("RGB")

    if img1.size != img2.size:
        img2 = img2.resize(img1.size)

    arr1 = np.array(img1)
    arr2 = np.array(img2)

    diff = np.abs(arr1.astype(int) - arr2.astype(int))
    total_pixels = arr1.shape[0] * arr1.shape[1] * 3
    changed_pixels = int(np.sum(diff > 20))
    diff_percentage = (changed_pixels / total_pixels) * 100

    # Create diff image (amplified for visibility)
    diff_img = Image.fromarray((diff * 5).clip(0, 255).astype(np.uint8))
    diff_path = img1_path.replace(".png", "-diff.png")
    diff_img.save(diff_path)

    return {
        "diff_percentage": round(diff_percentage, 2),
        "changed_pixels": changed_pixels,
        "total_pixels": total_pixels,
        "diff_image": diff_path,
        "significant_change": diff_percentage > 5,
    }


def get_git_commit(project_dir: str) -> str:
    """Get current git commit hash."""
    import subprocess
    try:
        r = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            capture_output=True, text=True, cwd=project_dir, timeout=5
        )
        return r.stdout.strip() if r.returncode == 0 else "unknown"
    except Exception:
        return "unknown"


if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5173"
    screenshots_dir = Path(sys.argv[2] if len(sys.argv) > 2 else "metrics/screenshots")
    project_dir = sys.argv[3] if len(sys.argv) > 3 else "."
    screenshots_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    commit = get_git_commit(project_dir)
    screenshot_path = str(screenshots_dir / f"screenshot-{timestamp}.png")

    # Take screenshot
    result = take_screenshot(url, screenshot_path)
    if "error" in result:
        print(json.dumps(result, indent=2))
        sys.exit(1)

    # Find previous screenshot (append-only, never overwrite)
    existing = sorted(screenshots_dir.glob("screenshot-*.png"))
    # Exclude diff images
    existing = [f for f in existing if "-diff" not in f.name]

    if len(existing) >= 2:
        prev = existing[-2]  # Second to last (current is the one we just took)
        diff = diff_screenshots(str(prev), screenshot_path)
        result.update(diff)
        result["previous_screenshot"] = str(prev)
    else:
        result["diff_percentage"] = 0
        result["significant_change"] = False
        result["note"] = "First screenshot — no previous to compare"

    # Add metadata
    result["timestamp"] = timestamp
    result["git_commit"] = commit
    result["game"] = Path(project_dir).name

    # Save metadata alongside screenshot
    meta_path = screenshot_path.replace(".png", ".json")
    with open(meta_path, "w") as f:
        json.dump(result, f, indent=2)

    print(json.dumps(result, indent=2))
