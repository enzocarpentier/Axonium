import React, { useState, useEffect } from 'react';
import { DocumentLibrary } from './DocumentLibrary';
import documentService from '../services/documentService';
import type { Document, DocumentProcessingResult } from '../types';
import { 
  XIcon, 
  CheckCircleIcon, 
  AlertCircleIcon, 
  FileTextIcon,
  ImageIcon,
  ArchiveIcon,
  CalendarIcon,
  TagIcon,
  StarIcon,
  InfoIcon
} from './icons';

interface DocumentSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onDocumentSelect: (document: Document, processedText: string) => void;
  className?: string;
}

export const DocumentSelector: React.FC<DocumentSelectorProps> = ({
  isOpen,
  onClose,
  onDocumentSelect,
  className = ''
}) => {
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [processing, setProcessing] = useState(false);
  const [processingResult, setProcessingResult] = useState<DocumentProcessingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showUploader, setShowUploader] = useState(false);

  // Traiter le document sélectionné
  const handleDocumentSelect = async (document: Document) => {
    setSelectedDocument(document);
    setProcessing(true);
    setError(null);

    try {
      const result = await documentService.processDocument(document);
      setProcessingResult(result);
      
      // Incrémenter le compteur d'utilisation
      await documentService.incrementUsageCount(document.id);
    } catch (error) {
      setError('Erreur lors du traitement du document');
      console.error('Erreur de traitement:', error);
    } finally {
      setProcessing(false);
    }
  };

  // Confirmer la sélection
  const handleConfirmSelection = () => {
    if (selectedDocument && processingResult) {
      onDocumentSelect(selectedDocument, processingResult.text);
      onClose();
      // Réinitialiser l'état
      setSelectedDocument(null);
      setProcessingResult(null);
      setError(null);
    }
  };

  // Fermer le modal
  const handleClose = () => {
    onClose();
    setSelectedDocument(null);
    setProcessingResult(null);
    setError(null);
  };

  // Formater la taille du texte
  const formatTextPreview = (text: string, maxLength: number = 200): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Obtenir l'icône du type de fichier
  const getFileIcon = (type: Document['type']): React.ReactNode => {
    switch (type) {
      case 'pdf':
        return <FileTextIcon className="h-8 w-8 text-red-500" />;
      case 'image':
        return <ImageIcon className="h-8 w-8 text-green-500" />;
      case 'text':
        return <FileTextIcon className="h-8 w-8 text-blue-500" />;
      default:
        return <ArchiveIcon className="h-8 w-8 text-gray-500" />;
    }
  };

  // Formater la taille du fichier
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
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden ${className}`}>
        {/* En-tête */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Sélectionner un Document
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Choisissez un document de votre bibliothèque pour commencer la génération
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <XIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="flex h-[70vh]">
          {/* Bibliothèque de documents */}
          <div className="w-1/2 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
            <DocumentLibrary
              onDocumentSelect={handleDocumentSelect}
              selectedDocumentId={selectedDocument?.id}
              className="h-full"
              showUploader={showUploader}
              onUploaderToggle={setShowUploader}
            />
          </div>

          {/* Aperçu du document sélectionné */}
          <div className="w-1/2 p-6 overflow-y-auto">
            {!selectedDocument ? (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">📖</div>
                <p className="text-gray-600 dark:text-gray-400">
                  Sélectionnez un document pour voir son aperçu
                </p>
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center space-x-2 text-blue-800 dark:text-blue-200">
                    <InfoIcon className="h-5 w-5" />
                    <span className="text-sm font-medium">Conseil</span>
                  </div>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
                    Vous pouvez téléverser de nouveaux documents en cliquant sur "Ajouter" dans la bibliothèque.
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-6">
                  <div className="flex items-start space-x-4">
                    {getFileIcon(selectedDocument.type)}
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        {selectedDocument.name}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                        <span className="flex items-center">
                          <CalendarIcon className="h-4 w-4 mr-1" />
                          {new Date(selectedDocument.uploadedAt).toLocaleDateString('fr-FR')}
                        </span>
                        <span>📏 {formatFileSize(selectedDocument.size)}</span>
                        {selectedDocument.usageCount > 0 && (
                          <span className="flex items-center">
                            <StarIcon className="h-4 w-4 mr-1" />
                            Utilisé {selectedDocument.usageCount} fois
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {selectedDocument.description && (
                    <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {selectedDocument.description}
                      </p>
                    </div>
                  )}

                  {selectedDocument.tags.length > 0 && (
                    <div className="mt-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <TagIcon className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Tags</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedDocument.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {processing ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">
                      Traitement du document en cours...
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                      Extraction du texte et analyse du contenu
                    </p>
                  </div>
                ) : error ? (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <div className="flex items-center">
                      <AlertCircleIcon className="h-5 w-5 text-red-500 mr-2" />
                      <p className="text-red-800 dark:text-red-200">{error}</p>
                    </div>
                    <button
                      onClick={() => setError(null)}
                      className="text-red-600 dark:text-red-400 text-sm mt-2 hover:underline"
                    >
                      Réessayer
                    </button>
                  </div>
                ) : processingResult ? (
                  <div>
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                        Aperçu du contenu
                      </h4>
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 max-h-64 overflow-y-auto">
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {formatTextPreview(processingResult.text)}
                        </p>
                      </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <CheckCircleIcon className="h-5 w-5 text-green-500" />
                          <span className="text-blue-800 dark:text-blue-200 font-medium">
                            Document traité avec succès
                          </span>
                        </div>
                        <span className="text-blue-600 dark:text-blue-300 text-sm">
                          {processingResult.text.length} caractères
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={handleConfirmSelection}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition-colors font-medium"
                    >
                      Utiliser ce document pour la génération
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 