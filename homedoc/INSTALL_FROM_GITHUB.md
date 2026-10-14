# Build and install HomeDoc AI on iPhone

## A. Build for free in GitHub Actions

1. Open this repository → **Actions** → **HomeDoc AI - iOS Simulator** → **Run workflow**.
2. Open the resulting run. Both **HomeDoc unit tests** and **Compile unsigned iOS Simulator app** must pass.
3. Under **Artifacts**, download `HomeDocAI-iOS-Simulator`.
4. The artifact is **not an iPhone IPA**. It is a ZIP of a Simulator-only `.app` and only runs inside Apple's iOS Simulator on a Mac.

The workflow is deliberately unsigned; public GitHub macOS CI provides macOS/Xcode but **not** your Apple signing identity.

## B. Install on an actual iPhone using a Mac + free Apple account

1. On a Mac, install Xcode, the iOS device support tools and NativeScript dependencies following [upstream build instructions](../Readme.md).
2. Clone **this** HomeDoc AI repository with `git clone --recurse-submodules` (not the unmodified upstream repo).
3. Install the modified CLI (`@akylas/nativescript-cli`), Yarn 4 and upstream iOS native resources, then build/prepare iOS with the current upstream instructions.
4. Open the generated iOS `.xcworkspace` in Xcode.
5. Sign into Xcode using your Apple Account (**Xcode → Settings → Accounts**), choose your own team under **Signing & Capabilities**, enable **Automatically manage signing**, and use a unique bundle identifier.
6. Connect and trust your iPhone; select it as the Run destination; enable Developer Mode on iPhone if prompted.
7. Press **Run** in Xcode. A free Personal Team can be used for local testing but provisioning is short-lived (normally seven days).

Using this route requires a real Mac or interactive remote Mac with USB/device access; GitHub Actions is a build worker rather than an interactive Xcode desktop.

## C. TestFlight / cloud signed IPA

To distribute to an iPhone without a local Mac, you generally need an Apple Developer Program membership and signing materials for the target distribution type. A future CI workflow can accept Apple certificate and provisioning profile as **GitHub Actions encrypted secrets** and create a signed build. **No Apple signing secrets have been uploaded/configured** here. TestFlight requires a correctly signed build and App Store Connect setup.

## D. Try the browser version immediately

On Linux:
```bash
cd /home/baba/tmp/tmp/homedoc_ai/HomeDocAI-Starter
python3 -m http.server 8000 --bind 0.0.0.0
```

Open `http://localhost:8000/preview/` on the laptop; on iPhone in the same local network open `http://<laptop-LAN-IP>:8000/preview/`. This is an interactive **browser prototype**, not the camera/OCR native application.

## Build limitations / references

- [OSS Document Scanner upstream build guidance](../Readme.md)
- [GitHub-hosted runners](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)
- [NativeScript iOS build CLI](https://old.docs.nativescript.org/tooling/docs-cli/project/testing/build-ios)
- [Apple: run on a physical device](https://developer.apple.com/documentation/xcode/building-and-running-an-app)
- [Apple: provisioning limits](https://developer.apple.com/support/compare-memberships/)
