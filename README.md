# Catch Report

A mobile-first fishing log for tracking catches by species, lure, time, and location. The app runs as a static PWA, keeps a local copy on the device, and can sync to Firebase Firestore when configured.

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
- OpenLayers map for manual spot adjustment, hotspots, and filtered catch review.
- Lightweight SVG fallback if the map library cannot load.
- Local catch history persisted in `localStorage`.
- Optional Firebase Auth and Firestore cloud sync.
- Hotspot circles for nearby catch clusters.
- Area, fish, and lure filters.
- Best time-of-day, top fish, top lure, and top spot summaries.
- Basic PWA manifest and service worker for installability.

## Puget Sound Expansion

The Puget Sound preset starts with common recreational categories: Chinook, coho, pink, and chum salmon; sea-run cutthroat; lingcod; flounder/flatfish; kelp greenling; cabezon; and Pacific halibut.

This is for catch logging, not regulation guidance. Marine area openings, retention, depth, gear, and emergency rules change often, so check WDFW before fishing.

## Privacy And Security

Catch data stays in the current browser unless exported. GPS is only requested when pressing `Use GPS`.

See [SECURITY.md](SECURITY.md) for the current privacy model and the launch hardening checklist.

## Free Firebase Setup

Use Firebase's free Spark plan. Do not upgrade to Blaze if you want to keep the cost capped at $0.

1. Create a Firebase project in the Firebase Console.
2. Add a Web app to the project.
3. Enable Authentication and turn on Google as a sign-in provider.
4. Add authorized domains for local and hosted use:
   - `localhost`
   - `127.0.0.1`
   - `caruso1058.github.io`
5. Create a Cloud Firestore database in production mode.
6. In the Firestore Rules tab, paste the contents of `firestore.rules` and publish.
7. Copy the Firebase web config into `firebase-config.js`.
8. Change `firebaseEnabled` in `firebase-config.js` to `true`.
9. Commit and push the config update.

Catch data is stored at:

```txt
users/{userId}/catches/{catchId}
```

The rules only allow a signed-in user to read and write their own catch documents.

If the Sign in button does not complete, check the app's cloud sync message. The most common fixes are enabling the Google provider or adding `caruso1058.github.io` under Authentication > Settings > Authorized domains.
