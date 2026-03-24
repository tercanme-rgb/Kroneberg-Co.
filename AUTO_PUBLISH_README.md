# Auto-publish integration

This package makes the V7.1 engine generate and publish reports automatically to your GitHub repo.

## What it does
- runs the report engine for default categories
- copies the generated PRO HTML reports into `generated-reports/reports/`
- writes:
  - `generated-reports/reports-manifest.json`
  - `generated-reports/homepage-feed.json`
- commits the changes back into the repo automatically

## Default categories
- AI Automation
- Finance & Admin
- Micro-SaaS
- Local Business
- B2B Services

## GitHub setup
1. Upload these files into your repo root
2. Make sure GitHub Actions is enabled
3. Go to:
   - **Repo -> Actions**
   - allow workflows if GitHub asks
4. The workflow file is:
   - `.github/workflows/auto-generate-reports.yml`

## Trigger modes
- manual:
  - GitHub -> Actions -> Auto Generate and Publish Reports -> Run workflow
- automatic:
  - daily on the schedule in the workflow file

## Where the reports go
- `generated-reports/reports/*.html`
- `generated-reports/reports-manifest.json`
- `generated-reports/homepage-feed.json`

## Important note
This setup publishes automatically with **no manual approval step**.
If the engine produces weak titles or awkward reports, they will still be committed.

## Optional next step
Your dashboard or homepage can be updated to read from:
- `generated-reports/reports-manifest.json`
- `generated-reports/homepage-feed.json`

That would let the site surface new reports automatically.
