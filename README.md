# Catch Report

A mobile-first fishing log for tracking catches by species, lure, time, and location. The first version is a static PWA that runs in the browser and stores catch history locally on the device.

## Run Locally

```bash
python3 -m http.server 4173
```

Open `http://127.0.0.1:4173/index.html`.

## Current Features

- Fast catch entry with fish and lure dropdowns.
- `Other` write-ins for unusual species or lure choices.
- Time defaults to the device's current local time.
- Water presets for Lake Margaret, Puget Sound, other lakes, and custom water.
- Fish and lure options adjust to the selected water type.
- Location defaults to the selected water center and can be refined by GPS or map pin.
- GPS fill-in when browser location permission is allowed.
- Map pin selection for manual spot adjustment.
- Local catch history persisted in `localStorage`.
- Hotspot circles for nearby catch clusters.
- Area, fish, and lure filters.
- Best time-of-day, top fish, top lure, and top spot summaries.
- JSON export/import for backups and device migration.
- Basic PWA manifest and service worker for installability.

## Puget Sound Expansion

The Puget Sound preset starts with common recreational categories: Chinook, coho, pink, and chum salmon; sea-run cutthroat; lingcod; flounder/flatfish; kelp greenling; cabezon; and Pacific halibut.

This is for catch logging, not regulation guidance. Marine area openings, retention, depth, gear, and emergency rules change often, so check WDFW before fishing.

## Privacy And Security

Catch data stays in the current browser unless exported. GPS is only requested when pressing `Use GPS`.

See [SECURITY.md](SECURITY.md) for the current privacy model and the launch hardening checklist.

For long-term multi-device use, the next secure step is an authenticated backend with:

- Sign in with Apple or passkeys.
- Encrypted transport over HTTPS.
- Per-user database rows protected by row-level security.
- Automatic cloud backup and restore.
- Optional private sharing for selected spots.

Good backend candidates for the next phase are Supabase, Firebase, or a small custom API.
