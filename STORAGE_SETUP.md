# Firebase Storage Setup

## Overview
Files are now stored in Firebase Storage instead of being embedded as base64 data URLs in Firestore. This solves the "Property array contains an invalid nested entity" error caused by large files exceeding Firestore's 1MB limit.

## Files Created/Modified

### 1. Storage Rules (`storage.rules`)
- Created security rules for Firebase Storage
- Admins can upload course files (10MB limit)
- Authenticated users can read course files
- Users can upload their own avatars (2MB limit)

### 2. Firebase Config (`lib/firebase/config.ts`)
- Added Firebase Storage initialization
- Exported `storage` instance

### 3. Storage Service (`lib/firebase/storage.ts`)
- `uploadFile()` - Generic file upload
- `uploadCourseFile()` - Upload course documents
- `deleteFile()` - Delete files from Storage

### 4. Course Creator (`components/admin/AdminCourseCreator.tsx`)
- Removed base64 data URL storage
- Now passes File object to be uploaded to Storage
- Files are uploaded after course creation

### 5. App.tsx
- Updated to handle file uploads
- Creates course first, then uploads file to Storage
- Updates course with Storage download URL

### 6. Firebase Config (`firebase.json`)
- Added storage rules configuration

## Setup Steps

### 1. Enable Firebase Storage
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Storage** → **Get started**
4. Choose **Start in production mode** (we'll set up rules)
5. Select a location (same as Firestore if possible)
6. Click **Enable**

### 2. Deploy Storage Rules
```bash
npx firebase deploy --only storage
```

Or deploy everything:
```bash
npx firebase deploy
```

### 3. Verify Environment Variables
Make sure your `.env.local` includes:
```env
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
```

## How It Works

1. **User uploads file** → File is stored in component state
2. **User creates course** → Course is created in Firestore (without file)
3. **File uploads to Storage** → File is uploaded to `courses/{courseId}/{filename}`
4. **Course updated** → Course module is updated with Storage download URL

## Benefits

- ✅ No more Firestore size limits (files stored separately)
- ✅ Better performance (files served from CDN)
- ✅ Lower Firestore costs (no large documents)
- ✅ Proper file management (can delete files independently)

## File Size Limits

- **Course files**: 10MB maximum
- **User avatars**: 2MB maximum

These limits are enforced both client-side and in Storage rules.

