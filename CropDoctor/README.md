# CropDoctor

Offline crop-disease detection for Android. CropDoctor runs your own MobileNetV2 TensorFlow Lite model
(PlantVillage, 38 classes) on the phone. Photos are never uploaded.

## How the AI part works

| Step | Where | Detail |
| --- | --- | --- |
| Pick photo | `src/services/imageService.ts` | Camera or gallery, square crop so the leaf isn't stretched |
| Resize | same | `expo-image-manipulator` → 224×224, saved as **lossless PNG** |
| To tensor | `src/utils/tensor.ts` | PNG decoded in JS → `Float32Array` RGB, HWC, values **0–255** |
| Inference | `src/services/modelService.ts` | `react-native-fast-tflite` (TFLite C++ on a native thread) |
| Mapping | `src/services/diseaseService.ts` | argmax index → `src/data/class_names.json` → `src/data/diseases.json` |

**No normalization in the app.** The model's `Rescaling(1/127.5, -1)` layer was folded into Conv1 by the
TFLite converter. Verified: with 0–255 input, 5/5 PlantVillage test leaves were classified correctly at
99.8–100%. With [-1, 1] input (double normalization), every one came out as `Corn___healthy` at about 70%.

`class_names.json` was checked against the TFDS `plant_village` `_LABELS` list: all 38 entries in the same order.
That order is not alphabetical.

At load time the app also checks that the model input is `float32 [1,224,224,3]` and the output is `[1,38]`.

## Requirements

- Node.js 22.18+ (tested with 26)
- Android Studio / Android SDK, with an emulator or a USB-debugging phone
- JDK 17+ (tested with 21)

TFLite needs native code, so **Expo Go cannot run the model on the phone**. The real app is the CropDoctor APK (below).

### Quick try in Expo Go (dev only, model runs on your PC)

In Expo Go the app detects that it can't load TFLite. It then sends the same preprocessed 224×224 PNG to a small
Python server on your PC, which runs the same `.tflite` and returns the 38 probabilities. The APK never does this.

```sh
pip install pillow numpy ai-edge-litert
npm run model-server      # terminal 1: python tools/model_server.py  (port 8765)
npm run go                # terminal 2: Metro for Expo Go, then scan the QR code in Expo Go
```

Phone and PC must be on the same Wi-Fi, and Windows Firewall must allow Python and Node.
Over USB instead: `adb reverse tcp:8081 tcp:8081 && adb reverse tcp:8765 tcp:8765`, then `npx expo start --go --localhost`.
The home screen shows "PC model server (Expo Go dev mode)" when this is active.

## Build an APK

### Cloud (recommended on Windows / OneDrive)

The project is linked to Expo as `@mgxcoder/cropdoctor`.

```sh
cd CropDoctor
npm install
npx eas-cli@latest build -p android --profile preview       # standalone APK, runs without a PC
npx eas-cli@latest build -p android --profile development   # dev-client APK (live reload via `npx expo start`)
```

When the build finishes, open the link it prints on the phone, or download the APK and run `adb install -r app.apk`.

### Local

Local builds **fail inside OneDrive / long paths on Windows**. The C++ build exceeds the 260-character path limit
and OneDrive locks Gradle's cache files. Copy the project to a short path outside OneDrive (e.g. `C:\dev\CropDoctor`) first:

```sh
npm install
npx expo run:android        # builds the native dev app, installs it, starts Metro
```

Later, after JS-only changes: `npx expo start` and open the installed CropDoctor app.
Re-run `npx expo run:android` after adding or changing native packages or `app.json` plugins.

Release APK, built locally:

```sh
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease      # Windows: gradlew.bat assembleRelease
# -> android/app/build/outputs/apk/release/app-release.apk  (signed with the debug key; fine for testing)
```


## Tests

```sh
npm test            # PNG decoder + float conversion vs PIL fixtures (all 5 PNG filter types), top-k
npm run typecheck
npx expo-doctor
```

### Compare the phone with Colab / desktop

1. In the app, open a result and scroll to **Other possibilities**. The last line shows the raw model output,
   e.g. `Model label #31: Tomato___Late_blight (99.9860%)`.
2. Run the same image through the reference script. It uses identical preprocessing:
   ```sh
   pip install pillow numpy ai-edge-litert       # or tensorflow
   python tools/reference_predict.py leaf.jpg
   # in Colab, also against your Keras model:
   python reference_predict.py leaf.jpg --keras /content/model.keras
   ```
3. Use a **square** image so the in-app crop doesn't change it. The class index and name should match.
   Confidence should agree to within a fraction of a percent; small differences come from Android's resize
   versus PIL's.

## Configuration

- Confidence threshold: `CONFIDENCE_THRESHOLD` in `src/services/modelService.ts` (default `0.7`).
- Disease text: `src/data/diseases.json`, keyed by the exact class label. Healthy classes are generated in
  `diseaseService.ts`.

## Limitations

- The model only knows the 38 PlantVillage classes (14 crops). Any other crop or disease will be forced into
  one of them, sometimes with high confidence.
- PlantVillage photos are single leaves on plain backgrounds. Field photos (cluttered background, several
  leaves, poor light) are less accurate than the test numbers above.
- A high confidence is not a diagnosis. Disease information is general guidance, not reviewed by an
  agronomist, and deliberately contains no pesticide names or doses.
- Very large photos are downsampled to ≤1024 px while decoding (to save memory) before the 224×224 resize.
- History keeps the latest 100 scans on the device. There is no manual delete or export.
- Android-first. iOS should work through the same code but hasn't been built or tested.
