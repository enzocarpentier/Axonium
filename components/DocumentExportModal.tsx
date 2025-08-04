import React, { useState } from 'react';
import documentExportService, { type DocumentExportOptions, type DocumentExportData } from '../services/documentExportService';
import type { Document, DocumentLibrary } from '../types';
import { 
  XIcon, 
  DownloadIcon, 
  FileTextIcon,
  CheckCircleIcon,
  AlertCircleIcon
} from './icons';

interface DocumentExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: Document[];
  libraryStats: DocumentLibrary;
  userId: string;
}

export const DocumentExportModal: React.FC<DocumentExportModalProps> = ({
  isOpen,
  onClose,
  documents,
  libraryStats,
  userId
}) => {
  const [exportOptions, setExportOptions] = useState<DocumentExportOptions>({
    format: 'pdf',
    includeMetadata: true,
    includeProcessingData: true,
    includeUsageStats: true
  });
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleExport = async () => {
    if (documents.length === 0) {
      setError('Aucun document à exporter');
      return;
    }

    setIsExporting(true);
    setError(null);
    setSuccess(null);

    try {
      // Préparer les données d'export
      const exportData = documentExportService.prepareExportData(
        documents,
        libraryStats,
        userId
      );

      // Générer le nom de fichier
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `bibliotheque_documents_${timestamp}`;

      // Exporter selon les options
      await documentExportService.exportDocuments(exportData, exportOptions, filename);

      setSuccess('Export réussi ! Le fichier a été téléchargé.');
      
      // Fermer le modal après 2 secondes
      setTimeout(() => {
        onClose();
        setSuccess(null);
      }, 2000);
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      setError('Erreur lors de l\'export. Veuillez réessayer.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleGenerateReport = async () => {
    setIsExporting(true);
    setError(null);
    setSuccess(null);

    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `rapport_bibliotheque_${timestamp}`;

      await documentExportService.generateLibraryReport(
        documents,
        libraryStats,
        userId,
        filename
      );

      setSuccess('Rapport généré avec succès ! Le fichier a été téléchargé.');
      
      setTimeout(() => {
        onClose();
        setSuccess(null);
      }, 2000);
    } catch (error) {
      console.error('Erreur lors de la génération du rapport:', error);
      setError('Erreur lors de la génération du rapport. Veuillez réessayer.');
    } finally {
      setIsExporting(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* En-tête */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Exporter la Bibliothèque
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Exportez vos documents et leurs métadonnées
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <XIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Contenu */}
        <div className="p-6">
          {/* Statistiques */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              Résumé de la bibliothèque
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Documents:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  {documents.length}
                </span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Taille totale:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  {formatFileSize(documents.reduce((sum, doc) => sum + (doc.size || 0), 0))}
                </span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Types:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  {Object.keys(libraryStats.documentsByType).length}
                </span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Utilisations totales:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  {documents.reduce((sum, doc) => sum + (doc.usageCount || 0), 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Options d'export */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              Options d'export
            </h3>
            
            {/* Format */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Format d'export
              </label>
              <select
                value={exportOptions.format}
                onChange={(e) => setExportOptions(prev => ({ ...prev, format: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              >
                <option value="pdf">PDF</option>
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
              </select>
            </div>

            {/* Options incluses */}
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={exportOptions.includeMetadata}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, includeMetadata: e.target.checked }))}
                  className="mr-3"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Inclure les métadonnées (nom, type, taille, dates)
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={exportOptions.includeProcessingData}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, includeProcessingData: e.target.checked }))}
                  className="mr-3"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Inclure les données de traitement (texte extrait, statut)
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={exportOptions.includeUsageStats}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, includeUsageStats: e.target.checked }))}
                  className="mr-3"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Inclure les statistiques d'utilisation
                </span>
              </label>
            </div>
          </div>

          {/* Messages d'erreur et de succès */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center">
                <AlertCircleIcon className="h-5 w-5 text-red-500 mr-2" />
                <p className="text-red-800 dark:text-red-200">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center">
                <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                <p className="text-green-800 dark:text-green-200">{success}</p>
              </div>
            </div>
          )}

          {/* Boutons d'action */}
          <div className="flex space-x-3">
            <button
              onClick={handleExport}
              disabled={isExporting || documents.length === 0}
              className="flex-1 flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg transition-colors font-medium"
            >
              <DownloadIcon className="h-5 w-5" />
              <span>
                {isExporting ? 'Export en cours...' : 'Exporter la bibliothèque'}
              </span>
            </button>

            <button
              onClick={handleGenerateReport}
              disabled={isExporting || documents.length === 0}
              className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg transition-colors font-medium"
            >
              <FileTextIcon className="h-5 w-5" />
              <span>Rapport</span>
            </button>
          </div>

          {/* Informations */}
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Note:</strong> L'export inclut les métadonnées des documents mais pas les fichiers eux-mêmes.
              Les fichiers restent stockés dans votre bibliothèque.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}; 