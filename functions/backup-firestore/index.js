const functions = require("firebase-functions");
const { GoogleAuth } = require("google-auth-library");
const { Firestore } = require("@google-cloud/firestore");

const projectId = process.env.GCLOUD_PROJECT;
const bucketName = `${projectId}-firestore-backups`;

// Backup function that runs on schedule
exports.scheduledFirestoreBackup = functions.pubsub
  .schedule("0 2 * * *") // Daily at 2 AM
  .timeZone("UTC")
  .onRun(async (context) => {
    try {
      console.log("🛡️ Starting automated Firestore backup...");

      const auth = new GoogleAuth({
        scopes: ["https://www.googleapis.com/auth/datastore"],
      });

      const authClient = await auth.getClient();
      const timestamp = new Date().toISOString().split("T")[0];
      const outputUri = `gs://${bucketName}/${timestamp}`;

      // Perform backup
      const request = {
        method: "POST",
        url: `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default):exportDocuments`,
        headers: {
          "Content-Type": "application/json",
        },
        data: {
          outputUriPrefix: outputUri,
          // Optional: specify collections to backup
          collectionIds: ["profiles", "matches", "swipes", "messages", "chats"],
        },
      };

      const response = await authClient.request(request);

      console.log("✅ Backup initiated successfully");
      console.log("📍 Backup location:", outputUri);
      console.log("🔄 Operation name:", response.data.name);

      // Optional: Send notification
      await sendBackupNotification(true, outputUri);

      return response.data;
    } catch (error) {
      console.error("❌ Backup failed:", error);
      await sendBackupNotification(false, null, error.message);
      throw error;
    }
  });

// Manual backup trigger
exports.triggerBackup = functions.https.onRequest(async (req, res) => {
  // Add authentication check
  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  try {
    const auth = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/datastore"],
    });

    const authClient = await auth.getClient();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const outputUri = `gs://${bucketName}/manual-${timestamp}`;

    const request = {
      method: "POST",
      url: `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default):exportDocuments`,
      headers: {
        "Content-Type": "application/json",
      },
      data: {
        outputUriPrefix: outputUri,
        collectionIds: ["profiles", "matches", "swipes", "messages", "chats"],
      },
    };

    const response = await authClient.request(request);

    res.json({
      success: true,
      message: "Manual backup initiated",
      location: outputUri,
      operation: response.data.name,
    });
  } catch (error) {
    console.error("Manual backup failed:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Restore function (USE WITH EXTREME CAUTION)
exports.restoreFromBackup = functions.https.onRequest(async (req, res) => {
  // SECURITY: Add strong authentication here
  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  const { backupPath, adminToken } = req.body;

  // SECURITY CHECK - replace with your admin verification
  if (adminToken !== process.env.ADMIN_RESTORE_TOKEN) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    const auth = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/datastore"],
    });

    const authClient = await auth.getClient();

    const request = {
      method: "POST",
      url: `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default):importDocuments`,
      headers: {
        "Content-Type": "application/json",
      },
      data: {
        inputUriPrefix: backupPath,
        // Optional: specify collections to restore
        collectionIds: ["profiles", "matches", "swipes", "messages", "chats"],
      },
    };

    const response = await authClient.request(request);

    res.json({
      success: true,
      message: "Restore initiated",
      operation: response.data.name,
    });
  } catch (error) {
    console.error("Restore failed:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Helper function to send notifications
async function sendBackupNotification(success, location, error) {
  // Implement your notification logic here
  // Could send email, Slack message, webhook, etc.
  console.log(
    success
      ? "✅ Backup notification sent"
      : "❌ Backup failure notification sent"
  );
}
