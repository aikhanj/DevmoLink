import imageCompression from 'browser-image-compression';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

export async function compressAndUpload(file: File, path: string) {
  const compressed = await imageCompression(file, {
    maxWidthOrHeight: 1280,
    maxSizeMB: 0.6,
    useWebWorker: true,
    initialQuality: 0.8,
  });

  const storage = getStorage();
  const storageRef = ref(storage, path);

  const metadata = {
    contentType: compressed.type || 'image/jpeg',
    cacheControl: 'public, max-age=31536000, immutable',
  };

  const snap = await uploadBytesResumable(storageRef, compressed, metadata);
  return await getDownloadURL(snap.ref);
}