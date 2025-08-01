# Axonium - AI Studio App

Application React/TypeScript avec Firebase et Gemini AI.

## Configuration requise

### Variables d'environnement

Créez un fichier `.env.local` à la racine du projet avec :

```bash
# Configuration Firebase
VITE_FIREBASE_CONFIG="{\"apiKey\":\"votre-api-key\",\"authDomain\":\"votre-projet.firebaseapp.com\",\"projectId\":\"votre-projet-id\",\"storageBucket\":\"votre-projet.appspot.com\",\"messagingSenderId\":\"123456789\",\"appId\":\"1:123456789:web:abcdef\"}"

# Configuration Gemini AI
GEMINI_API_KEY="votre-gemini-api-key"
```

## Installation et développement

**Prérequis :** Node.js

1. Installer les dépendances :
   ```bash
   npm install
   ```

2. Configurer les variables d'environnement dans `.env.local`

3. Lancer l'application :
   ```bash
   npm run dev
   ```

## Build

```bash
npm run build
```

## Structure du projet

- `firebase.ts` - Configuration Firebase (Auth + Firestore)
- `services/geminiService.ts` - Service Gemini AI
- `components/` - Composants React
- `types.ts` - Types TypeScript
