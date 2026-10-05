import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

export type PickedPhoto = { uri: string; base64: string };

/** Size of the longest side after resizing; plenty for an avatar and keeps uploads small. */
const PHOTO_SIZE = 512;

/** Lets the member pick and square-crop a photo, then shrinks it to a small JPEG for upload. */
export async function pickProfilePhoto(): Promise<PickedPhoto | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) return null;

  const resize = asset.width >= asset.height ? { width: PHOTO_SIZE } : { height: PHOTO_SIZE };
  const rendered = await ImageManipulator.manipulate(asset.uri).resize(resize).renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true });
  if (!saved.base64) return null;

  return { uri: saved.uri, base64: saved.base64 };
}
