import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import sharp from 'sharp';

admin.initializeApp();

const SIZES = [256, 512, 768, 1080];

export const onProfileImageUpload = functions.storage.object().onFinalize(async (object) => {
  const bucket = admin.storage().bucket(object.bucket);
  const filePath = object.name || '';
  if (!filePath.startsWith('profile_images/')) return;
  if (filePath.includes('/variants/')) return;

  const [buf] = await bucket.file(filePath).download();

  // LQIP (very small, blurred)
  const lqipBuf = await sharp(buf).resize(20).blur().toFormat('avif', { quality: 30 }).toBuffer();
  const blurDataURL = `data:image/avif;base64,${lqipBuf.toString('base64')}`;

  // Generate variants
  const variantUrls: Record<string, string> = {};
  await Promise.all(
    SIZES.map(async (w) => {
      const out = await sharp(buf)
        .resize({ width: w })
        .toFormat('avif', { quality: 60, effort: 4 })
        .toBuffer();
      const dest = filePath.replace(/([^/]+)$/, `variants/$1.${w}.avif`);
      const file = bucket.file(dest);
      await file.save(out, {
        contentType: 'image/avif',
        metadata: { cacheControl: 'public, max-age=31536000, immutable' },
      });
      variantUrls[String(w)] = `https://storage.googleapis.com/${object.bucket}/${dest}`;
    })
  );

  // Optionally: write blur + variants into the user doc if path includes uid
  // Expected path: profile_images/{uid}/{filename}
  const m = filePath.match(/^profile_images\/([^/]+)\//);
  const uid = m?.[1];
  if (uid) {
    await admin.firestore().collection('users').doc(uid).set(
      {
        photo: {
          originalPath: filePath,
          variants: variantUrls,
          blurDataURL,
        },
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  }
});