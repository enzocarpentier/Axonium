import React, { useState } from 'react';
import { XIcon, DownloadIcon, FileTextIcon, FileIcon } from './icons';
import ElegantSpinner from './spinners/ElegantSpinner';
import type { ExportOptions, ExportData } from '../services/exportService';

interface DataExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onExport: (options: ExportOptions) => Promise<void>;
    isLoading?: boolean;
}

const DataExportModal: React.FC<DataExportModalProps> = ({ 
    isOpen, 
    onClose, 
    onExport, 
    isLoading = false 
}) => {
    const [exportOptions, setExportOptions] = useState<ExportOptions>({
        format: 'pdf',
        includeSessions: true,
        includePreferences: true,
        includeTemplates: true,
        includeProfile: true
    });

    const handleExport = async () => {
        try {
            await onExport(exportOptions);
            onClose();
        } catch (error) {
            console.error('Erreur lors de l\'export:', error);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 modal-backdrop">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto modal-animate animate-bounce-in">
                {/* En-tête */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <DownloadIcon className="h-6 w-6 text-indigo-500" />
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                            Export de données
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                        <XIcon className="h-5 w-5" />
                    </button>
                </div>

                {/* Contenu */}
                <div className="p-6 space-y-6">
                    {/* Format d'export */}
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
                            Format d'export
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setExportOptions(prev => ({ ...prev, format: 'pdf' }))}
                                className={`p-4 rounded-xl border-2 transition-all ${
                                    exportOptions.format === 'pdf'
                                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                                        : 'border-slate-200 dark:border-slate-600 hover:border-indigo-300'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <FileTextIcon className="h-6 w-6 text-indigo-500" />
                                    <div className="text-left">
                                        <div className="font-semibold text-slate-900 dark:text-white">PDF</div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400">
                                            Document formaté
                                        </div>
                                    </div>
                                </div>
                            </button>
                            
                            <button
                                onClick={() => setExportOptions(prev => ({ ...prev, format: 'json' }))}
                                className={`p-4 rounded-xl border-2 transition-all ${
                                    exportOptions.format === 'json'
                                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                                        : 'border-slate-200 dark:border-slate-600 hover:border-indigo-300'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <FileIcon className="h-6 w-6 text-indigo-500" />
                                    <div className="text-left">
                                        <div className="font-semibold text-slate-900 dark:text-white">JSON</div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400">
                                            Données brutes
                                        </div>
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Options d'inclusion */}
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
                            Données à exporter
                        </h3>
                        <div className="space-y-3">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={exportOptions.includeSessions}
                                    onChange={(e) => setExportOptions(prev => ({ 
                                        ...prev, 
                                        includeSessions: e.target.checked 
                                    }))}
                                    className="w-4 h-4 text-indigo-600 bg-slate-100 border-slate-300 rounded focus:ring-indigo-500"
                                />
                                <div>
                                    <div className="font-medium text-slate-900 dark:text-white">
                                        Sessions d'étude
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                        QCM, résumés, fiches, etc.
                                    </div>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={exportOptions.includePreferences}
                                    onChange={(e) => setExportOptions(prev => ({ 
                                        ...prev, 
                                        includePreferences: e.target.checked 
                                    }))}
                                    className="w-4 h-4 text-indigo-600 bg-slate-100 border-slate-300 rounded focus:ring-indigo-500"
                                />
                                <div>
                                    <div className="font-medium text-slate-900 dark:text-white">
                                        Préférences utilisateur
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                        Paramètres et configurations
                                    </div>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={exportOptions.includeTemplates}
                                    onChange={(e) => setExportOptions(prev => ({ 
                                        ...prev, 
                                        includeTemplates: e.target.checked 
                                    }))}
                                    className="w-4 h-4 text-indigo-600 bg-slate-100 border-slate-300 rounded focus:ring-indigo-500"
                                />
                                <div>
                                    <div className="font-medium text-slate-900 dark:text-white">
                                        Templates personnalisés
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                        Modèles créés par l'utilisateur
                                    </div>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={exportOptions.includeProfile}
                                    onChange={(e) => setExportOptions(prev => ({ 
                                        ...prev, 
                                        includeProfile: e.target.checked 
                                    }))}
                                    className="w-4 h-4 text-indigo-600 bg-slate-100 border-slate-300 rounded focus:ring-indigo-500"
                                />
                                <div>
                                    <div className="font-medium text-slate-900 dark:text-white">
                                        Profil utilisateur
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                        Informations de compte
                                    </div>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Informations */}
                    <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                            <div className="text-sm text-slate-600 dark:text-slate-300">
                                <p className="font-medium mb-1">Informations importantes :</p>
                                <ul className="space-y-1 text-xs">
                                    <li>• L'export inclut toutes vos données personnelles</li>
                                    <li>• Les fichiers sont téléchargés localement</li>
                                    <li>• Aucune donnée n'est envoyée à des tiers</li>
                                    <li>• Format PDF pour lecture, JSON pour réimport</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 p-6 border-t border-slate-200 dark:border-slate-700">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 text-slate-600 dark:text-slate-300 font-medium rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={isLoading || (!exportOptions.includeSessions && !exportOptions.includePreferences && !exportOptions.includeTemplates && !exportOptions.includeProfile)}
                        className="flex-1 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <ElegantSpinner />
                                Export en cours...
                            </>
                        ) : (
                            <>
                                <DownloadIcon className="h-4 w-4" />
                                Exporter
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DataExportModal; 