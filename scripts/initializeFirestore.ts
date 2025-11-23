/**
 * Initialize Firestore Database
 * 
 * This script will:
 * 1. Create the initial admin user (jkenyone@gmail.com)
 * 2. Create initial courses if needed
 * 3. Set up the database structure
 * 
 * Usage:
 *   npx tsx scripts/initializeFirestore.ts
 * 
 * Note: The user must first sign up through the app, then run this script
 * OR use Firebase Console to manually create the user document
 */

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where,
  Timestamp 
} from 'firebase/firestore';
import { User, Course, Department } from '../types';

// Load environment variables
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Initial courses data
const INITIAL_COURSES: Omit<Course, 'id'>[] = [
  {
    title: 'Fundamentos de Seguridad Laboral',
    category: 'Seguridad',
    description: 'Protocolos de seguridad esenciales para todo el personal de bodega y operaciones.',
    thumbnail: 'https://picsum.photos/id/180/400/225',
    passThreshold: 80,
    modules: [
      {
        id: 'm1',
        title: 'Conceptos Básicos de Seguridad contra Incendios',
        description: 'Aprenda a identificar peligros de incendio y utilizar un extintor.',
        type: 'VIDEO' as any,
        contentUrl: 'https://www.youtube.com/embed/14dC-S1B8vQ',
        textContent: 'La seguridad contra incendios es primordial...',
        quiz: [
          {
            question: "¿Qué significa la 'T' en el acrónimo para usar extintores (en inglés PASS)?",
            options: ["Tirar", "Traer", "Temer", "Tocar"],
            correctAnswerIndex: 0
          }
        ]
      }
    ]
  },
  {
    title: 'Excelencia en Ventas 101',
    category: 'Ventas',
    description: 'Dominando el arte de la negociación y las relaciones con los clientes.',
    thumbnail: 'https://picsum.photos/id/20/400/225',
    passThreshold: 70,
    modules: []
  }
];

async function initializeFirestore() {
  try {
    console.log('🚀 Initializing Firestore Database...\n');

    // Check if collections already exist
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    
    const coursesRef = collection(db, 'courses');
    const coursesSnapshot = await getDocs(coursesRef);

    console.log(`📊 Current Status:`);
    console.log(`   Users: ${usersSnapshot.size}`);
    console.log(`   Courses: ${coursesSnapshot.size}\n`);

    // Step 1: Create admin user if email provided
    const adminEmail = 'jkenyone@gmail.com';
    console.log(`👤 Checking for admin user: ${adminEmail}...`);
    
    // Check if user exists in Firestore
    const userQuery = query(usersRef, where('email', '==', adminEmail));
    const userSnapshot = await getDocs(userQuery);
    
    if (userSnapshot.empty) {
      console.log(`⚠️  User ${adminEmail} not found in Firestore.`);
      console.log(`\n💡 IMPORTANT: The user must first sign up through the app!`);
      console.log(`   Steps:`);
      console.log(`   1. Start the app: npm run dev`);
      console.log(`   2. Sign up with email: ${adminEmail}`);
      console.log(`   3. Then run this script again to grant admin privileges`);
      console.log(`\n   OR manually create the user in Firebase Console:\n`);
      console.log(`   - Go to Firestore Database`);
      console.log(`   - Create collection: users`);
      console.log(`   - Create document with ID = Firebase Auth UID`);
      console.log(`   - Add fields:`);
      console.log(`     * email: "${adminEmail}"`);
      console.log(`     * name: "Admin User"`);
      console.log(`     * role: "admin"`);
      console.log(`     * department: "RR.HH."`);
      console.log(`     * avatar: "https://i.pravatar.cc/150?u=admin"\n`);
    } else {
      // Update existing user to admin
      const userDoc = userSnapshot.docs[0];
      const userData = userDoc.data();
      
      if (userData.role !== 'admin') {
        console.log(`🔄 Updating user role to admin...`);
        await setDoc(doc(db, 'users', userDoc.id), {
          ...userData,
          role: 'admin'
        }, { merge: true });
        console.log(`✅ Admin privileges granted to ${adminEmail}\n`);
      } else {
        console.log(`✅ User ${adminEmail} already has admin privileges\n`);
      }
    }

    // Step 2: Create initial courses if none exist
    if (coursesSnapshot.empty) {
      console.log('📚 Creating initial courses...');
      for (const course of INITIAL_COURSES) {
        const courseRef = doc(coursesRef);
        await setDoc(courseRef, course);
        console.log(`   ✅ Created: ${course.title}`);
      }
      console.log(`\n✅ Created ${INITIAL_COURSES.length} initial courses\n`);
    } else {
      console.log(`✅ Courses already exist (${coursesSnapshot.size} courses)\n`);
    }

    // Step 3: Verify collections
    console.log('📋 Final Status:');
    const finalUsersSnapshot = await getDocs(usersRef);
    const finalCoursesSnapshot = await getDocs(coursesRef);
    console.log(`   Users: ${finalUsersSnapshot.size}`);
    console.log(`   Courses: ${finalCoursesSnapshot.size}`);
    
    console.log('\n✨ Firestore initialization complete!');
    console.log('\n📝 Next Steps:');
    console.log('   1. If user needs to sign up, have them do so through the app');
    console.log('   2. Run this script again to grant admin privileges');
    console.log('   3. Deploy Firestore rules: npx firebase deploy --only firestore:rules');
    
  } catch (error: any) {
    console.error('❌ Error initializing Firestore:', error);
    if (error.code === 'permission-denied') {
      console.error('\n💡 Permission denied. Make sure:');
      console.error('   1. Firestore is enabled in Firebase Console');
      console.error('   2. Firestore rules allow writes (for initialization)');
      console.error('   3. You have proper Firebase credentials');
    }
    process.exit(1);
  }
}

console.log('🔧 Firestore Initialization Script\n');
initializeFirestore()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

