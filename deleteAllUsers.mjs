// deleteAllUsers.js
// Deletes all Firebase Auth users in your project using the Admin SDK.
// 1. Install dependencies: npm install firebase-admin
// 2. Download your service account key from Firebase Console and save as serviceAccountKey.json in the same directory.
// 3. Run: node deleteAllUsers.js

import admin from "firebase-admin";
import path from "path";

// Update the path if your key is elsewhere
const serviceAccount = import(
  path.join(process.cwd(), "serviceAccountKey.json")
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function deleteAllUsers(nextPageToken) {
  // List batch of users, 1000 at a time.
  const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
  const uids = listUsersResult.users.map((userRecord) => userRecord.uid);

  if (uids.length > 0) {
    await admin.auth().deleteUsers(uids);
    console.log(`Deleted ${uids.length} users`);
  }

  if (listUsersResult.pageToken) {
    // Continue deleting next batch
    await deleteAllUsers(listUsersResult.pageToken);
  }
}

// Run the deletion
(async () => {
  try {
    await deleteAllUsers();
    console.log("All users deleted");
    process.exit();
  } catch (error) {
    console.error("Error deleting users:", error);
    process.exit(1);
  }
})();
