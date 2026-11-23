import { Platform, Linking, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Directory, File, Paths } from 'expo-file-system';
import { INPUT_SIZE } from './modelService';

export type Source = 'camera' | 'gallery';

// Square crop: the model sees a 224x224 square, so letting the farmer frame the leaf avoids stretching the photo.
const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = { mediaTypes: 'images', allowsEditing: true, aspect: [1, 1], quality: 1 };

/** Opens camera or gallery. Returns the image URI, or null if cancelled / permission refused. */
export async function pickImage(source: Source): Promise<string | null> {
  if (source === 'camera' || Platform.OS === 'ios') {
    // Android's system photo picker needs no permission; the camera always does.
    const perm = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      const what = source === 'camera' ? 'camera' : 'photos';
      Alert.alert(
        `Allow ${what} access`,
        `CropDoctor needs ${what} access to check your leaf. Photos stay on your phone.`,
        perm.canAskAgain ? [{ text: 'OK' }] : [{ text: 'Cancel', style: 'cancel' }, { text: 'Open settings', onPress: () => Linking.openSettings() }],
      );
      return null;
    }
  }
  const result = source === 'camera'
    ? await ImagePicker.launchCameraAsync(PICKER_OPTIONS)
    : await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
  return result.canceled ? null : safeFileUri(result.assets[0].uri);
}

/**
 * Expo Go stores files in a folder literally named "%40owner%2Fslug", and that '%' can reach us unescaped
 * (from the picker, or after a router param round-trip). Image loaders then decode it into a wrong path.
 * Escape every '%' that isn't already "%25". Idempotent; a no-op for normal app paths, which contain no '%'.
 */
export const safeFileUri = (uri: string) => (uri.startsWith('file://') ? uri.replace(/%(?!25)/g, '%25') : uri);

/** Android can kill the app while the camera is open; this recovers the photo on restart. */
export async function getPendingImage(): Promise<string | null> {
  if (Platform.OS !== 'android') return null;
  const r = await ImagePicker.getPendingResultAsync();
  return r && 'assets' in r && !r.canceled && r.assets?.[0] ? safeFileUri(r.assets[0].uri) : null;
}

/**
 * Image URI -> 224x224 lossless PNG bytes (decoded to float32 RGB 0..255 by modelService; NO normalization).
 * maxWidth/maxHeight only downsample huge photos while decoding to keep memory low; output is still 224x224.
 */
export async function imageToPng(uri: string): Promise<Uint8Array<ArrayBuffer>> {
  const ctx = ImageManipulator.manipulate(uri, { maxWidth: 1024, maxHeight: 1024 });
  const image = await ctx.resize({ width: INPUT_SIZE, height: INPUT_SIZE }).renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.PNG });
  const file = new File(saved.uri);
  try {
    return await file.bytes();
  } finally {
    file.delete();
    image.release();
    ctx.release();
  }
}

/** Saves a smaller copy of the photo in app storage (the picker's cache files can be cleared by Android). */
export async function saveScanImage(uri: string, id: string): Promise<string> {
  const dir = new Directory(Paths.document, 'scans');
  dir.create({ idempotent: true, intermediates: true });
  const ctx = ImageManipulator.manipulate(uri, { maxWidth: 800, maxHeight: 800 });
  const image = await ctx.renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.85 });
  image.release();
  ctx.release();
  const dest = new File(dir, `${id}.jpg`);
  new File(saved.uri).move(dest);
  return dest.uri;
}
