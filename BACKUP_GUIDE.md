# 🛡️ Firebase Backup & Restore Guide

## Overview

This guide explains how to protect your Firestore data from accidental deletion (like the nuclear reset incident) using the implemented backup system.

## 🚀 Quick Setup

### 1. **Access Backup Dashboard**

Navigate to: `http://localhost:3000/security-audit`

You'll see a **🛡️ Backup & Restore** section with three options:

- **📦 Create Backup** - Download complete database backup
- **📤 Restore Backup** - Upload and restore from backup file
- **🧪 Test Profiles** - Restore fake profiles for testing

### 2. **Create Your First Backup**

```bash
# Web Interface (Recommended)
1. Go to http://localhost:3000/security-audit
2. Click "📥 Download Backup"
3. Save the JSON file somewhere safe

# Direct API call
curl -X POST http://localhost:3000/api/admin/backup-firestore \
  -H "Cookie: your-session-cookie" \
  --output backup-$(date +%Y-%m-%d).json
```

## 🔄 Backup Types

### **1. Manual Web Backups (Easiest)**

- ✅ **One-click backup** from security audit page
- ✅ **Automatic download** as JSON file
- ✅ **Complete data** including metadata
- ✅ **Admin-only access** for security

**When to use:** Before any risky operations, weekly backups

### **2. Automated Cloud Backups (Production)**

- ✅ **Daily automatic backups** at 2 AM UTC
- ✅ **Google Cloud Storage** integration
- ✅ **Enterprise-grade** reliability
- ✅ **Scheduled via Cloud Scheduler**

**When to use:** Production environments, critical data

### **3. Cloud Function Backups (Advanced)**

- ✅ **Custom backup logic** and notifications
- ✅ **Manual trigger** endpoints
- ✅ **Restore functionality** included
- ✅ **Integration** with monitoring systems

**When to use:** Complex workflows, custom requirements

## 📋 What Gets Backed Up

```json
{
  "_metadata": {
    "collections": 8,
    "totalDocuments": 1245,
    "timestamp": "2024-01-15T10:30:00.000Z",
    "adminUser": "ajumashukurov@gmail.com"
  },
  "profiles": [
    { "id": "user@example.com", "data": {...} }
  ],
  "matches": [...],
  "swipes": [...],
  "messages": [...],
  "chats": [...],
  "likes": [...],
  "users": [...],
  "notifications": [...]
}
```

## 🔧 Configuration

### **Admin Access**

Only these emails can create/restore backups:

```typescript
const ADMIN_EMAILS = [
  "ajumashukurov@gmail.com", // Current user
  "admin@devmolink.com", // Add more admins here
];
```

### **Collections to Backup**

```typescript
const COLLECTIONS_TO_BACKUP = [
  "profiles", // User profiles
  "matches", // User matches
  "swipes", // Swipe history
  "messages", // Chat messages
  "chats", // Chat metadata
  "likes", // Like data
  "users", // User accounts
  "notifications", // Notifications
];
```

## 🚨 Emergency Restore Procedures

### **If Data Gets Deleted:**

**Step 1: Stop the damage**

```bash
# Immediately stop your app if nuclear reset is running
pm2 stop devmolink
# or
pkill -f "npm run dev"
```

**Step 2: Restore from backup**

1. Go to `http://localhost:3000/security-audit`
2. Click **📤 Restore Backup**
3. Select your most recent backup file
4. Confirm restoration

**Step 3: Verify data**

```bash
# Check Firebase console or run:
curl http://localhost:3000/api/admin/backup-firestore
```

### **If No Backup Exists:**

1. Use **🧪 Restore Test Data** for fake profiles
2. Ask users to re-register
3. Implement automated backups immediately

## 📊 Backup Best Practices

### **Frequency**

- **Development:** Before risky changes
- **Staging:** Daily
- **Production:** Multiple times daily + before deployments

### **Storage**

- **Local:** For immediate recovery
- **Cloud Storage:** For disaster recovery
- **Version Control:** For code-related backups
- **Multiple Locations:** For critical data

### **Testing**

```bash
# Test backup creation
curl -X POST http://localhost:3000/api/admin/backup-firestore

# Test restore (with test data)
# Use the web interface with a small backup file
```

## 🛠️ Advanced Setup

### **1. Automated Cloud Backups**

```bash
# Setup script (requires Google Cloud CLI)
cd scripts
chmod +x setup-firestore-backup.sh
./setup-firestore-backup.sh
```

### **2. Cloud Functions**

```bash
# Deploy backup functions
cd functions/backup-firestore
npm install
firebase deploy --only functions
```

### **3. Monitoring**

```javascript
// Add to your monitoring system
fetch("/api/admin/backup-firestore").then((r) =>
  r.ok ? "✅ Backup healthy" : "❌ Backup failed"
);
```

## 🔒 Security Considerations

### **Access Control**

- ✅ **Admin-only** backup/restore endpoints
- ✅ **Session-based** authentication
- ✅ **Logging** of all backup operations
- ✅ **IP restrictions** (optional, configure in middleware)

### **Data Protection**

- ✅ **Encrypted** backup files (JSON format)
- ✅ **No sensitive data** in URLs or logs
- ✅ **Audit trail** of who performed operations
- ✅ **Rate limiting** on backup endpoints

### **File Handling**

- ✅ **File size limits** for uploads
- ✅ **Format validation** for restore files
- ✅ **Error handling** for corrupted backups
- ✅ **Cleanup** of temporary files

## 🆘 Troubleshooting

### **Backup Creation Fails**

```
Error: "Failed to create backup"
Solutions:
1. Check Firebase permissions
2. Verify admin email in ADMIN_EMAILS array
3. Check Firestore security rules
4. Ensure collections exist
```

### **Restore Fails**

```
Error: "Invalid backup file format"
Solutions:
1. Verify JSON file structure
2. Check _metadata object exists
3. Ensure file isn't corrupted
4. Try with smaller backup file first
```

### **Access Denied**

```
Error: "Admin access required"
Solutions:
1. Add your email to ADMIN_EMAILS
2. Ensure you're logged in
3. Check session hasn't expired
4. Verify authentication working
```

## 📈 Monitoring

### **Backup Health Check**

```bash
# Check backup system status
curl http://localhost:3000/api/admin/backup-firestore
```

### **Collection Sizes**

Monitor collection growth to estimate backup times:

```javascript
// Returns document counts per collection
fetch("/api/admin/backup-firestore")
  .then((r) => r.json())
  .then((data) => console.log("Collections:", data.collections));
```

---

## ⚡ Quick Reference

| Action            | URL                            | Method  |
| ----------------- | ------------------------------ | ------- |
| Create Backup     | `/api/admin/backup-firestore`  | POST    |
| Restore Backup    | `/api/admin/restore-firestore` | POST    |
| Restore Test Data | `/api/admin/restore-profiles`  | POST    |
| Health Check      | `/api/admin/backup-firestore`  | GET     |
| Web Interface     | `/security-audit`              | Browser |

**Remember:** Always test your restore process with non-production data first! 🧪
