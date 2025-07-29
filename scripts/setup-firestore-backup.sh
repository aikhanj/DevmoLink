#!/bin/bash
# Setup automated Firestore backups
# Run this once to set up daily backups

PROJECT_ID="your-firebase-project-id"
BUCKET_NAME="your-backup-bucket"
REGION="us-central1"

echo "🛡️ Setting up Firestore automated backups..."

# 1. Enable required APIs
echo "📡 Enabling required APIs..."
gcloud services enable datastore.googleapis.com
gcloud services enable cloudscheduler.googleapis.com
gcloud services enable cloudfunctions.googleapis.com

# 2. Create backup bucket
echo "🪣 Creating backup bucket..."
gsutil mb -l $REGION gs://$BUCKET_NAME-firestore-backups

# 3. Create daily backup schedule
echo "⏰ Creating daily backup schedule..."
gcloud scheduler jobs create http firestore-backup \
    --schedule="0 2 * * *" \
    --uri="https://firestore.googleapis.com/v1/projects/$PROJECT_ID/databases/(default):exportDocuments" \
    --http-method=POST \
    --headers="Content-Type=application/json" \
    --message-body="{\"outputUriPrefix\":\"gs://$BUCKET_NAME-firestore-backups/$(date +%Y-%m-%d)\"}" \
    --time-zone="UTC"

echo "✅ Backup setup complete!"
echo "📋 Daily backups will run at 2 AM UTC"
echo "🗂️ Backups stored in: gs://$BUCKET_NAME-firestore-backups"