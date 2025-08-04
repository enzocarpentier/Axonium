# Fonctionnalité : Paramètres Utilisateur - Personnalisation des Préférences

## Vue d'ensemble

Cette fonctionnalité permet aux utilisateurs de personnaliser complètement leur expérience Axonium selon leurs préférences. Elle offre un système complet de paramètres avec persistance dans Firebase et interface utilisateur moderne.

## Fonctionnalités principales

### 1. Préférences de Génération
- **Type de génération par défaut** : QCM, Résumé, Fiche de révision, Carte mentale, Chat interactif, Étude guidée
- **Nombre de questions par défaut** : 3-20 questions
- **Difficulté par défaut** : Facile, Moyen, Difficile
- **Langue par défaut** : Français, English

### 2. Préférences d'Affichage
- **Thème** : Clair, Sombre, Auto (détection système)
- **Taille de police** : Petite, Moyenne, Grande
- **Mode compact** : Interface plus dense pour plus de contenu visible

### 3. Préférences de Notifications
- **Notifications par email** : Activé/Désactivé
- **Notifications push** : Activé/Désactivé
- **Sons de notification** : Activé/Désactivé

### 4. Préférences de Contenu
- **Sauvegarde automatique** : Activé/Désactivé
- **Intervalle de sauvegarde** : 1-60 minutes
- **Format d'export par défaut** : PDF, TXT, DOCX

### 5. Paramètres Avancés
- **Modèle IA** : Gemini, GPT
- **Tokens maximum** : 100-4000
- **Température (créativité)** : 0-2 (slider)

## Architecture technique

### Composants créés

1. **UserSettings.tsx** - Interface principale des paramètres
   - Modal avec onglets organisés
   - Validation en temps réel
   - Sauvegarde automatique dans Firebase
   - Interface responsive et accessible

2. **PreferencesSummary.tsx** - Résumé des préférences
   - Affichage compact des paramètres actuels
   - Indicateurs visuels d'état
   - Accès rapide aux paramètres

3. **userPreferencesService.ts** - Service de gestion
   - Singleton pattern pour la gestion centralisée
   - Cache des préférences pour performance
   - Méthodes d'application des préférences

### Types TypeScript

```typescript
interface UserPreferences {
  // Préférences de génération
  defaultGenerationType: GenerationType;
  defaultNumQuestions: number;
  defaultDifficulty: 'Facile' | 'Moyen' | 'Difficile';
  defaultLanguage: 'fr' | 'en';
  
  // Préférences d'affichage
  theme: 'light' | 'dark' | 'auto';
  fontSize: 'small' | 'medium' | 'large';
  compactMode: boolean;
  
  // Préférences de notifications
  emailNotifications: boolean;
  pushNotifications: boolean;
  notificationSound: boolean;
  
  // Préférences de contenu
  autoSave: boolean;
  autoSaveInterval: number;
  exportFormat: 'pdf' | 'txt' | 'docx';
  
  // Préférences avancées
  aiModel: 'gemini' | 'gpt';
  maxTokens: number;
  temperature: number;
}
```

### Intégration Firebase

- **Collection** : `userSettings`
- **Document** : `{userId}`
- **Structure** :
```typescript
{
  userId: string;
  preferences: UserPreferences;
  updatedAt: string;
}
```

## Interface utilisateur

### Accès aux paramètres
1. **Menu profil** → Bouton "Paramètres"
2. **Menu principal** → Section "Vos préférences" → Bouton "Modifier"

### Interface des paramètres
- **Modal responsive** avec onglets organisés
- **Validation en temps réel** des changements
- **Indicateurs visuels** d'état (activé/désactivé)
- **Animations fluides** et transitions
- **Support complet** du thème sombre/clair

### Organisation des onglets
1. **Génération** - Paramètres de création de contenu
2. **Affichage** - Thème, police, mode compact
3. **Notifications** - Préférences de notifications
4. **Contenu** - Sauvegarde, export
5. **Avancé** - Modèle IA, tokens, température

## Fonctionnalités avancées

### Application automatique
- Les préférences sont appliquées immédiatement
- Le thème change en temps réel
- Les paramètres par défaut sont utilisés pour les nouvelles générations

### Persistance
- Sauvegarde automatique dans Firebase
- Cache local pour performance
- Synchronisation entre sessions

### Validation
- Vérification des valeurs min/max
- Validation des types
- Messages d'erreur contextuels

### Accessibilité
- Support complet du clavier
- Labels ARIA appropriés
- Contraste et tailles de police adaptables

## Styles CSS

### Classes utilitaires ajoutées
- `.compact-mode` - Mode interface dense
- `.preferences-transition` - Animations fluides
- `.toggle-switch` - Switches personnalisés
- `.range-slider` - Sliders stylisés
- `.preferences-card` - Cartes de préférences

### Thème sombre
- Support complet du mode sombre
- Couleurs adaptées pour tous les éléments
- Transitions fluides entre thèmes

## Utilisation

### Pour l'utilisateur
1. Cliquer sur le menu profil (icône utilisateur)
2. Sélectionner "Paramètres"
3. Naviguer entre les onglets
4. Modifier les préférences souhaitées
5. Cliquer "Sauvegarder"

### Pour le développeur
```typescript
// Charger les préférences
const preferences = await userPreferencesService.loadUserPreferences(userId);

// Sauvegarder les préférences
await userPreferencesService.saveUserPreferences(userId, newPreferences);

// Appliquer les préférences
const isDarkMode = userPreferencesService.applyThemePreference(preferences.theme);
userPreferencesService.applyFontSizePreference(preferences.fontSize);
userPreferencesService.applyCompactModePreference(preferences.compactMode);
```

## Avantages

1. **Expérience personnalisée** - Chaque utilisateur peut adapter l'interface à ses besoins
2. **Productivité améliorée** - Paramètres par défaut optimisés
3. **Accessibilité** - Support des préférences d'affichage
4. **Performance** - Cache et optimisations
5. **Évolutivité** - Architecture modulaire pour ajouter de nouveaux paramètres

## Évolutions futures

- [ ] Préférences de raccourcis clavier
- [ ] Thèmes personnalisés
- [ ] Préférences de langue avancées
- [ ] Synchronisation multi-appareils
- [ ] Préférences de partage
- [ ] Statistiques d'utilisation des préférences 