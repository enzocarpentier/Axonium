import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { updateDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserPreferences } from '../types';
import ElegantSpinner from './spinners/ElegantSpinner';
import ApiKeyModal from './ApiKeyModal';
import apiKeyService from '../services/apiKeyService';
import { 
    SettingsIcon, 
    PaletteIcon, 
    BellIcon, 
    SaveIcon,
    CheckIcon,
    XIcon,
    ArrowLeftIcon,
    SunIcon,
    MoonIcon,
    MonitorIcon,
    Volume2Icon,
    VolumeXIcon,
    DownloadIcon,
    ClockIcon,
    LanguagesIcon,
    ZapIcon,
    KeyRoundIcon,
    CheckCircleIcon,
    AlertCircleIcon
} from './icons';

interface UserSettingsProps {
    currentUser: User;
    onClose: () => void;
    onPreferencesUpdate: (preferences: UserPreferences) => void;
    currentPreferences: UserPreferences;
    onDataExport?: () => void;
    showNotification: (title: string, message: string, type: 'info' | 'success' | 'warning' | 'error') => void;
}

const UserSettings: React.FC<UserSettingsProps> = ({ 
    currentUser, 
    onClose, 
    onPreferencesUpdate,
    currentPreferences,
    onDataExport,
    showNotification
}) => {
    const [activeTab, setActiveTab] = useState<'display' | 'notifications' | 'data' | 'api'>('display');
    const [preferences, setPreferences] = useState<UserPreferences>(currentPreferences);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [showApiKeyModal, setShowApiKeyModal] = useState(false);
    const [hasApiKey, setHasApiKey] = useState(false);
    const [isCheckingApiKey, setIsCheckingApiKey] = useState(true);

    // Vérifier le statut de la clé API
    useEffect(() => {
        const checkApiKeyStatus = async () => {
            try {
                const hasKey = await apiKeyService.hasApiKey(currentUser.uid);
                setHasApiKey(hasKey);
            } catch (error) {
                console.error('Erreur lors de la vérification de la clé API:', error);
                setHasApiKey(false);
            } finally {
                setIsCheckingApiKey(false);
            }
        };

        if (currentUser) {
            checkApiKeyStatus();
        }
    }, [currentUser.uid]);

    // Détecter les changements
    useEffect(() => {
        const changed = JSON.stringify(preferences) !== JSON.stringify(currentPreferences);
        setHasChanges(changed);
    }, [preferences, currentPreferences]);

    const handlePreferenceChange = (key: keyof UserPreferences, value: any) => {
        setPreferences(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Sauvegarder dans Firebase
            await setDoc(doc(db, "userSettings", currentUser.uid), {
                userId: currentUser.uid,
                preferences,
                updatedAt: new Date().toISOString()
            }, { merge: true });

            // Mettre à jour l'état global
            onPreferencesUpdate(preferences);
            
            // Notification de succès
            setTimeout(() => {
                setIsSaving(false);
            }, 1000);
        } catch (error) {
            console.error('Erreur lors de la sauvegarde des paramètres:', error);
            setIsSaving(false);
        }
    };

    const handleReset = () => {
        setPreferences(currentPreferences);
    };

    const handleApiKeyModalClose = () => {
        setShowApiKeyModal(false);
        // Re-vérifier le statut de la clé API après fermeture du modal
        const checkApiKeyStatus = async () => {
            try {
                const hasKey = await apiKeyService.hasApiKey(currentUser.uid);
                setHasApiKey(hasKey);
            } catch (error) {
                console.error('Erreur lors de la vérification de la clé API:', error);
                setHasApiKey(false);
            }
        };
        checkApiKeyStatus();
    };

    const tabs = [
        { id: 'display', name: 'Affichage', icon: PaletteIcon },
        { id: 'notifications', name: 'Notifications', icon: BellIcon },
        { id: 'api', name: 'Clé API', icon: KeyRoundIcon },
        { id: 'data', name: 'Données', icon: DownloadIcon }
    ] as const;



    const renderDisplayTab = () => (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-slate-700 dark:to-slate-600 rounded-xl p-4 border border-emerald-200 dark:border-slate-600">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <PaletteIcon className="h-5 w-5 text-emerald-500" />
                    Préférences d'affichage
                </h3>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                            Thème
                        </label>
                        <div className="flex gap-3">
                            {[
                                { value: 'light', label: 'Clair', icon: SunIcon },
                                { value: 'dark', label: 'Sombre', icon: MoonIcon },
                                { value: 'auto', label: 'Auto', icon: MonitorIcon }
                            ].map(({ value, label, icon: Icon }) => (
                                <button
                                    key={value}
                                    onClick={() => handlePreferenceChange('theme', value)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                                        preferences.theme === value
                                            ? 'bg-indigo-100 dark:bg-indigo-900 border-indigo-300 dark:border-indigo-600 text-indigo-700 dark:text-indigo-300'
                                            : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
                                    }`}
                                >
                                    <Icon className="h-4 w-4" />
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                            Taille de police
                        </label>
                        <div className="flex gap-3">
                            {[
                                { value: 'small', label: 'Petite' },
                                { value: 'medium', label: 'Moyenne' },
                                { value: 'large', label: 'Grande' }
                            ].map(({ value, label }) => (
                                <button
                                    key={value}
                                    onClick={() => handlePreferenceChange('fontSize', value)}
                                    className={`px-4 py-2 rounded-lg border transition-all ${
                                        preferences.fontSize === value
                                            ? 'bg-indigo-100 dark:bg-indigo-900 border-indigo-300 dark:border-indigo-600 text-indigo-700 dark:text-indigo-300'
                                            : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                Mode compact
                            </label>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Interface plus dense pour plus de contenu visible
                            </p>
                        </div>
                        <button
                            onClick={() => handlePreferenceChange('compactMode', !preferences.compactMode)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                preferences.compactMode ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'
                            }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    preferences.compactMode ? 'translate-x-6' : 'translate-x-1'
                                }`}
                            />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderNotificationsTab = () => (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-slate-700 dark:to-slate-600 rounded-xl p-4 border border-amber-200 dark:border-slate-600">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <BellIcon className="h-5 w-5 text-amber-500" />
                    Préférences de notifications
                </h3>
                
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                Notifications par email
                            </label>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Recevoir des notifications par email
                            </p>
                        </div>
                        <button
                            onClick={() => handlePreferenceChange('emailNotifications', !preferences.emailNotifications)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                preferences.emailNotifications ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'
                            }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    preferences.emailNotifications ? 'translate-x-6' : 'translate-x-1'
                                }`}
                            />
                        </button>
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                Notifications push
                            </label>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Notifications dans le navigateur
                            </p>
                        </div>
                        <button
                            onClick={() => handlePreferenceChange('pushNotifications', !preferences.pushNotifications)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                preferences.pushNotifications ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'
                            }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    preferences.pushNotifications ? 'translate-x-6' : 'translate-x-1'
                                }`}
                            />
                        </button>
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                Sons de notification
                            </label>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Jouer un son pour les notifications
                            </p>
                        </div>
                        <button
                            onClick={() => handlePreferenceChange('notificationSound', !preferences.notificationSound)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                preferences.notificationSound ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'
                            }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    preferences.notificationSound ? 'translate-x-6' : 'translate-x-1'
                                }`}
                            />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );



    const renderDataTab = () => (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-slate-700 dark:to-slate-600 rounded-xl p-4 border border-indigo-200 dark:border-slate-600">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <DownloadIcon className="h-5 w-5 text-indigo-500" />
                    Export de données
                </h3>
                
                <div className="space-y-4">
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        Exportez vos données personnelles, sessions d'étude, préférences et templates en format PDF ou JSON.
                    </p>
                    
                    <div className="bg-white dark:bg-slate-700 rounded-lg p-4 border border-slate-200 dark:border-slate-600">
                        <h4 className="font-medium text-slate-800 dark:text-white mb-3">Données disponibles :</h4>
                        <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                            <li className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                                Sessions d'étude (QCM, résumés, fiches, etc.)
                            </li>
                            <li className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                                Préférences utilisateur et paramètres
                            </li>
                            <li className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                                Templates personnalisés
                            </li>
                            <li className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                                Informations de profil
                            </li>
                        </ul>
                    </div>
                    
                    <button
                        onClick={onDataExport}
                        className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-medium py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        <DownloadIcon className="h-5 w-5" />
                        Exporter mes données
                    </button>
                </div>
            </div>
        </div>
    );

    const renderApiTab = () => (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-slate-700 dark:to-slate-600 rounded-xl p-4 border border-indigo-200 dark:border-slate-600">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <KeyRoundIcon className="h-5 w-5 text-indigo-500" />
                    Clé API Gemini
                </h3>
                
                <div className="space-y-4">
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        Configurez votre clé API Gemini pour utiliser les fonctionnalités de génération de texte, QCM, résumés et plus encore.
                    </p>
                    
                    {/* Statut de la clé API */}
                    {isCheckingApiKey ? (
                        <div className="flex items-center justify-center py-4">
                            <ElegantSpinner size="sm" />
                            <span className="ml-2 text-sm text-slate-600 dark:text-slate-300">
                                Vérification du statut...
                            </span>
                        </div>
                    ) : hasApiKey ? (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <CheckCircleIcon className="h-5 w-5 text-green-500" />
                                <span className="font-medium text-green-700 dark:text-green-300">
                                    Clé API configurée
                                </span>
                            </div>
                            <p className="text-sm text-green-600 dark:text-green-400">
                                Votre clé API Gemini est configurée et active. Vous pouvez la modifier ou la supprimer.
                            </p>
                        </div>
                    ) : (
                        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <AlertCircleIcon className="h-5 w-5 text-orange-500" />
                                <span className="font-medium text-orange-700 dark:text-orange-300">
                                    Aucune clé API configurée
                                </span>
                            </div>
                            <p className="text-sm text-orange-600 dark:text-orange-400">
                                Vous devez configurer une clé API Gemini pour utiliser les fonctionnalités IA.
                            </p>
                        </div>
                    )}
                    
                    <div className="bg-white dark:bg-slate-700 rounded-lg p-4 border border-slate-200 dark:border-slate-600">
                        <h4 className="font-medium text-slate-800 dark:text-white mb-3">Fonctionnalités requises :</h4>
                        <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                            <li className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                                Génération de QCM et résumés
                            </li>
                            <li className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                                Création de fiches de révision
                            </li>
                            <li className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                                Extraction de texte depuis les images
                            </li>
                            <li className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                                Assistant conversationnel IA
                            </li>
                        </ul>
                    </div>
                    
                    <button
                        onClick={() => setShowApiKeyModal(true)}
                        className={`w-full flex items-center justify-center gap-2 font-medium py-3 px-4 rounded-lg transition-colors ${
                            hasApiKey 
                                ? 'bg-orange-600 text-white hover:bg-orange-700' 
                                : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        }`}
                    >
                        <KeyRoundIcon className="h-5 w-5" />
                        {hasApiKey ? 'Modifier la clé API' : 'Configurer la clé API'}
                    </button>
                </div>
            </div>
        </div>
    );

    const renderTabContent = () => {
        switch (activeTab) {
            case 'display':
                return renderDisplayTab();
            case 'notifications':
                return renderNotificationsTab();
            case 'api':
                return renderApiTab();
            case 'data':
                return renderDataTab();
            default:
                return null;
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 modal-backdrop">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden modal-animate animate-bounce-in">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <SettingsIcon className="h-6 w-6 text-indigo-500" />
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                            Paramètres utilisateur
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <XIcon className="h-5 w-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200 dark:border-slate-700">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
                                    activeTab === tab.id
                                        ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                <Icon className="h-4 w-4" />
                                {tab.name}
                            </button>
                        );
                    })}
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[60vh]">
                    {renderTabContent()}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                    <button
                        onClick={handleReset}
                        disabled={!hasChanges}
                        className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Réinitialiser
                    </button>
                    
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 transition-colors"
                        >
                            Annuler
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!hasChanges || isSaving}
                            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isSaving ? (
                                <ElegantSpinner />
                            ) : (
                                <>
                                    <SaveIcon className="h-4 w-4" />
                                    Sauvegarder
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Modal pour la configuration de la clé API */}
            {showApiKeyModal && (
                <ApiKeyModal
                    isOpen={showApiKeyModal}
                    onClose={handleApiKeyModalClose}
                    userId={currentUser.uid}
                    showNotification={showNotification}
                />
            )}
        </div>
    );
};

export default UserSettings; 