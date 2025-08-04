# 🚀 Guide de déploiement Firebase pour Axonium

## 📋 Prérequis

1. **Node.js** (version 16 ou supérieure)
2. **Firebase CLI** installé globalement
3. **Compte Firebase** configuré

## 🔧 Installation et configuration

### 1. Installer Firebase CLI
```bash
npm install -g firebase-tools
```

### 2. Se connecter à Firebase
```bash
firebase login
```

### 3. Initialiser Firebase (si pas déjà fait)
```bash
firebase init
```

## 🚀 Déploiement automatique

### Option 1 : Script de déploiement (Recommandé)
```bash
./deploy-firebase.sh
```

Ce script automatise tout le processus :
- ✅ Installation des dépendances
- ✅ Build de l'application
- ✅ Déploiement sur Firebase
- ✅ Vérification des erreurs

### Option 2 : Déploiement manuel

#### Étape 1 : Installer les dépendances
```bash
npm install
```

#### Étape 2 : Build de l'application
```bash
npm run build
```

#### Étape 3 : Déployer sur Firebase
```bash
firebase deploy
```

## 🌐 URLs de déploiement

Après le déploiement, votre application sera accessible sur :
- **URL principale** : https://axonium-app.web.app
- **URL alternative** : https://axonium-app.firebaseapp.com

## 📁 Structure de déploiement

```
Axonium/
├── dist/                    # Dossier de build (généré)
├── firebase.json           # Configuration Firebase
├── firestore.rules         # Règles de sécurité
├── firestore.indexes.json  # Index Firestore
└── deploy-firebase.sh      # Script de déploiement
```

## 🔧 Configuration Firebase

### firebase.json
```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "functions": {
    "source": "functions"
  },
  "hosting": {
    "public": "dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

## 🔐 Services déployés

### 1. **Firebase Hosting**
- Hébergement de l'application React
- Configuration SPA (Single Page Application)
- HTTPS automatique

### 2. **Firestore Database**
- Base de données NoSQL
- Règles de sécurité configurées
- Index optimisés

### 3. **Firebase Functions** (optionnel)
- Fonctions serverless
- Création automatique de comptes
- Gestion des permissions

## 🛠️ Commandes utiles

### Déployer uniquement l'hébergement
```bash
firebase deploy --only hosting
```

### Déployer uniquement Firestore
```bash
firebase deploy --only firestore
```

### Déployer uniquement les fonctions
```bash
firebase deploy --only functions
```

### Voir les logs de déploiement
```bash
firebase hosting:channel:list
```

## 🔍 Vérification du déploiement

### 1. Vérifier l'état du projet
```bash
firebase projects:list
```

### 2. Vérifier les services actifs
```bash
firebase use --add
```

### 3. Tester l'application
- Ouvrir https://axonium-app.web.app
- Vérifier que toutes les fonctionnalités marchent
- Tester l'authentification
- Vérifier la gestion des clés API

## 🚨 Dépannage

### Erreur : "Firebase CLI not found"
```bash
npm install -g firebase-tools
```

### Erreur : "Not logged in"
```bash
firebase login
```

### Erreur : "Build failed"
```bash
npm install
npm run build
```

### Erreur : "Deploy failed"
```bash
firebase logout
firebase login
firebase deploy
```

## 📊 Monitoring

### Firebase Console
- Allez sur https://console.firebase.google.com
- Sélectionnez votre projet `axonium-app`
- Surveillez les métriques dans :
  - **Hosting** : Trafic et performances
  - **Firestore** : Utilisation de la base de données
  - **Authentication** : Connexions utilisateurs

## 🔄 Mise à jour

Pour mettre à jour l'application :
```bash
./deploy-firebase.sh
```

Le script détectera automatiquement les changements et redéploiera.

## 🎯 Bonnes pratiques

1. **Testez localement** avant de déployer
2. **Vérifiez les règles Firestore** après déploiement
3. **Surveillez les logs** pour détecter les erreurs
4. **Sauvegardez régulièrement** votre configuration

## 📞 Support

En cas de problème :
1. Vérifiez les logs Firebase Console
2. Consultez la documentation Firebase
3. Vérifiez la configuration du projet

---

**🎉 Votre application Axonium est maintenant déployée et accessible en ligne !** 