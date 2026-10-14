# HomeDoc AI

**Open-source development fork of [OSS Document Scanner](https://github.com/ossappscollective/OSS-DocumentScanner)** with a HomeDoc paperwork-review feature. This is a developer MVP, **not yet a compiled or signed iPhone application**.

## What works

- Original document scanning code from OSS Document Scanner.
- The HomeDoc dashboard opens at app launch, with five native sections (Home, Documents, Add, Dates, Settings). The original scanner is accessible via Add → Open scanner; its list also has a HomeDoc shortcut.
- Conservative offline extraction of due dates, document types and amounts; manual confirmation before saving.
- Optional **development-only** AI proxy in `homedoc/server`, not enabled by default.
- A standalone browser UI demonstration at `homedoc/preview/index.html`.
- HomeDoc Settings offers **Low / Medium / High** OCR quality backed by real Tesseract fast / standard / best trained-data models, with per-quality language downloads.

## Android build and emulator

The earlier experimental GitHub-hosted iOS workflow was removed. Android development and testing use **the Linux laptop locally**.

See [Android local build and emulator instructions](homedoc/ANDROID_LOCAL.md). This project uses custom NativeScript, Android OpenCV/Tesseract binaries and Git submodules, so the upstream [build setup](Readme.md) also applies.

A verified synthetic TARI test PDF is in `homedoc/fixtures/`; 18 automated tests pass, and the Android emulator successfully imported it, ran OCR and extracted EUR 73.20 / 2027-07-31.

The HomeDoc Android development package name is `dev.babahadjsaid.homedocai`.

## Developer tests

```bash
node --test homedoc/tests/*.test.mjs homedoc/server/*.test.mjs
python3 -m http.server 8000 --directory homedoc
# open http://localhost:8000/preview/
```

## Code organization

- `app/homedoc/` — NativeScript UI + extraction rules + metadata store.
- `app/components/list/DocumentsList.svelte` — integration button.
- `homedoc/server/` — optional opt-in cloud AI development proxy; never put credentials into the repository.
- `homedoc/tests/` — offline and AI-validation tests.
- `homedoc/design/`, `homedoc/plan/` — design and roadmap.
- `homedoc/preview/` — browser-only interactive prototype.
- `Readme.md` — original upstream project and build documentation.

## Attribution and license

Original OSS Document Scanner source by its respective contributors: see `COPYING` and upstream [repository](https://github.com/ossappscollective/OSS-DocumentScanner). HomeDoc overlay license: `homedoc/LICENSE`. This is an independent project, not an official upstream release.

**Prototype differences:** Native Android does not yet implement the web prototype's `.ics` calendar export. The Android app has real scanner access and a five-section interface, whereas the browser demo uses pasted OCR text and browser storage.

**Security warning:** Current local metadata storage is not encrypted. Use fake documents while testing; do not deploy the dev AI proxy on the open internet without authentication, HTTPS, rate limits and an appropriate privacy review.
