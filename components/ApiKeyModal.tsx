import React, { useState, useEffect } from 'react';
import { XIcon, KeyRoundIcon, EyeIcon, EyeOffIcon, AlertTriangleIcon, CheckCircleIcon } from './icons.tsx';
import apiKeyService from '../services/apiKeyService.ts';

interface ApiKeyModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    showNotification: (title: string, message: string, type: 'info' | 'success' | 'warning' | 'error') => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, userId, showNotification }) => {
    const [apiKey, setApiKey] = useState('');
    const [showApiKey, setShowApiKey] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [hasExistingKey, setHasExistingKey] = useState(false);
    const [isValidating, setIsValidating] = useState(false);
    const [testMessage, setTestMessage] = useState<{ text: string; type: 'success' | 'error' | null }>({ text: '', type: null });
    const [saveMessage, setSaveMessage] = useState<{ text: string; type: 'success' | 'error' | null }>({ text: '', type: null });

    useEffect(() => {
        if (isOpen) {
            checkExistingApiKey();
            // Réinitialiser les messages quand le modal s'ouvre
            setTestMessage({ text: '', type: null });
            setSaveMessage({ text: '', type: null });
        }
    }, [isOpen, userId]);

    const checkExistingApiKey = async () => {
        try {
            const hasKey = await apiKeyService.hasApiKey(userId);
            setHasExistingKey(hasKey);
            if (hasKey) {
                // Remplir avec des astérisques pour masquer la clé existante
                setApiKey('••••••••••••••••••••••••••••••••••••••••');
            }
        } catch (error) {
            console.error('Erreur lors de la vérification de la clé API:', error);
        }
    };

    const handleSave = async () => {
        if (!apiKey.trim()) {
            showNotification('Erreur', 'Veuillez saisir votre clé API Gemini.', 'error');
            return;
        }

        if (!apiKeyService.validateApiKey(apiKey)) {
            showNotification('Erreur', 'Le format de la clé API ne semble pas valide. Veuillez vérifier votre clé.', 'error');
            return;
        }

        setIsLoading(true);
        setSaveMessage({ text: '', type: null });
        
        try {
            await apiKeyService.saveApiKey(userId, apiKey.trim());
            
            setSaveMessage({
                text: '✅ Clé API sauvegardée avec succès ! Votre clé est maintenant configurée pour ce compte.',
                type: 'success'
            });
            
            showNotification(
                'Clé API sauvegardée',
                'Votre clé API Gemini a été configurée avec succès.',
                'success'
            );
            
            setHasExistingKey(true);
            
            // Fermer le modal après un délai pour laisser le temps de voir le message
            setTimeout(() => {
                onClose();
            }, 2000);
            
        } catch (error) {
            console.error('Erreur lors de la sauvegarde:', error);
            
            let errorMessage = 'Erreur lors de la sauvegarde. Veuillez réessayer.';
            
            if (error instanceof Error) {
                if (error.message.includes('non authentifié')) {
                    errorMessage = 'Vous devez être connecté pour sauvegarder votre clé API.';
                } else if (error.message.includes('permissions')) {
                    errorMessage = 'Erreur de permissions. Veuillez vous reconnecter et réessayer.';
                } else {
                    errorMessage = error.message;
                }
            }
            
            setSaveMessage({
                text: `❌ ${errorMessage}`,
                type: 'error'
            });
            
            showNotification(
                'Erreur',
                errorMessage,
                'error'
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer votre clé API ? Cela empêchera l\'utilisation des fonctionnalités IA.')) {
            return;
        }

        setIsLoading(true);
        try {
            await apiKeyService.deleteApiKey(userId);
            showNotification(
                'Clé API supprimée',
                'Votre clé API Gemini a été supprimée avec succès.',
                'success'
            );
            setHasExistingKey(false);
            setApiKey('');
            onClose();
        } catch (error) {
            console.error('Erreur lors de la suppression:', error);
            showNotification(
                'Erreur',
                'Impossible de supprimer la clé API. Veuillez réessayer.',
                'error'
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleTestApiKey = async () => {
        if (!apiKey.trim() || hasExistingKey) return;

        setIsValidating(true);
        setTestMessage({ text: '', type: null });
        
        try {
            // Test simple avec une requête basique
            const testAi = new (await import('@google/genai')).GoogleGenAI({ apiKey: apiKey.trim() });
            await testAi.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: 'Test de connexion',
            });
            
            setTestMessage({
                text: '✅ Clé API valide ! Votre clé fonctionne correctement.',
                type: 'success'
            });
            
            showNotification(
                'Clé API valide',
                'Votre clé API Gemini fonctionne correctement.',
                'success'
            );
        } catch (error) {
            console.error('Erreur de test de la clé API:', error);
            setTestMessage({
                text: '❌ Clé API invalide. Vérifiez votre clé et réessayez.',
                type: 'error'
            });
            
            showNotification(
                'Clé API invalide',
                'La clé API ne semble pas valide ou n\'a pas les bonnes permissions.',
                'error'
            );
        } finally {
            setIsValidating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                            <KeyRoundIcon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                Configuration de la clé API
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Clé API Gemini
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <XIcon className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Information */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                            <AlertTriangleIcon className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-blue-700 dark:text-blue-300">
                                <p className="font-medium mb-1">Clé API requise</p>
                                <p>
                                    Pour utiliser les fonctionnalités IA d'Axonium, vous devez configurer votre propre clé API Gemini.
                                    Obtenez votre clé gratuite sur{' '}
                                    <a 
                                        href="https://aistudio.google.com/app/apikey" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="underline hover:text-blue-800 dark:hover:text-blue-200"
                                    >
                                        Google AI Studio
                                    </a>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* API Key Input */}
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                            Clé API Gemini
                        </label>
                        <div className="relative">
                            <input
                                type={showApiKey ? 'text' : 'password'}
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="AIzaSyC..."
                                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                                disabled={hasExistingKey}
                            />
                            <button
                                type="button"
                                onClick={() => setShowApiKey(!showApiKey)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                disabled={hasExistingKey}
                            >
                                {showApiKey ? (
                                    <EyeOffIcon className="h-4 w-4" />
                                ) : (
                                    <EyeIcon className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                        {hasExistingKey && (
                            <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                <CheckCircleIcon className="h-4 w-4 text-green-500" />
                                Clé API configurée
                            </p>
                        )}
                    </div>

                    {/* Test Result Message */}
                    {testMessage.text && (
                        <div className={`p-3 rounded-lg border ${
                            testMessage.type === 'success' 
                                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
                                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                        }`}>
                            <p className="text-sm font-medium">{testMessage.text}</p>
                        </div>
                    )}

                    {/* Save Result Message */}
                    {saveMessage.text && (
                        <div className={`p-3 rounded-lg border ${
                            saveMessage.type === 'success' 
                                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
                                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                        }`}>
                            <p className="text-sm font-medium">{saveMessage.text}</p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col gap-3">
                        {!hasExistingKey && (
                            <>
                                <button
                                    onClick={handleTestApiKey}
                                    disabled={!apiKey.trim() || isValidating}
                                    className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isValidating ? 'Test en cours...' : 'Tester la clé API'}
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={!apiKey.trim() || isLoading}
                                    className="w-full px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                                >
                                    {isLoading ? 'Sauvegarde...' : 'Sauvegarder la clé API'}
                                </button>
                            </>
                        )}
                        
                        {hasExistingKey && (
                            <button
                                onClick={handleDelete}
                                disabled={isLoading}
                                className="w-full px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? 'Suppression...' : 'Supprimer la clé API'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ApiKeyModal; 