import React from 'react';
import { UserPreferences } from '../types';
import { 
    BrainIcon, 
    PaletteIcon, 
    BellIcon, 
    FileTextIcon, 
    SlidersIcon,
    SettingsIcon
} from './icons';

interface PreferencesSummaryProps {
    preferences: UserPreferences;
    onOpenSettings: () => void;
}

const PreferencesSummary: React.FC<PreferencesSummaryProps> = ({ preferences, onOpenSettings }) => {
    const formatGenerationType = (type: string) => {
        const types = {
            'qcm': 'QCM',
            'summary': 'Résumé',
            'revision_sheet': 'Fiche de révision',
            'mind_map': 'Carte mentale',
            'chat': 'Chat interactif',
            'guided_study': 'Étude guidée'
        };
        return types[type as keyof typeof types] || type;
    };

    const formatTheme = (theme: string) => {
        const themes = {
            'light': 'Clair',
            'dark': 'Sombre',
            'auto': 'Auto'
        };
        return themes[theme as keyof typeof themes] || theme;
    };

    const formatFontSize = (size: string) => {
        const sizes = {
            'small': 'Petite',
            'medium': 'Moyenne',
            'large': 'Grande'
        };
        return sizes[size as keyof typeof sizes] || size;
    };

    const formatExportFormat = (format: string) => {
        const formats = {
            'pdf': 'PDF',
            'txt': 'TXT',
            'docx': 'DOCX'
        };
        return formats[format as keyof typeof formats] || format;
    };

    return (
        <div className="bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-700 dark:to-slate-600 rounded-xl p-4 border border-slate-200 dark:border-slate-600">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                    <SettingsIcon className="h-5 w-5 text-indigo-500" />
                    Vos préférences
                </h3>
                <button
                    onClick={onOpenSettings}
                    className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium transition-colors"
                >
                    Modifier
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Préférences de génération */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <BrainIcon className="h-4 w-4 text-indigo-500" />
                        <span className="font-medium">Génération</span>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-500 dark:text-slate-400">Type par défaut:</span>
                            <span className="font-medium text-slate-700 dark:text-slate-200">
                                {formatGenerationType(preferences.defaultGenerationType)}
                            </span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-500 dark:text-slate-400">Questions:</span>
                            <span className="font-medium text-slate-700 dark:text-slate-200">
                                {preferences.defaultNumQuestions}
                            </span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-500 dark:text-slate-400">Difficulté:</span>
                            <span className="font-medium text-slate-700 dark:text-slate-200">
                                {preferences.defaultDifficulty}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Préférences d'affichage */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <PaletteIcon className="h-4 w-4 text-emerald-500" />
                        <span className="font-medium">Affichage</span>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-500 dark:text-slate-400">Thème:</span>
                            <span className="font-medium text-slate-700 dark:text-slate-200">
                                {formatTheme(preferences.theme)}
                            </span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-500 dark:text-slate-400">Police:</span>
                            <span className="font-medium text-slate-700 dark:text-slate-200">
                                {formatFontSize(preferences.fontSize)}
                            </span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-500 dark:text-slate-400">Mode compact:</span>
                            <span className="font-medium text-slate-700 dark:text-slate-200">
                                {preferences.compactMode ? 'Activé' : 'Désactivé'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Préférences de notifications */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <BellIcon className="h-4 w-4 text-amber-500" />
                        <span className="font-medium">Notifications</span>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-500 dark:text-slate-400">Email:</span>
                            <span className={`font-medium ${preferences.emailNotifications ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {preferences.emailNotifications ? 'Activé' : 'Désactivé'}
                            </span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-500 dark:text-slate-400">Push:</span>
                            <span className={`font-medium ${preferences.pushNotifications ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {preferences.pushNotifications ? 'Activé' : 'Désactivé'}
                            </span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-500 dark:text-slate-400">Sons:</span>
                            <span className={`font-medium ${preferences.notificationSound ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {preferences.notificationSound ? 'Activé' : 'Désactivé'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Préférences de contenu */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <FileTextIcon className="h-4 w-4 text-purple-500" />
                        <span className="font-medium">Contenu</span>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-500 dark:text-slate-400">Auto-sauvegarde:</span>
                            <span className={`font-medium ${preferences.autoSave ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {preferences.autoSave ? 'Activé' : 'Désactivé'}
                            </span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-500 dark:text-slate-400">Export:</span>
                            <span className="font-medium text-slate-700 dark:text-slate-200">
                                {formatExportFormat(preferences.exportFormat)}
                            </span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-500 dark:text-slate-400">Modèle IA:</span>
                            <span className="font-medium text-slate-700 dark:text-slate-200">
                                {preferences.aiModel.toUpperCase()}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Indicateur de personnalisation */}
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-600">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                        Personnalisation active
                    </span>
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                            Configuré
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PreferencesSummary; 