# HomeDoc AI

**Open-source development fork of [OSS Document Scanner](https://github.com/ossappscollective/OSS-DocumentScanner)** with a HomeDoc paperwork-review feature. This is a developer MVP, **not yet a compiled or signed iPhone application**.

## What works

- Original document scanning code from OSS Document Scanner.
- A new HomeDoc screen reachable from the document list, reading existing OCR text.
- Conservative offline extraction of due dates, document types and amounts; manual confirmation before saving.
- Optional **development-only** AI proxy in `homedoc/server`, not enabled by default.
- A standalone browser UI demonstration at `homedoc/preview/index.html`.

## Automated build

**Actions → HomeDoc AI - iOS Simulator → Run workflow.**

The macOS workflow runs Node tests, downloads the original scanner's large iOS OCR libraries, installs the upstream-compatible NativeScript CLI, and **attempts an unsigned iOS Simulator build**. If it succeeds, find `HomeDocAI-iOS-Simulator` under **Workflow run → Artifacts**. This ZIP contains a Simulator `.app` and **cannot be installed directly on a real iPhone**.

The original project's custom native dependencies can cause CI build failures; these should be diagnosed from the Actions log. This pipeline intentionally does not claim a signed IPA or TestFlight distribution.

For getting onto an actual iPhone, read **[homedoc/INSTALL_FROM_GITHUB.md](homedoc/INSTALL_FROM_GITHUB.md)**. A Mac with Xcode and a free Apple account can sign for local personal-device testing. TestFlight/cloud device signing normally requires Apple Developer Program membership and configured signing assets.

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

**Security warning:** Current local metadata storage is not encrypted. Use fake documents while testing; do not deploy the dev AI proxy on the open internet without authentication, HTTPS, rate limits and an appropriate privacy review.
