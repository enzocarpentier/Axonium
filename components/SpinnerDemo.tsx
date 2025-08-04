import React, { useState } from 'react';
import ElegantSpinner, { SpinnerType } from './spinners/ElegantSpinner';
import ProgressSpinner from './ProgressSpinner';
import LoadingContext from './LoadingContext';

const SpinnerDemo: React.FC = () => {
    const [selectedType, setSelectedType] = useState<SpinnerType>('dots');
    const [selectedSize, setSelectedSize] = useState<'sm' | 'md' | 'lg' | 'xl'>('md');
    const [selectedColor, setSelectedColor] = useState<'primary' | 'secondary' | 'white' | 'indigo' | 'emerald' | 'amber'>('primary');
    const [progress, setProgress] = useState(0);

    const spinnerTypes: SpinnerType[] = ['dots', 'bars', 'circles', 'pulse', 'ripple', 'wave', 'orbit', 'cube'];
    const sizes = ['sm', 'md', 'lg', 'xl'] as const;
    const colors = ['primary', 'secondary', 'white', 'indigo', 'emerald', 'amber'] as const;

    // Simulation de progression
    React.useEffect(() => {
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) return 0;
                return prev + 10;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-8 text-center">
                Démonstration des Spinners Élégants
            </h1>

            {/* Contrôles */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 mb-8 shadow-lg">
                <h2 className="text-xl font-semibold mb-4 text-slate-800 dark:text-white">Contrôles</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Type de spinner */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Type de Spinner
                        </label>
                        <select
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value as SpinnerType)}
                            className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                        >
                            {spinnerTypes.map(type => (
                                <option key={type} value={type}>
                                    {type.charAt(0).toUpperCase() + type.slice(1)}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Taille */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Taille
                        </label>
                        <select
                            value={selectedSize}
                            onChange={(e) => setSelectedSize(e.target.value as 'sm' | 'md' | 'lg' | 'xl')}
                            className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                        >
                            {sizes.map(size => (
                                <option key={size} value={size}>
                                    {size.toUpperCase()}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Couleur */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Couleur
                        </label>
                        <select
                            value={selectedColor}
                            onChange={(e) => setSelectedColor(e.target.value as 'primary' | 'secondary' | 'white' | 'indigo' | 'emerald' | 'amber')}
                            className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                        >
                            {colors.map(color => (
                                <option key={color} value={color}>
                                    {color.charAt(0).toUpperCase() + color.slice(1)}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Démonstration du spinner sélectionné */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-8 mb-8 shadow-lg">
                <h2 className="text-xl font-semibold mb-6 text-slate-800 dark:text-white text-center">
                    Spinner Sélectionné
                </h2>
                <div className="flex justify-center">
                    <ElegantSpinner
                        type={selectedType}
                        size={selectedSize}
                        color={selectedColor}
                    />
                </div>
            </div>

            {/* Tous les types de spinners */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-8 mb-8 shadow-lg">
                <h2 className="text-xl font-semibold mb-6 text-slate-800 dark:text-white text-center">
                    Tous les Types de Spinners
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    {spinnerTypes.map(type => (
                        <div key={type} className="text-center">
                            <div className="mb-2">
                                <ElegantSpinner type={type} size="md" color="primary" />
                            </div>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Spinners contextuels */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-8 mb-8 shadow-lg">
                <h2 className="text-xl font-semibold mb-6 text-slate-800 dark:text-white text-center">
                    Spinners Contextuels
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <h3 className="text-lg font-medium mb-4 text-slate-700 dark:text-slate-300">
                            Génération de Contenu
                        </h3>
                        <LoadingContext context="generation" size="md" />
                    </div>
                    <div>
                        <h3 className="text-lg font-medium mb-4 text-slate-700 dark:text-slate-300">
                            Export de Données
                        </h3>
                        <LoadingContext context="export" size="md" />
                    </div>
                </div>
            </div>

            {/* Spinner avec progression */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-lg">
                <h2 className="text-xl font-semibold mb-6 text-slate-800 dark:text-white text-center">
                    Spinner avec Barre de Progression
                </h2>
                <ProgressSpinner
                    progress={progress}
                    text="Traitement en cours..."
                    spinnerType="dots"
                    size="md"
                />
            </div>
        </div>
    );
};

export default SpinnerDemo; 