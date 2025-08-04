import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../firebase';

export interface ApiKeyData {
    userId: string;
    geminiApiKey: string;
    createdAt: string;
    updatedAt: string;
    isActive: boolean;
}

export class ApiKeyService {
    private static instance: ApiKeyService;
    private cache: Map<string, string> = new Map();

    private constructor() {}

    public static getInstance(): ApiKeyService {
        if (!ApiKeyService.instance) {
            ApiKeyService.instance = new ApiKeyService();
        }
        return ApiKeyService.instance;
    }

    // Vérifier que l'utilisateur est authentifié
    private checkAuth(): void {
        const auth = getAuth();
        if (!auth.currentUser) {
            throw new Error("Utilisateur non authentifié. Veuillez vous connecter.");
        }
    }

    // Sauvegarder la clé API Gemini de l'utilisateur
    async saveApiKey(userId: string, apiKey: string): Promise<void> {
        try {
            this.checkAuth();
            
            const apiKeyData: ApiKeyData = {
                userId,
                geminiApiKey: apiKey,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                isActive: true
            };

            await setDoc(doc(db, "apiKeys", userId), apiKeyData, { merge: true });
            
            // Mettre à jour le cache
            this.cache.set(userId, apiKey);
            
            console.log('Clé API sauvegardée avec succès pour l\'utilisateur:', userId);
        } catch (error) {
            console.error("Erreur lors de la sauvegarde de la clé API:", error);
            if (error instanceof Error) {
                throw new Error(error.message);
            }
            throw new Error("Impossible de sauvegarder la clé API. Veuillez réessayer.");
        }
    }

    // Récupérer la clé API Gemini de l'utilisateur
    async getApiKey(userId: string): Promise<string | null> {
        try {
            this.checkAuth();
            
            // Vérifier le cache d'abord
            if (this.cache.has(userId)) {
                return this.cache.get(userId)!;
            }

            const apiKeyDoc = await getDoc(doc(db, "apiKeys", userId));
            if (apiKeyDoc.exists()) {
                const data = apiKeyDoc.data() as ApiKeyData;
                if (data.isActive && data.geminiApiKey) {
                    this.cache.set(userId, data.geminiApiKey);
                    return data.geminiApiKey;
                }
            }
        } catch (error) {
            console.error("Erreur lors de la récupération de la clé API:", error);
            // Ne pas propager l'erreur pour éviter de casser l'application
            // Retourner null pour indiquer qu'aucune clé n'est trouvée
        }

        return null;
    }

    // Vérifier si l'utilisateur a une clé API configurée
    async hasApiKey(userId: string): Promise<boolean> {
        try {
            this.checkAuth();
            const apiKey = await this.getApiKey(userId);
            return apiKey !== null && apiKey.trim().length > 0;
        } catch (error) {
            console.error("Erreur lors de la vérification de la clé API:", error);
            return false;
        }
    }

    // Supprimer la clé API de l'utilisateur
    async deleteApiKey(userId: string): Promise<void> {
        try {
            this.checkAuth();
            
            await updateDoc(doc(db, "apiKeys", userId), {
                isActive: false,
                updatedAt: new Date().toISOString()
            });
            
            // Supprimer du cache
            this.cache.delete(userId);
            
            console.log('Clé API supprimée avec succès pour l\'utilisateur:', userId);
        } catch (error) {
            console.error("Erreur lors de la suppression de la clé API:", error);
            if (error instanceof Error) {
                throw new Error(error.message);
            }
            throw new Error("Impossible de supprimer la clé API. Veuillez réessayer.");
        }
    }

    // Valider le format d'une clé API Gemini
    validateApiKey(apiKey: string): boolean {
        // Les clés API Gemini commencent généralement par "AI" et ont une longueur spécifique
        return apiKey.trim().length > 0 && apiKey.trim().length >= 20;
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

export default ApiKeyService.getInstance(); 