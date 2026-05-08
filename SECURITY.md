# Security And Privacy

Catch Report is public source code, but catch data is private by default.

## Current Data Model

- Catch entries are stored in the browser on the user's device with `localStorage`.
- If Firebase is configured and the user signs in, catches are also synced to that user's private Firestore path.
- The Firebase path is `users/{uid}/catches/{catchId}`.
- Location permission is requested only when the user presses `Use GPS`.

## Public Repository Safety

Making this repository public does not publish anyone's catches. The repo contains only app code and static assets, not device data.

Do not commit exported catch JSON files, screenshots that reveal private fishing spots, API keys, analytics tokens, or backend credentials.

## Current Map Model

The catch plot is rendered locally in the browser and does not load remote map tiles. GPS coordinates and catch points are not sent to a map tile provider.

## Hardening Already In Place

- Static app with no server-side attack surface.
- No account system or shared database in the first version.
- Content Security Policy blocks arbitrary scripts by default.
- Referrer policy is set to `no-referrer`.
- Geolocation is limited to the app origin by Permissions Policy.
- Icons are local code rather than a mutable third-party `latest` script.
- Firestore rules restrict catch documents to the signed-in owner's UID.
- Service worker uses network-first updates for app files so fixes replace old cached code.

## Before Launching As A Real Phone App

- Serve only over HTTPS.
- Add automated dependency and secret scanning in GitHub.
- Avoid analytics unless explicitly opt-in and privacy-preserving.
- If cloud sync is enabled, keep Firestore rules published from `firestore.rules` and avoid broad read/write rules.
- Never store precise user locations in public logs.
