import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserPreferences } from '../types';

export class UserPreferencesService {
    private static instance: UserPreferencesService;
    private cache: Map<string, UserPreferences> = new Map();

    private constructor() {}

    public static getInstance(): UserPreferencesService {
        if (!UserPreferencesService.instance) {
            UserPreferencesService.instance = new UserPreferencesService();
        }
        return UserPreferencesService.instance;
    }

    // Charger les préférences utilisateur depuis Firebase
    async loadUserPreferences(userId: string): Promise<UserPreferences> {
        // Vérifier le cache d'abord
        if (this.cache.has(userId)) {
            return this.cache.get(userId)!;
        }

        try {
            const settingsDoc = await getDoc(doc(db, "userSettings", userId));
            if (settingsDoc.exists()) {
                const settingsData = settingsDoc.data();
                if (settingsData.preferences) {
                    const preferences = settingsData.preferences as UserPreferences;
                    this.cache.set(userId, preferences);
                    return preferences;
                }
            }
        } catch (error) {
            console.error("Erreur lors du chargement des préférences:", error);
        }

        // Retourner les préférences par défaut si aucune n'est trouvée
        return this.getDefaultPreferences();
    }

    // Sauvegarder les préférences utilisateur dans Firebase
    async saveUserPreferences(userId: string, preferences: UserPreferences): Promise<void> {
        try {
            await setDoc(doc(db, "userSettings", userId), {
                userId,
                preferences,
                updatedAt: new Date().toISOString()
            }, { merge: true });

            // Mettre à jour le cache
            this.cache.set(userId, preferences);
        } catch (error) {
            console.error("Erreur lors de la sauvegarde des préférences:", error);
            throw error;
        }
    }

    // Obtenir les préférences par défaut
    getDefaultPreferences(): UserPreferences {
        return {
            defaultGenerationType: 'qcm',
            defaultNumQuestions: 5,
            defaultDifficulty: 'Moyen',
            defaultLanguage: 'fr',
            theme: 'auto',
            fontSize: 'medium',
            compactMode: false,
            emailNotifications: true,
            pushNotifications: true,
            notificationSound: true,
            autoSave: true,
            autoSaveInterval: 1,
            exportFormat: 'pdf',
            aiModel: 'gemini',
            maxTokens: 2000,
            temperature: 0.7
        };
    }

    // Appliquer les préférences de thème
    applyThemePreference(preference: 'light' | 'dark' | 'auto'): boolean {
        if (preference === 'light') {
            return false; // Mode clair
        } else if (preference === 'dark') {
            return true; // Mode sombre
        } else {
            // Auto - utiliser la préférence système
            return window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
    }

    // Appliquer les préférences de taille de police
    applyFontSizePreference(preference: 'small' | 'medium' | 'large'): void {
        const root = document.documentElement;
        root.classList.remove('text-sm', 'text-base', 'text-lg');
        
        switch (preference) {
            case 'small':
                root.classList.add('text-sm');
                break;
            case 'large':
                root.classList.add('text-lg');
                break;
            default:
                root.classList.add('text-base');
                break;
        }
    }

    // Appliquer le mode compact
    applyCompactModePreference(compactMode: boolean): void {
        const root = document.documentElement;
        if (compactMode) {
            root.classList.add('compact-mode');
        } else {
            root.classList.remove('compact-mode');
        }
    }

    // Vider le cache
    clearCache(userId?: string): void {
        if (userId) {
            this.cache.delete(userId);
        } else {
            this.cache.clear();
        }
    }
}

export default UserPreferencesService.getInstance(); 