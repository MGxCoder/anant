import { Asset } from 'expo-asset';
import Constants from 'expo-constants';
import { TurboModuleRegistry } from 'react-native';
import { fetch } from 'expo/fetch';
import type { TfliteModel } from 'react-native-fast-tflite';
import classNames from '@/data/class_names.json';
import { pngToModelInput } from '@/utils/tensor';

export const INPUT_SIZE = 224;
/** Predictions below this are shown as "unable to confidently identify". */
export const CONFIDENCE_THRESHOLD = 0.7;

/**
 * Expo Go has no native TFLite (Nitro) module. There, dev only, the same 224x224 PNG is sent to
 * tools/model_server.py on the PC running Metro. The APK and dev builds have the module and always run on-device.
 */
export const PC_SERVER_MODE = TurboModuleRegistry.get('NitroModules') == null;
const timeout = (ms: number) => { const c = new AbortController(); setTimeout(() => c.abort(), ms); return c.signal; };
const PC_SERVER = `http://${Constants.expoConfig?.hostUri?.split(':')[0] ?? 'localhost'}:8765`;

let modelPromise: Promise<TfliteModel | null> | null = null;

/** Loads the model once (or checks the PC server in Expo Go); a failed load is retried on the next call. */
export function loadModel(): Promise<TfliteModel | null> {
  modelPromise ??= (PC_SERVER_MODE ? checkServer() : load()).catch((e) => {
    modelPromise = null;
    throw e;
  });
  return modelPromise;
}

async function load() {
  // Required lazily: importing it in Expo Go would crash because the native module doesn't exist there.
  const { loadTensorflowModel } = require('react-native-fast-tflite') as typeof import('react-native-fast-tflite');
  // expo-asset copies the bundled model to a file:// path. fast-tflite's Android loader only reads URLs,
  // so passing require() directly would break in release APKs (resource names are not URLs).
  const asset = await Asset.fromModule(require('../../assets/models/crop_disease_model.tflite')).downloadAsync();
  if (!asset.localUri) throw new Error('Model file crop_disease_model.tflite could not be loaded from the app bundle.');
  const model = await loadTensorflowModel({ url: asset.localUri }, []);

  const input = model.inputs[0], output = model.outputs[0];
  const wantIn = `1,${INPUT_SIZE},${INPUT_SIZE},3`, wantOut = `1,${classNames.length}`;
  if (model.inputs.length !== 1 || input.dataType !== 'float32' || input.shape.join() !== wantIn)
    throw new Error(`Model input is ${input?.dataType} [${input?.shape}], expected float32 [${wantIn}].`);
  if (model.outputs.length !== 1 || output.dataType !== 'float32' || output.shape.join() !== wantOut)
    throw new Error(`Model output is [${output?.shape}] but class_names.json has ${classNames.length} classes.`);
  return model;
}

async function checkServer() {
  try {
    const res = await fetch(PC_SERVER, { signal: timeout(5000) });
    const { classes } = await res.json();
    if (classes !== classNames.length) throw new Error(`server has ${classes} classes`);
  } catch (e) {
    throw new Error(`Expo Go mode: start the PC model server (python tools/model_server.py) on the same Wi-Fi. ${PC_SERVER} — ${e instanceof Error ? e.message : e}`);
  }
  return null;
}

/** 224x224 PNG -> the 38 softmax probabilities. Native inference runs off the JS thread. */
export async function predict(png: Uint8Array<ArrayBuffer>): Promise<Float32Array> {
  const model = await loadModel();
  if (!model) {
    const res = await fetch(`${PC_SERVER}/predict`, { method: 'POST', body: png, signal: timeout(20000) });
    const json = await res.json();
    if (!res.ok || json.probabilities?.length !== classNames.length) throw new Error(json.error ?? 'Bad server response');
    return Float32Array.from(json.probabilities);
  }
  const input = pngToModelInput(png, INPUT_SIZE); // float32 RGB 0..255, not normalized
  const [out] = await model.run([input.buffer as ArrayBuffer]);
  return new Float32Array(out);
}
