# GitHub patch pack

Upload these files to your repo root.

## Files
- `COPY_REPLACEMENTS.md`
- `copy-replacements.json`
- `dashboard-auth-open.js`
- `firebase-auth-google-email-only.js`

## What to do
1. Apply the copy replacements across `index.html`, `dashboard.html`, pricing sections, and report buttons.
2. In `dashboard.html`, remove any code that blocks access when a user is not signed in.
3. Include `dashboard-auth-open.js` and use:
   `initDashboardWithoutAuthLock(auth, loadDashboard)`
4. Disable Apple sign-in in Firebase Console.
5. Keep only Google + Email/Password auth in your site code.

## Firebase Console changes
Authentication -> Sign-in method:
- Google: Enabled
- Email/Password: Enabled
- Apple: Disabled

## Authorized domain
Make sure this exists in Firebase:
- `tercanme-rgb.github.io`
