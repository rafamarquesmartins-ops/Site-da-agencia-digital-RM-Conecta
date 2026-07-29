const { onSchedule } = require("firebase-functions/v2/scheduler");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

// You need to set this bucket up in Google Cloud Storage and give the
// App Engine default service account access to write to it.
const BUCKET_NAME = process.env.BACKUP_BUCKET_NAME || 'gs://rm-conecta-backups';

/**
 * Scheduled function that runs every 24 hours at 03:00 AM.
 * It triggers a Firestore export for the 'leads' and 'users' collections.
 */
exports.scheduledFirestoreExport = onSchedule(
  {
    schedule: "every day 03:00",
    timeZone: "Europe/Lisbon",
    timeoutSeconds: 300,
    memory: "256MiB",
  },
  async (event) => {
    try {
      const client = new admin.firestore.v1.FirestoreAdminClient();
      
      const projectId = process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT;
      const databaseName = client.databasePath(projectId, '(default)');

      const backupPath = \`\${BUCKET_NAME}/\${new Date().toISOString().split('T')[0]}\`;
      
      logger.info(\`Starting Firestore export to \${backupPath}\`);

      // Specifically export 'leads' and 'users' and 'users_deleted'
      const collectionIds = ['leads', 'users', 'users_deleted'];
      
      const [operation] = await client.exportDocuments({
        name: databaseName,
        outputUriPrefix: backupPath,
        // Leave collectionIds empty to export all collections
        collectionIds: collectionIds,
      });

      logger.info(\`Export operation started: \${operation.name}\`);
      
      return { success: true, operation: operation.name };
    } catch (error) {
      logger.error('Error during Firestore export', error);
      throw new Error('Export failed');
    }
  }
);
