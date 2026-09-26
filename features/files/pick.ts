import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { ActionSheetIOS, Alert, Platform } from 'react-native';

import { guessMimeType, type UploadSource } from '@/lib/upload';

export type PickKind = 'media' | 'files';

/** Photos and videos from the library; the picker copies them to a readable file first. */
export async function pickMedia(multiple = true): Promise<UploadSource[]> {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos', 'images'], quality: 1, allowsMultipleSelection: multiple, selectionLimit: multiple ? 20 : 1 });
  if (result.canceled) return [];
  return result.assets.map((a, i) => {
    const name = a.fileName ?? `media-${Date.now()}-${i + 1}.${a.type === 'video' ? 'mp4' : 'jpg'}`;
    return {
      uri: a.uri,
      name,
      mimeType: guessMimeType(name, a.mimeType),
      size: a.fileSize ?? 0,
      durationMs: a.duration ?? null,
      width: a.width || null,
      height: a.height || null,
    };
  });
}

/** Any supported document from Files / iCloud Drive. */
export async function pickDocuments(multiple = true): Promise<UploadSource[]> {
  const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple });
  if (result.canceled) return [];
  return result.assets.map((a) => ({ uri: a.uri, name: a.name, mimeType: guessMimeType(a.name, a.mimeType), size: a.size ?? 0 }));
}

/** Asks where to take files from (library or Files), then returns what was chosen. */
export function chooseSource(title = 'Fayl yuklash'): Promise<PickKind | null> {
  return new Promise((resolve) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { title, options: ['Galereya (rasm va video)', 'Fayllar', 'Bekor qilish'], cancelButtonIndex: 2 },
        (index) => resolve(index === 0 ? 'media' : index === 1 ? 'files' : null),
      );
      return;
    }
    Alert.alert(title, undefined, [
      { text: 'Galereya', onPress: () => resolve('media') },
      { text: 'Fayllar', onPress: () => resolve('files') },
      { text: 'Bekor qilish', style: 'cancel', onPress: () => resolve(null) },
    ]);
  });
}

export async function pickForUpload(multiple = true): Promise<UploadSource[]> {
  const kind = await chooseSource();
  if (kind === 'media') return pickMedia(multiple);
  if (kind === 'files') return pickDocuments(multiple);
  return [];
}
