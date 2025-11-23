/**
 * JavaScript version - Grant admin privileges to a user by email
 * 
 * Usage:
 *   node scripts/grantAdmin.js jkenyone@gmail.com
 * 
 * Make sure to set up Firebase Admin SDK or use this from Firebase Console
 */

// This is a Node.js script that uses Firebase Admin SDK
// For client-side, use the TypeScript version with proper Firebase config

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where, updateDoc, doc } = require('firebase/firestore');
require('dotenv').config({ path: '.env.local' });

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || '',
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.VITE_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID || '',
};

if (!firebaseConfig.projectId) {
  console.error('❌ Error: Firebase configuration not found.');
  console.error('Please set Firebase environment variables in .env.local');
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function grantAdminByEmail(email) {
  try {
    console.log(`🔍 Searching for user with email: ${email}...`);
    
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log(`❌ No user found with email: ${email}`);
      console.log('💡 The user may need to sign up first through the app.');
      return;
    }
    
    const updates = [];
    
    querySnapshot.forEach((userDoc) => {
      const userData = userDoc.data();
      console.log(`\n📋 Found user:`);
      console.log(`   ID: ${userDoc.id}`);
      console.log(`   Name: ${userData.name || 'N/A'}`);
      console.log(`   Email: ${userData.email}`);
      console.log(`   Current Role: ${userData.role || 'N/A'}`);
      
      if (userData.role === 'admin') {
        console.log(`\n✅ User already has admin privileges.`);
        return;
      }
      
      console.log(`\n🔄 Updating role to 'admin'...`);
      const userRef = doc(db, 'users', userDoc.id);
      updates.push(
        updateDoc(userRef, { role: 'admin' })
          .then(() => {
            console.log(`✅ Successfully granted admin privileges to ${email}`);
          })
          .catch((error) => {
            console.error(`❌ Error updating user ${userDoc.id}:`, error);
            throw error;
          })
      );
    });
    
    await Promise.all(updates);
    
    if (updates.length > 0) {
      console.log(`\n🎉 Admin privileges granted successfully!`);
    }
    
  } catch (error) {
    console.error('❌ Error granting admin privileges:', error);
    if (error.code === 'permission-denied') {
      console.error('\n💡 Permission denied. Options:');
      console.error('   1. Update Firestore rules (see instructions below)');
      console.error('   2. Use Firebase Console to manually update');
      console.error('   3. Use Firebase Admin SDK (server-side)');
    }
    process.exit(1);
  }
}

const email = process.argv[2] || 'jkenyone@gmail.com';

if (!email.includes('@')) {
  console.error('❌ Invalid email address:', email);
  process.exit(1);
}

console.log('🚀 Granting admin privileges...\n');
grantAdminByEmail(email)
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

