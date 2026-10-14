# HomeDoc AI — local Android build and testing

## Verified laptop workspace (October 2026)

- Workspace: `/home/baba/tmp/tmp/homedoc_ai/`
- NativeScript project: `/home/baba/tmp/tmp/homedoc_ai/HomeDocAI-GitHub/`
- Android SDK & emulator: `/home/baba/tmp/tmp/homedoc_ai/android-sdk/`
- Project JDK: Temurin 17 in `/home/baba/tmp/tmp/homedoc_ai/jdk17/`
- Emulator name: `HomeDoc_Pixel`, Android 15 / Google APIs / x86_64.
- Custom NativeScript CLI: `/home/baba/tmp/tmp/homedoc_ai/.cli/`.
- Full Android source modules include OpenCV/Tesseract from upstream's `dev_resources/android.zip`.
- `scrcpy` viewer at `/home/baba/tmp/tmp/homedoc_ai/scrcpy/scrcpy`.

## Build APK from your laptop terminal

```bash
source /home/baba/tmp/tmp/homedoc_ai/env_android.sh
cd /home/baba/tmp/tmp/homedoc_ai/HomeDocAI-GitHub
ns doctor android
node --test homedoc/tests/*.test.mjs homedoc/server/*.test.mjs
ns build android --env.devlog
find build/homedoc -type f -name '*.apk' -print
```

The first build may be slow due to native plugins and Gradle. The environment script keeps Gradle package caches on the large Data disk.

## Start the virtual Android phone

```bash
source /home/baba/tmp/tmp/homedoc_ai/env_android.sh
emulator -avd HomeDoc_Pixel -no-snapshot -no-boot-anim -no-audio -gpu swiftshader_indirect -accel on
```

When launching the emulator in an environment where the emulator GUI fails, start it headlessly and mirror its screen using scrcpy:

```bash
emulator -avd HomeDoc_Pixel -no-window -no-snapshot -no-boot-anim -no-audio -gpu swiftshader_indirect -accel on
# In another terminal:
source /home/baba/tmp/tmp/homedoc_ai/env_android.sh
/home/baba/tmp/tmp/homedoc_ai/scrcpy/scrcpy -s emulator-5554 --no-audio
```

Do not launch two emulator instances with the same AVD simultaneously.

## Install and open the APK

```bash
source /home/baba/tmp/tmp/homedoc_ai/env_android.sh
cd /home/baba/tmp/tmp/homedoc_ai/HomeDocAI-GitHub
adb devices
# Replace the path below with the APK shown by the find command above:
adb install -r /path/to/HomeDocAI-debug.apk
adb shell monkey -p dev.babahadjsaid.homedocai 1
```

To inspect logs: `adb logcat -d | grep -E 'AndroidRuntime|NativeScript|HomeDoc'`. Use `adb exec-out screencap -p > screenshot.png` for screenshots.

## Notes

The emulator does **not** accurately test camera capture. Use a real Android phone for camera/OCR testing. The HomeDoc add-on relies on existing scanner OCR and currently stores unencrypted metadata; use sample documents only. Passing unit tests does not prove that every native UI workflow works.

Official docs: [NativeScript on Linux](https://docs.nativescript.org/setup/linux), [Android emulator command line](https://developer.android.com/studio/run/emulator-commandline), [OSS Document Scanner upstream build](https://github.com/ossappscollective/OSS-DocumentScanner/blob/main/Readme.md), [scrcpy Linux](https://github.com/Genymobile/scrcpy/blob/master/doc/linux.md).

## Verified end-to-end sample TARI test (October 14, 2026)

The public synthetic fixture is `homedoc/fixtures/TARI_2027_FACSIMILE.pdf`.

1. Start `HomeDoc_Pixel` (Android 15).
2. Run HomeDoc AI. In the **Add** tab tap **Open scanner for PDF import**.
3. On the scanner screen tap the document-plus icon, select **Downloads → TARI_2027_FACSIMILE.pdf** (or copy the test fixture there with `adb push`).
4. Choose **Each page as an image → Just once** and confirm the crop with the bottom checkmark.
5. In the edit screen use the bottom OCR (text-recognition) action. Choose an OCR quality and language. Download an OCR model if prompted and tap **Start**.
6. Return to the scanner document list, open the **HomeDoc AI** button, select the imported document, and verify the review form.
7. The emulator test produced **bill / 2027-07-31 / 73.20 / EUR**. Explicitly confirm those fields and save. The HomeDoc dashboard then displays **1 saved deadline**.

This was an actual Android PDF picker → import/crop → Tesseract OCR → HomeDoc review → confirmed deadline test, separate from the Node unit test. No real taxpayer information was used.

## Live laptop webcam as emulator camera

The Android emulator documentation supports host webcams via `-camera-back webcam0`. Check with `emulator -webcam-list`, then restart your virtual Android phone using:

```bash
source /home/baba/tmp/tmp/homedoc_ai/env_android.sh
adb emu kill
emulator -avd HomeDoc_Pixel -no-window -no-snapshot -no-boot-anim -no-audio -gpu swiftshader_indirect -accel on -camera-back webcam0 -camera-front emulated -memory 3072
```

In another terminal use `/home/baba/tmp/tmp/homedoc_ai/scrcpy/scrcpy -s emulator-5554 --no-audio` to see the screen. Then open the scanner and tap the camera icon. The emulator on this laptop detected the built-in webcam as `webcam0`; while the preview was active, the emulator held `/dev/video0` and Android's camera service reported the app as the active camera client.

These camera tests confirm a live camera device/preview connection, **not** the image quality or OCR accuracy of a real printed bill. Do not use the webcam for private documents when screen sharing.

Sources: [Android official emulator command line camera options](https://developer.android.com/studio/run/emulator-commandline), [NativeScript Linux development setup](https://docs.nativescript.org/setup/linux).

## HomeDoc OCR quality preferences

On Android, open **HomeDoc AI → Settings → OCR quality**:

- **Low / Fast:** Tesseract `tessdata_fast` (favor speed).
- **Medium / Balanced:** Tesseract `tessdata` (general-purpose).
- **High / Accurate:** Tesseract `tessdata_best` (favor recognition quality, larger and slower).

The chosen setting updates the original scanner's `ocrService.dataType` and is persisted in `ApplicationSettings` as `tesseract_datatype`. The HomeDoc Settings card reports which languages are selected and whether the associated language files are present. **Download missing language files** uses the scanner's own download handler and asks for confirmation.

The scanner's OCR language list remains managed by the original OCR interface. The new setting affects future OCR passes, not documents already processed. In emulator testing, all three selections changed the persisted model, and the English fast model was downloaded successfully (~3.9 MB).
