import { getApp, initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// Configuration Firebase via variable d'environnement VITE_FIREBASE_CONFIG
const firebaseConfigString = process.env.FIREBASE_CONFIG;

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let firebaseError: string | null = null;

// Validation de la configuration Firebase
const validateFirebaseConfig = (config: any): boolean => {
    const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
    return requiredFields.every(field => config[field] && typeof config[field] === 'string');
};

if (!firebaseConfigString) {
    firebaseError = "❌ Configuration Firebase manquante : VITE_FIREBASE_CONFIG n'est pas définie dans votre fichier .env.local";
} else {
    try {
        const firebaseConfig = JSON.parse(firebaseConfigString);
        
        // Validation de la configuration
        if (!validateFirebaseConfig(firebaseConfig)) {
            throw new Error("Configuration Firebase incomplète. Vérifiez que tous les champs requis sont présents.");
        }
        
        // Essayer d'obtenir une application existante pour éviter la ré-initialisation (utile en HMR)
        try {
            app = getApp();
        } catch (e) {
            // Si aucune application n'existe, en initialiser une nouvelle
            app = initializeApp(firebaseConfig);
        }

        auth = getAuth(app);
        db = getFirestore(app);
        
        console.log("✅ Firebase initialisé avec succès");

    } catch (e: any) {
        console.error("❌ Erreur d'initialisation de Firebase :", e);
        firebaseError = `❌ Erreur Firebase : ${e.message}. Vérifiez que VITE_FIREBASE_CONFIG contient une configuration JSON valide dans votre fichier .env.local`;
    }
}

export { app, auth, db, firebaseError };
