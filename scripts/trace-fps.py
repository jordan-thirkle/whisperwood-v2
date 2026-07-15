#!/usr/bin/env python3
"""
FPS Tracer — Opens game in headless Playwright, captures FPS over N seconds.
Returns: avg FPS, min FPS, max FPS, frame times, console errors.
"""
import json
import sys
from datetime import datetime


def trace_fps(url: str, duration_seconds: int = 10) -> dict:
    """Open game in Playwright, capture FPS."""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return {"error": "playwright not installed. Run: pip install playwright"}

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 720})

        # Collect console messages
        console_messages = []
        page.on("console", lambda msg: console_messages.append({
            "type": msg.type,
            "text": msg.text,
        }))

        # Navigate and wait for game to load
        page.goto(url, wait_until="networkidle")
        page.wait_for_timeout(2000)

        # Inject FPS counter
        page.evaluate("""
            window.__fpsData = {
                frames: [],
                startTime: performance.now(),
                running: true
            };

            function measureFrame() {
                if (!window.__fpsData.running) return;
                const now = performance.now();
                window.__fpsData.frames.push(now);
                requestAnimationFrame(measureFrame);
            }
            requestAnimationFrame(measureFrame);
        """)

        # Wait for measurement period
        page.wait_for_timeout(duration_seconds * 1000)

        # Stop collection
        page.evaluate("window.__fpsData.running = false")

        # Get frame data
        frames = page.evaluate("window.__fpsData.frames")

        if len(frames) < 2:
            browser.close()
            return {"error": "Not enough frames captured", "frames": len(frames)}

        # Calculate frame times
        frame_times = []
        for i in range(1, len(frames)):
            frame_times.append(frames[i] - frames[i - 1])

        avg_frame_time = sum(frame_times) / len(frame_times)
        fps = 1000 / avg_frame_time if avg_frame_time > 0 else 0

        # Check for errors
        errors = [m for m in console_messages if m["type"] == "error"]
        warnings = [m for m in console_messages if m["type"] == "warning"]

        browser.close()

        return {
            "timestamp": datetime.now().isoformat(),
            "url": url,
            "duration_seconds": duration_seconds,
            "total_frames": len(frames),
            "avg_fps": round(fps, 1),
            "min_fps": round(1000 / max(frame_times) if frame_times else 0, 1),
            "max_fps": round(1000 / min(frame_times) if frame_times else 0, 1),
            "avg_frame_time_ms": round(avg_frame_time, 2),
            "console_errors": len(errors),
            "console_error_messages": [e["text"] for e in errors[:5]],
            "console_warnings": len(warnings),
        }
    except Exception as e:
        return {"error": str(e)}


if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5173"
    duration = int(sys.argv[2]) if len(sys.argv) > 2 else 10

    result = trace_fps(url, duration)
    print(json.dumps(result, indent=2))
