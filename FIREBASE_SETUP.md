# Firebase Setup Guide

This guide will help you set up Firebase Hosting and Authentication for SimpleLMS.

## Prerequisites

1. A Google account
2. Node.js installed
3. Firebase CLI installed (already added as dev dependency)

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Follow the setup wizard:
   - Enter project name (e.g., "simplelms")
   - Enable/disable Google Analytics (optional)
   - Click "Create project"

## Step 2: Enable Authentication

1. In Firebase Console, go to **Authentication** → **Get started**
2. Enable the following sign-in methods:
   - **Email/Password** (enable)
   - **Google** (enable)
3. For Google sign-in:
   - Click on Google
   - Enable it
   - Add your project's support email
   - Save

## Step 3: Create Firestore Database

1. In Firebase Console, go to **Firestore Database** → **Create database**
2. Choose **Start in production mode** (we'll set up rules later)
3. Select a location (choose closest to your users)
4. Click **Enable**

## Step 4: Get Firebase Configuration

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll down to "Your apps"
3. Click the **Web** icon (`</>`) to add a web app
4. Register your app:
   - App nickname: "SimpleLMS"
   - Check "Also set up Firebase Hosting" (optional)
   - Click **Register app**
5. Copy the Firebase configuration object

## Step 5: Configure Environment Variables

1. Open `.env.local` in your project root
2. Add your Firebase configuration:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef

# Gemini API Key (if needed)
GEMINI_API_KEY=your_gemini_api_key
```

## Step 6: Initialize Firebase in Your Project

1. Login to Firebase CLI:
   ```bash
   npm run firebase:init
   # Or: npx firebase login
   ```

2. Initialize Firebase:
   ```bash
   npx firebase init
   ```

3. Select the following:
   - ✅ Firestore
   - ✅ Hosting
   - Use existing project (select your project)
   - Firestore rules file: `firestore.rules` (already created)
   - Firestore indexes file: `firestore.indexes.json` (already created)
   - Public directory: `dist`
   - Single-page app: **Yes**
   - Set up automatic builds: **No** (or Yes if using GitHub Actions)

## Step 7: Update .firebaserc

Edit `.firebaserc` and replace `your-project-id` with your actual Firebase project ID.

## Step 8: Deploy Firestore Rules

```bash
npx firebase deploy --only firestore:rules
```

## Step 9: Build and Deploy

1. Build your app:
   ```bash
   npm run build
   ```

2. Deploy to Firebase Hosting:
   ```bash
   npm run firebase:deploy:hosting
   # Or: npx firebase deploy --only hosting
   ```

3. Your app will be available at: `https://your-project-id.web.app`

## Step 10: Set Up Initial Admin User

After deploying, you'll need to manually set up the first admin user:

1. Sign up through the app
2. Go to Firebase Console → Firestore Database
3. Find the user document in the `users` collection
4. Update the `role` field to `"admin"`

Or create a script to do this programmatically.

## Troubleshooting

### Authentication not working
- Check that Email/Password and Google are enabled in Firebase Console
- Verify your Firebase config in `.env.local`
- Check browser console for errors

### Firestore permission denied
- Make sure Firestore rules are deployed
- Check that the user is authenticated
- Verify the rules match your data structure

### Build fails
- Make sure all environment variables are set
- Check that `npm run build` completes successfully
- Verify `dist` folder is created after build

## Next Steps

- Set up custom domain (optional)
- Configure Firebase Storage for file uploads
- Set up Firebase Functions for backend operations
- Add Firebase Analytics
- Set up CI/CD with GitHub Actions

