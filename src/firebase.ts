import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';

// Import the Firebase configuration
import config from '../firebase-applet-config.json';
const firebaseConfig = (config as any).default || config;

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);

// Ensure we have a database ID, safely handle default
const databaseId = firebaseConfig.firestoreDatabaseId;

export const db = databaseId 
  ? getFirestore(app, databaseId) 
  : getFirestore(app);

export const auth = getAuth();

console.log('Firebase initialized with Project ID:', firebaseConfig.projectId);
console.log('Firestore Database ID:', databaseId || 'default');

// Validate Connection to Firestore
async function testConnection() {
  if (!db) {
    console.error("Firestore 'db' instance is not initialized!");
    return;
  }
  try {
    console.log('Testing Firestore connection...');
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('Firestore connection test successful.');
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();
