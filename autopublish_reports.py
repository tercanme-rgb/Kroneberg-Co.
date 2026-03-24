#!/usr/bin/env python3
import json
import shutil
import subprocess
import sys
from pathlib import Path
from datetime import datetime

BASE = Path(__file__).resolve().parent

DEFAULT_CATEGORIES = [
    "AI Automation",
    "Finance & Admin",
    "Micro-SaaS",
    "Local Business",
    "B2B Services",
]

OUTPUT_ROOT = BASE / "generated-reports"
SITE_REPORTS_DIR = OUTPUT_ROOT / "reports"
SITE_REPORTS_DIR.mkdir(parents=True, exist_ok=True)

def slugify(text: str) -> str:
    return (
        text.lower()
        .replace("&", "and")
        .replace("/", "-")
        .replace("  ", " ")
        .replace(" ", "-")
    )

def run(cmd):
    print("> " + " ".join(cmd))
    subprocess.run(cmd, cwd=BASE, check=True)

def generate_for_category(category: str):
    py = sys.executable
    run([py, "run_pipeline.py", "--category", category])

    report_json_path = BASE / "output" / "report.json"
    report_pro_path = BASE / "output" / "report-pro.html"
    shortlist_path = BASE / "output" / "featured-shortlist.json"

    report = json.loads(report_json_path.read_text(encoding="utf-8"))
    slug = report["slug"]
    category_slug = slugify(category)

    target_report = SITE_REPORTS_DIR / f"{slug}.html"
    shutil.copyfile(report_pro_path, target_report)

    shortlisted = json.loads(shortlist_path.read_text(encoding="utf-8"))
    return {
        "category": category,
        "category_slug": category_slug,
        "title": report["meta"]["title"],
        "slug": slug,
        "subtitle": report["meta"]["subtitle"],
        "report_path": f"generated-reports/reports/{slug}.html",
        "overall_confidence": report["scoring"]["overall_confidence"],
        "recommendation": report["scoring"]["recommendation"],
        "featured_shortlist": shortlisted,
        "generated_at": datetime.utcnow().isoformat() + "Z",
    }

def main():
    categories = DEFAULT_CATEGORIES
    manifest_items = []
    shortlists = {}

    for category in categories:
        item = generate_for_category(category)
        manifest_items.append({
            "category": item["category"],
            "title": item["title"],
            "slug": item["slug"],
            "subtitle": item["subtitle"],
            "report_path": item["report_path"],
            "overall_confidence": item["overall_confidence"],
            "recommendation": item["recommendation"],
            "generated_at": item["generated_at"],
        })
        shortlists[category] = item["featured_shortlist"]

    manifest = {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "reports": manifest_items,
        "featured_shortlists": shortlists,
    }

    (OUTPUT_ROOT / "reports-manifest.json").write_text(
        json.dumps(manifest, indent=2), encoding="utf-8"
    )

    latest = manifest_items[0] if manifest_items else {}
    homepage_json = {
        "generated_at": manifest["generated_at"],
        "featured_report": latest,
        "total_reports": len(manifest_items),
        "categories": categories,
    }
    (OUTPUT_ROOT / "homepage-feed.json").write_text(
        json.dumps(homepage_json, indent=2), encoding="utf-8"
    )

    print("Autopublish completed.")
    print(f"Manifest: {OUTPUT_ROOT / 'reports-manifest.json'}")

if __name__ == "__main__":
    main()
