# Security And Privacy

Catch Report is public source code, but catch data is private by default.

## Current Data Model

- Catch entries are stored in the browser on the user's device with `localStorage`.
- The app does not have a backend database.
- The app does not upload catch history, GPS coordinates, notes, species, or lure selections.
- Location permission is requested only when the user presses `Use GPS`.
- Exported JSON files are user-controlled backups and should be treated as private location data.

## Public Repository Safety

Making this repository public does not publish anyone's catches. The repo contains only app code and static assets, not device data.

Do not commit exported catch JSON files, screenshots that reveal private fishing spots, API keys, analytics tokens, or backend credentials.

## Current Network Caveat

The map uses OpenStreetMap tiles through Leaflet. Tile providers may receive network requests for the map area being viewed. Catch records are still not uploaded, but viewed map regions can be visible to the tile service through normal web requests.

For a stricter privacy version, use a vetted map provider, self-host map tiles, or add a no-network map mode for logging catches without loading remote map tiles.

## Hardening Already In Place

- Static app with no server-side attack surface.
- No account system or shared database in the first version.
- Content Security Policy blocks arbitrary scripts by default.
- Referrer policy is set to `no-referrer`.
- Geolocation is limited to the app origin by Permissions Policy.
- Icons are local code rather than a mutable third-party `latest` script.
- Service worker uses network-first updates for app files so fixes replace old cached code.

## Before Launching As A Real Phone App

- Serve only over HTTPS.
- Add automated dependency and secret scanning in GitHub.
- Avoid analytics unless explicitly opt-in and privacy-preserving.
- If cloud sync is added, require authentication, row-level per-user access controls, encrypted transport, and a clear delete/export flow.
- Never store precise user locations in public logs.
