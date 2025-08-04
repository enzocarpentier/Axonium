# Migration vers Firebase Storage

## Vue d'ensemble

Cette migration remplace complètement Cloudinary par Firebase Storage pour la gestion des documents dans Axonium.

## Changements principaux

### 1. Service de documents (`services/documentService.ts`)

**Avant (Cloudinary) :**
- Configuration via variables d'environnement Cloudinary
- Upload via API Cloudinary
- URLs Cloudinary pour les fichiers

**Après (Firebase Storage) :**
- Utilisation de Firebase Storage SDK
- Upload avec progression en temps réel
- URLs Firebase Storage pour les fichiers

### 2. Types TypeScript (`types.ts`)

**Changements dans l'interface `Document` :**
```typescript
// Avant
interface Document {
  cloudinaryUrl: string;
  cloudinaryPublicId: string;
  thumbnailUrl?: string;
  // ...
}

// Après
interface Document {
  firebaseStorageUrl: string;
  firebaseStorageRef: string;
  isProcessed: boolean;
  processingStatus: 'pending' | 'processing' | 'completed' | 'error';
  processedText?: string;
  processingError?: string;
  // ...
}
```

### 3. Configuration Firebase

**Ajout dans `firebase.json` :**
```json
{
  "storage": {
    "rules": "storage.rules"
  }
}
```

**Nouvelles règles de sécurité (`storage.rules`) :**
- Accès utilisateur authentifié uniquement
- Organisation par utilisateur : `/documents/{userId}/`
- Sécurité renforcée

## Avantages de Firebase Storage

### ✅ **Intégration native**
- Même projet Firebase que Firestore
- Authentification unifiée
- Gestion des permissions centralisée

### ✅ **Performance**
- Upload avec progression en temps réel
- CDN global automatique
- Optimisation automatique des images

### ✅ **Sécurité**
- Règles de sécurité granulaires
- Authentification Firebase native
- Contrôle d'accès par utilisateur

### ✅ **Coût**
- Gratuit jusqu'à 5GB de stockage
- Pas de frais d'API supplémentaires
- Facturation intégrée Firebase

## Migration des données existantes

### ⚠️ **Important : Les documents existants**
Les documents uploadés via Cloudinary ne sont pas automatiquement migrés. Pour migrer :

1. **Export des métadonnées** depuis Firestore
2. **Téléchargement** des fichiers depuis Cloudinary
3. **Upload** vers Firebase Storage
4. **Mise à jour** des références dans Firestore

### 🔧 **Script de migration (optionnel)**
```javascript
// Script pour migrer les documents existants
// À implémenter si nécessaire
```

## Configuration requise

### 1. **Firebase Storage activé**
- ✅ Déjà configuré dans le projet `axonium-fr`
- ✅ Règles de sécurité déployées

### 2. **Variables d'environnement**
- ❌ Plus besoin de `VITE_CLOUDINARY_CLOUD_NAME`
- ❌ Plus besoin de `VITE_CLOUDINARY_UPLOAD_PRESET`
- ✅ Utilise la configuration Firebase existante

### 3. **Dépendances**
- ❌ Supprimé : `cloudinary`, `@cloudinary/react`, `@cloudinary/url-gen`
- ✅ Utilise : `firebase/storage` (déjà installé)

## Fonctionnalités

### 📁 **Upload de documents**
- Support PDF, images, fichiers texte
- Progression en temps réel
- Gestion d'erreurs améliorée

### 🔍 **Traitement automatique**
- Extraction de texte des PDFs (PDF.js)
- Support des fichiers texte
- Statut de traitement en temps réel

### 📊 **Statistiques**
- Taille totale des documents
- Nombre de documents par type
- Documents récents et les plus utilisés

### 🗑️ **Suppression**
- Suppression automatique du fichier Storage
- Nettoyage des métadonnées Firestore

## Tests recommandés

1. **Upload de différents types de fichiers**
2. **Vérification des permissions**
3. **Test de suppression**
4. **Vérification du traitement automatique**

## Support

Pour toute question concernant cette migration, consultez :
- [Documentation Firebase Storage](https://firebase.google.com/docs/storage)
- [Règles de sécurité](https://firebase.google.com/docs/storage/security)
- [SDK Firebase Storage](https://firebase.google.com/docs/storage/web/start) 