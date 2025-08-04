import React from 'react';
import ElegantSpinner, { SpinnerType } from './spinners/ElegantSpinner';

export type LoadingContext = 
    | 'generation' 
    | 'export' 
    | 'sessions' 
    | 'files' 
    | 'auth' 
    | 'general';

interface LoadingContextProps {
    context: LoadingContext;
    text?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    showProgress?: boolean;
    progress?: number;
    className?: string;
}

const LoadingContext: React.FC<LoadingContextProps> = ({
    context,
    text,
    size = 'lg',
    showProgress = false,
    progress = 0,
    className = ''
}) => {
    const getContextConfig = (): {
        spinnerType: SpinnerType;
        defaultText: string;
        color: 'primary' | 'secondary' | 'white' | 'indigo' | 'emerald' | 'amber';
    } => {
        switch (context) {
            case 'generation':
                return {
                    spinnerType: 'orbit',
                    defaultText: 'Génération de votre contenu en cours...',
                    color: 'indigo'
                };
            case 'export':
                return {
                    spinnerType: 'circles',
                    defaultText: 'Export de vos données en cours...',
                    color: 'emerald'
                };
            case 'sessions':
                return {
                    spinnerType: 'dots',
                    defaultText: 'Chargement de vos sessions...',
                    color: 'primary'
                };
            case 'files':
                return {
                    spinnerType: 'wave',
                    defaultText: 'Traitement du fichier en cours...',
                    color: 'amber'
                };
            case 'auth':
                return {
                    spinnerType: 'pulse',
                    defaultText: 'Authentification en cours...',
                    color: 'primary'
                };
            case 'general':
            default:
                return {
                    spinnerType: 'circles',
                    defaultText: 'Chargement en cours...',
                    color: 'primary'
                };
        }
    };

    const config = getContextConfig();

    return (
        <div className={`flex flex-col items-center justify-center text-center p-8 ${className}`}>
            {/* Spinner élégant */}
            <div className="mb-6">
                <ElegantSpinner
                    type={config.spinnerType}
                    size={size}
                    color={config.color}
                />
            </div>

            {/* Texte de chargement */}
            <div className="space-y-2">
                <p className="text-lg font-medium text-slate-700 dark:text-slate-300">
                    {text || config.defaultText}
                </p>
                
                {/* Barre de progression optionnelle */}
                {showProgress && (
                    <div className="w-64 bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-300 ease-out"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                )}

                {/* Messages contextuels */}
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    {context === 'generation' && 'L\'IA analyse votre document...'}
                    {context === 'export' && 'Préparation de vos données...'}
                    {context === 'sessions' && 'Récupération de votre historique...'}
                    {context === 'files' && 'Extraction et analyse du contenu...'}
                    {context === 'auth' && 'Vérification de vos identifiants...'}
                    {context === 'general' && 'Veuillez patienter...'}
                </p>
            </div>
        </div>
    );
};

export default LoadingContext; 