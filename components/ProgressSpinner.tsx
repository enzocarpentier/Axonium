import React from 'react';
import ElegantSpinner from './spinners/ElegantSpinner';

interface ProgressSpinnerProps {
    progress: number;
    text?: string;
    subText?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    showSpinner?: boolean;
    spinnerType?: 'dots' | 'bars' | 'circles' | 'pulse' | 'ripple' | 'wave' | 'orbit' | 'cube';
    className?: string;
}

const ProgressSpinner: React.FC<ProgressSpinnerProps> = ({
    progress,
    text = 'Traitement en cours...',
    subText,
    size = 'md',
    showSpinner = true,
    spinnerType = 'dots',
    className = ''
}) => {
    const getProgressColor = (progress: number) => {
        if (progress < 30) return 'from-red-500 to-orange-500';
        if (progress < 70) return 'from-orange-500 to-yellow-500';
        if (progress < 90) return 'from-yellow-500 to-green-500';
        return 'from-green-500 to-emerald-500';
    };

    const getProgressText = (progress: number) => {
        if (progress < 30) return 'Démarrage...';
        if (progress < 70) return 'Traitement...';
        if (progress < 90) return 'Finalisation...';
        return 'Terminé !';
    };

    return (
        <div className={`flex flex-col items-center justify-center p-6 ${className}`}>
            {/* Spinner et barre de progression */}
            <div className="w-full max-w-md space-y-4">
                {/* Spinner optionnel */}
                {showSpinner && (
                    <div className="flex justify-center mb-4">
                        <ElegantSpinner
                            type={spinnerType}
                            size={size}
                            color="primary"
                        />
                    </div>
                )}

                {/* Texte principal */}
                <div className="text-center mb-4">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">
                        {text}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        {subText || getProgressText(progress)}
                    </p>
                </div>

                {/* Barre de progression */}
                <div className="space-y-2">
                    <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                        <span>Progression</span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                    
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                        <div 
                            className={`h-full bg-gradient-to-r ${getProgressColor(progress)} transition-all duration-500 ease-out relative`}
                            style={{ width: `${progress}%` }}
                        >
                            {/* Effet de brillance */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
                        </div>
                    </div>
                </div>

                {/* Indicateurs visuels */}
                <div className="flex justify-center space-x-2 mt-4">
                    {[0, 25, 50, 75, 100].map((step) => (
                        <div
                            key={step}
                            className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                progress >= step 
                                    ? 'bg-indigo-500 scale-125' 
                                    : 'bg-slate-300 dark:bg-slate-600'
                            }`}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ProgressSpinner; 