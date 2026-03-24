# NicheLab Report Schema

GitHub-ready schema package for report generation.

## Files
- `report-schema.json`: JSON Schema for report objects
- `example-report.json`: Example report payload
- `generation-pipeline.md`: Suggested generation flow
- `starter-pro-mapping.md`: Starter vs PRO visibility mapping

## Suggested repo structure

```text
/data
  report-schema.json
  example-report.json
/docs
  generation-pipeline.md
  starter-pro-mapping.md
```

Or keep these files in the repo root.

## Recommended use
1. Create one JSON object per report
2. Store report JSON files in `/reports`
3. Render:
   - dashboard cards
   - report detail pages
   - starter locked pages
   - pro full pages
   - PDF exports
4. Use `starter_view` and `pro_view` to gate content in the UI
