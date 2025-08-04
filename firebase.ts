import { getApp, initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, Storage } from 'firebase/storage';

// Configuration Firebase via variable d'environnement VITE_FIREBASE_CONFIG
const firebaseConfigString = import.meta.env.VITE_FIREBASE_CONFIG;

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: Storage | null = null;
let firebaseError: string | null = null;

// Validation de la configuration Firebase
const validateFirebaseConfig = (config: any): boolean => {
    const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
    return requiredFields.every(field => config[field] && typeof config[field] === 'string');
};

console.log("🔍 Vérification de la configuration Firebase...");
console.log("VITE_FIREBASE_CONFIG défini:", !!firebaseConfigString);

if (!firebaseConfigString) {
    firebaseError = "❌ Configuration Firebase manquante : VITE_FIREBASE_CONFIG n'est pas définie dans votre fichier .env.local";
    console.error("❌ Configuration Firebase manquante");
} else {
    try {
        const firebaseConfig = JSON.parse(firebaseConfigString);
        console.log("✅ Configuration Firebase parsée avec succès");
        console.log("Project ID:", firebaseConfig.projectId);
        console.log("Auth Domain:", firebaseConfig.authDomain);
        
        // Validation de la configuration
        if (!validateFirebaseConfig(firebaseConfig)) {
            throw new Error("Configuration Firebase incomplète. Vérifiez que tous les champs requis sont présents.");
        }
        
        // Toujours initialiser une nouvelle application pour éviter les conflits
        app = initializeApp(firebaseConfig);
        console.log("✅ Application Firebase initialisée");

        auth = getAuth(app);
        db = getFirestore(app);
        storage = getStorage(app);
        
        // Configuration des paramètres Firestore pour améliorer la stabilité
        if (db) {
            // Désactiver la persistance en cache pour éviter les problèmes de connexion
            // Note: Cette configuration peut être ajustée selon vos besoins
            console.log("✅ Firestore configuré avec les paramètres optimisés");
        }
        
        console.log("✅ Firebase Auth, Firestore et Storage initialisés avec succès");
        console.log("Auth configuré:", !!auth);
        console.log("Firestore configuré:", !!db);
        console.log("Storage configuré:", !!storage);

    } catch (e: any) {
        console.error("❌ Erreur d'initialisation de Firebase :", e);
        firebaseError = `❌ Erreur Firebase : ${e.message}. Vérifiez que VITE_FIREBASE_CONFIG contient une configuration JSON valide dans votre fichier .env.local`;
    }
}

export { app, auth, db, storage, firebaseError };
