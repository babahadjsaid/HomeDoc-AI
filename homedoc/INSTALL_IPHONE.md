# Test HomeDoc AI on an iPhone or iOS Simulator

## What is and is not ready

- **Ready now:** interactive mobile-sized browser prototype, NativeScript overlay source, document analysis rules, tests, optional developer LLM API.
- **Not yet available:** a signed `.ipa`, an App Store/TestFlight build, or a verified running native app.
- **Required for a native iOS build:** Mac + Xcode + NativeScript environment and the original OSS scanner's additional native tooling/libraries. This execution environment could not download/compile the full original GitHub repository, and does not run macOS/Xcode.

## A. Try the UI on your iPhone Safari (no Xcode required)

On a computer where you extracted this folder (or open `preview/HomeDocAI-Interactive-Demo.html` directly on a desktop browser):

```bash
cd /path/to/HomeDocAI-Starter
python3 -m http.server 8000 --bind 0.0.0.0
```

Find the computer's LAN IP address. Connect your iPhone to the **same Wi-Fi network**, then visit:

```
http://YOUR_COMPUTER_LAN_IP:8000/preview/
```

On the computer itself, visit `http://localhost:8000/preview/`. Use **Add document → Example: utility bill → Analyze text → Confirm and save**. Test searching and the deadlines/calendar export. This is an ordinary web UI prototype, *not* the installed NativeScript app. It deliberately does not scan photos. It stores data in browser localStorage; use fictional documents only. If your computer blocks incoming connections, allow the Python server through your firewall or test on localhost instead.

## B. Build the real NativeScript fork on a Mac

**Step 1 — Install Xcode and base tools.** Install Xcode from the Mac App Store. Launch Xcode once, accept the license, and install an iOS Simulator runtime in Xcode Settings > Components/Platforms if requested. Follow the maintained NativeScript macOS setup: https://docs.nativescript.org/setup/macos

```bash
node --version
npm --version
npm install -g nativescript
ns doctor ios
```

Install Cocoapods, Ruby tools and command-line tools as requested by `ns doctor ios`. Do not move on until the doctor passes for *your* environment.

**Step 2 — Clone the upstream source** (requires internet on your Mac):

```bash
git clone --recurse-submodules https://github.com/ossappscollective/OSS-DocumentScanner.git
cd OSS-DocumentScanner
```

**Step 3 — Reproduce upstream-specific dependencies before applying HomeDoc.** This repository is **not** a stock NativeScript app. Its README explicitly calls for:

1. A build of `https://github.com/Akylas/NativeScript` using its documented `npm run setup:yarn && npm run ui-mobile-base:build && npm run core:build`, with a local path reference from the scanner's Yarn resolutions.
2. A customized CLI from `https://github.com/farfromrefug/nativescript-cli`, built with the upstream instructions. Run that CLI using `PATH_TO_CLI_FOLDER/bin/ns` where required.
3. `yarn` 4.9.4 and repository submodules; the maintainer explicitly warns about local `portal:` and `resolutions` references.
4. OpenCV and Tesseract native libraries. The maintainer offers prebuilt assets at `https://github.com/ossappscollective/OSS-DocumentScanner/releases/tag/dev_resources`, or instructions for compiling them (including iOS `opencv2.xcframework` and Tesseract libraries).

Follow **the exact current upstream building guide** at https://github.com/ossappscollective/OSS-DocumentScanner/blob/main/Readme.md. The upstream guide itself can change. Avoid blindly deleting dependency resolutions: adjust only as needed for the paths where you built the custom fork. It may take real debugging to get the unmodified scanner compiling; first run it successfully on your Mac *before* integrating HomeDoc.

**Step 4 — Apply the HomeDoc overlay** from the extracted starter folder:

```bash
python3 /path/to/HomeDocAI-Starter/native/scripts/apply_overlay.py \
  /path/to/OSS-DocumentScanner
```

The script copies `app/homedoc/` and adds one HomeDoc button to `app/components/list/DocumentsList.svelte`. It is idempotent. It does not overwrite the upstream repository wholesale. Inspect `git diff` to see every change:

```bash
cd /path/to/OSS-DocumentScanner
git diff -- app/components/list/DocumentsList.svelte
```

**Step 5 — Set your own app identity.** Avoid using the upstream publisher's bundle ID or signing team when distributing your fork. In the same shell where you run the custom NativeScript CLI, set your own values:

```bash
export APP_ID='com.yourcompany.homedoc.dev'
export APP_BUILD_PATH='build/homedoc'
export APP_RESOURCES='App_Resources/documentscanner'
export PROJECT_NAME='homedoc'
```

You also need to set **your Apple Development Team** in the generated Xcode project under Signing & Capabilities, using your own Apple account. The upstream `.env.ci` contains the maintainer's own Apple team settings; do not reuse them for signing. You can rename the app display name by editing your fork's `App_Resources/documentscanner/iOS/Info.plist` (`CFBundleDisplayName` and `CFBundleName`) and supply your own icon assets before distribution.

**Step 6 — Build to simulator** (after dependencies are installed and any upstream custom CLI is correctly wired):

```bash
yarn
ns run ios --simulator --no-hmr --env.devlog
```

If this repository requires the modified CLI, replace `ns` with `PATH_TO_CLI_FOLDER/bin/ns` as described by the maintainer. NativeScript will use an installed simulator runtime. See `https://docs.nativescript.org/guide/running`.

## C. Install on your actual iPhone

1. Connect your unlocked iPhone to the Mac over USB; select **Trust This Computer** when prompted.
2. Prepare iOS native files: `ns prepare ios` (use the upstream custom CLI if necessary). Navigate to the generated `build/homedoc/ios` or configured iOS platform output; locate the `.xcworkspace` (or `.xcodeproj`) created by NativeScript/CocoaPods. Its precise path depends on the customized build settings.
3. Open the workspace in Xcode. Select your app target → **Signing & Capabilities** → enable automatic signing → select your **personal/team Apple account**. Replace any original maintainer identity with your own unique bundle identifier.
4. Select your connected iPhone as the Run destination. Allow Xcode to register the device and create a development provisioning profile.
5. On iPhone, if requested, enable **Settings → Privacy & Security → Developer Mode**, restart, and confirm.
6. Press **Run (▶)** in Xcode. Once it launches, you may also run `ns run ios --device <ID> --no-hmr --env.devlog` with device ID from `ns devices`, using the appropriate CLI.
7. Scan a fictional test bill, run the scanner's OCR, open the HomeDoc button in its floating action bar, review suggestions, then save. Reopen HomeDoc to verify persistence.

**Free Apple account:** Xcode personal teams can locally sign/test on a connected iPhone without paying for an Apple Developer Program membership, but their provisioning profiles expire after seven days and the app needs rebuilding/reinstallation. See Apple's account help at https://developer-mdn.apple.com/help/account/basics/about-your-developer-account

## D. iOS simulators and alternatives

| Method | Runs what? | Needs a Mac? | Suitable for scanner testing? |
|---|---|---|---|
| **Xcode iOS Simulator** | Built native iOS app | **Yes** | UI and logic; actual camera behavior requires iPhone |
| **Real iPhone from Xcode** | Native app | **Yes for local build/signing** | Best full workflow |
| **Safari prototype** | HTML/JS UI demo | No | Layout, form logic, local deadlines; not camera OCR |
| **TestFlight** | Signed uploaded beta | App must be built/uploaded | Great after build, developer membership required |
| **Third-party hosted device/simulator** | Uploaded signed build | Hosted Mac infrastructure | Varies by provider; still requires a valid iOS build |

NativeScript officially lists Windows/Linux as **not supporting local native iOS builds**. There is no equivalent to a regular, fully functional Xcode iOS simulator installed natively on Windows. Official sources: https://docs.nativescript.org/setup/ and https://developer.apple.com/documentation/xcode/running-your-app-on-simulated-or-physical-devices

## E. Optional experimental cloud AI backend (NOT needed for offline mode)

Install Node >= 20 on your development/server machine, then configure **server-side only**:

```bash
export OPENAI_API_KEY='your-private-provider-api-key'
export HOMEDOC_API_TOKEN='at-least-16-random-characters'
export HOMEDOC_HOST='127.0.0.1'
node /path/to/HomeDocAI-Starter/server/index.mjs
```

The default listens at `127.0.0.1:8787` and accepts authenticated POST `/v1/analyze`. It uses OpenAI Responses Structured Outputs, with `store:false`, sends OCR text only, and requires a verbal consent confirmation in the native UI each time. To connect from your actual iPhone, you need a reachable **HTTPS** endpoint (e.g. through a private TLS proxy with proper access control). Local-network HTTP should be used only during development, subject to iOS app transport/security restrictions. Never embed the OpenAI API key in the app. Never expose this dev server publicly without implementing rate limiting, TLS, proper authentication and logging safeguards.

## F. Test commands (no Xcode needed)

```bash
cd /path/to/HomeDocAI-Starter
node --test native/tests/*.test.mjs server/*.test.mjs
```

The tests are for offline extraction, cloud output checking, and installer behavior; they do not test iOS navigation or camera scanning.

## Troubleshooting
- **`ns doctor ios` fails:** fix local macOS, Xcode, CocoaPods, Ruby environment first.
- **NativeScript resolution or plugin errors:** configure upstream custom core/CLI and `portal:` dependencies; read upstream GitHub issues; do not assume a stock CLI works.
- **OpenCV/Tesseract not found:** place the full framework/static libraries where upstream README requires.
- **Provisioning/bundle errors:** remove original publisher signing IDs and use your own unique bundle identifier and Apple team.
- **OCR empty:** run OCR in the original scanner on that document; HomeDoc reads existing OCR, it does not trigger OCR itself.
- **No reminders on lock screen:** currently expected. The MVP stores deadlines in-app only; platform notifications remain an engineering task.
