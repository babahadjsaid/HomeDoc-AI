# HomeDoc AI — NativeScript scanner extension and UX prototype

> Development MVP starter built **to overlay** the MIT-licensed [OSS Document Scanner](https://github.com/ossappscollective/OSS-DocumentScanner). This download intentionally does **not** contain a copy of the full upstream repository.

## Start here

1. Read [INSTALL_IPHONE.md](INSTALL_IPHONE.md) for iPhone, iOS Simulator and Safari demo instructions.
2. Open the responsive prototype at `preview/` by opening `preview/HomeDocAI-Interactive-Demo.html` (standalone), or run `python3 -m http.server 8000` and visit `http://localhost:8000/preview/`.
3. Run `node --test native/tests/*.test.mjs server/*.test.mjs` (Node 20+).
4. On a Mac, clone/build the original scanner according to its README, then apply this package's `native/scripts/apply_overlay.py`.

## What's included

| Path | Purpose |
|---|---|
| `preview/index.html` | Interactive mobile/desktop prototype: dashboard, text import, review, search, deadlines and `.ics` export |
| `native/app/homedoc/HomeDocHub.svelte` | NativeScript/Svelte native review screen and optional AI consent flow |
| `native/app/homedoc/analyzer.mjs` | Tested offline field extraction and conservative date handling |
| `native/app/homedoc/store.ts` | Local metadata storage for development only; not encrypted |
| `native/scripts/apply_overlay.py` | Adds HomeDoc button to scanner's `DocumentsList.svelte` and installs feature files |
| `server/index.mjs` | Optional authenticated LLM extraction proxy (development server only) |
| `design/` | Software architecture + UI specification, diagrams and screen sketches |
| `plan/EXECUTION.md` | Roadmap, implementation status, definition of done |
| `INSTALL_IPHONE.md` | Mac, simulator, real iPhone, and Safari instructions |

## Implemented behavior

- Connect to the **existing scanner's local** scanned documents and their OCR text.
- Suggest document category, amount and date using offline rules; safely handle ambiguous dates.
- Review and edit fields; save/remove local confirmed metadata.
- Display due dates in the native HomeDoc hub; browser-only `.ics` export.
- Optional cloud AI developer endpoint with JSON schema, evidence checking, explicit user consent, and server-held API key.

## Not completed or validated

- No native iOS/Android build performed here. No signed IPA / TestFlight build.
- No app-store-ready notifications, subscription billing, cloud sync, reliable multilingual OCR or encrypted local metadata.
- Browser prototype does not perform camera OCR or connect to the actual scanner database.
- UI and source code have not undergone device accessibility/performance/security audits.

## License and attribution

This independently authored HomeDoc add-on is provided under the MIT license in `LICENSE`. Original OSS Document Scanner code remains copyright its respective original contributors and must retain its own MIT license and notices. Check all original dependencies and assets before commercially distributing a fork. Do not copy the original product branding, artwork, or publisher signing identifiers into a commercial release.
