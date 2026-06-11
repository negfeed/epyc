# EPYC invite-link hosting (`epycnative.negfeed.com`)

Invite links are `https://epycnative.negfeed.com/game/{gameId}`. For them to open the
app instead of a browser, this directory must be served at that domain over **HTTPS**.

## Files

| Path on the domain | File here | Notes |
|---|---|---|
| `/.well-known/apple-app-site-association` | `.well-known/apple-app-site-association` | iOS Universal Links. **Serve with `Content-Type: application/json`, NO `.json` extension, and no redirects.** `appID` = `<TeamID>.<bundleId>` = `8A7C669LHV.com.negfeed.epycnative`. |
| `/.well-known/assetlinks.json` | `.well-known/assetlinks.json` | Android App Links. Contains the **debug** keystore SHA‑256. |
| `/game/{id}` | `game/index.html` | Browser fallback when the app isn't installed. |

## Per-platform requirements

**Android App Links** — works as soon as `assetlinks.json` is reachable over HTTPS.
Verify after deploying:
```
adb shell pm verify-app-links --re-verify com.negfeed.epycnative
adb shell pm get-app-links com.negfeed.epycnative   # host should show "verified"
```
Or: https://developers.google.com/digital-asset-links/tools/generator

**iOS Universal Links** — additionally require:
1. A **paid Apple Developer account** (the `com.apple.developer.associated-domains`
   capability can't be provisioned by a free team — see `ios/Epyc/Epyc.entitlements`).
2. Add to `ios/Epyc/Epyc.entitlements`:
   ```xml
   <key>com.apple.developer.associated-domains</key>
   <array><string>applinks:epycnative.negfeed.com</string></array>
   ```
3. Re-run `xcodegen` + build. Until then, iOS opens the link in Safari (the fallback
   page), and the `com.negfeed.epycnative://game/{id}` custom scheme remains the
   always-works path that opens the app directly.

## Release builds

`assetlinks.json` currently lists only the **debug** keystore fingerprint. Before
shipping, add your **release** keystore's SHA‑256 to the `sha256_cert_fingerprints`
array (and, if you use Play App Signing, the SHA‑256 Google shows under
**Play Console → App integrity**).

## Quick host with Firebase Hosting (optional)

This `web/` folder can be deployed to the project's Firebase Hosting and pointed at the
custom domain `epycnative.negfeed.com`:
```
firebase init hosting        # public dir: web
firebase deploy --only hosting --project epyc-native
# then add epycnative.negfeed.com as a custom domain in the Hosting console
```
Firebase Hosting serves `/.well-known/apple-app-site-association` with the correct
JSON content type automatically.
