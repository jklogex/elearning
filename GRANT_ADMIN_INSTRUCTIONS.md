# Grant Admin Privileges to User

## Quick Method: Firebase Console (Recommended)

The easiest way to grant admin privileges is through the Firebase Console:

1. **Go to Firebase Console**: https://console.firebase.google.com/
2. **Select your project**
3. **Navigate to Firestore Database**
4. **Open the `users` collection**
5. **Find the user document** (search by email: `jkenyone@gmail.com`)
   - If the user doesn't exist, they need to sign up first through the app
6. **Click on the user document**
7. **Edit the `role` field** and change it from `employee` to `admin`
8. **Save the changes**

The user will have admin privileges the next time they log in.

---

## Method 2: Using a Script (Requires Setup)

### Prerequisites
- Node.js installed
- Firebase project configured
- `.env.local` file with Firebase credentials

### Option A: TypeScript Script

1. Install dependencies (if not already):
   ```bash
   npm install
   ```

2. Install dotenv for environment variables:
   ```bash
   npm install --save-dev dotenv
   ```

3. Run the script:
   ```bash
   npx tsx scripts/grantAdmin.ts jkenyone@gmail.com
   ```

### Option B: JavaScript Script

1. Install dotenv:
   ```bash
   npm install dotenv
   ```

2. Run the script:
   ```bash
   node scripts/grantAdmin.js jkenyone@gmail.com
   ```

### Note on Permissions

If you get a "permission-denied" error, you have two options:

**Option 1: Update Firestore Rules** (Temporary - for development only)
```javascript
// In firestore.rules, temporarily allow admin updates:
match /users/{userId} {
  allow read: if request.auth != null;
  allow write: if request.auth != null && (
    request.auth.uid == userId || 
    // Allow any authenticated user to update roles (DEV ONLY)
    true
  );
}
```

**Option 2: Use Firebase Admin SDK** (Production-ready)
- Set up Firebase Admin SDK on a server
- Use server-side script with admin privileges

---

## Method 3: Manual Update via App (If you're already an admin)

If you already have admin access:

1. Log in as an admin user
2. Go to "Equipo" (Team) section
3. Find the user `jkenyone@gmail.com`
4. Update their role (if this feature exists in the UI)

---

## Verification

After granting admin privileges:

1. The user should **log out and log back in**
2. They should see admin menu items:
   - "Equipo" (Team)
   - "Asignaciones" (Assignments)
   - "Reportes" (Reports)
   - "Creador de Cursos" (Course Creator)

---

## Troubleshooting

### User Not Found
- The user must sign up first through the app
- Check that the email is correct: `jkenyone@gmail.com`
- Verify the user exists in Firebase Authentication

### Permission Denied
- Firestore rules may be blocking the update
- Use Firebase Console method instead
- Or temporarily update Firestore rules (development only)

### Changes Not Reflecting
- User needs to log out and log back in
- Clear browser cache
- Check that the `role` field in Firestore is exactly `"admin"` (lowercase)

---

## Security Note

⚠️ **Important**: In production, admin privileges should be granted through:
- Firebase Admin SDK (server-side)
- Secure admin panel with proper authentication
- Not through client-side scripts or public Firestore rules

For development/testing, the Firebase Console method is safe and recommended.

