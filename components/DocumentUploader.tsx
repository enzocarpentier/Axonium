import React, { useState, useCallback } from 'react';
import { auth } from '../firebase';
import documentService from '../services/documentService';
import type { Document, DocumentUploadProgress } from '../types';
import { UploadCloudIcon, XIcon, CheckCircleIcon, AlertCircleIcon } from './icons';

interface DocumentUploaderProps {
  onUploadComplete?: (document: Document) => void;
  onClose?: () => void;
  className?: string;
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  onUploadComplete,
  onClose,
  className = ''
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<DocumentUploadProgress[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const user = auth.currentUser;

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(Array.from(files));
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(Array.from(files));
    }
  }, []);

  const handleFileUpload = async (files: File[]) => {
    if (!user) {
      setError('Vous devez être connecté pour téléverser des documents');
      return;
    }

    setIsUploading(true);
    setError(null);

    const newUploads: DocumentUploadProgress[] = files.map(file => ({
      file,
      progress: 0,
      status: 'uploading'
    }));

    setUploadProgress(newUploads);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Vérifier la taille du fichier (max 50MB)
        if (file.size > 50 * 1024 * 1024) {
          setError(`Le fichier ${file.name} est trop volumineux (max 50MB)`);
          continue;
        }

        // Vérifier le type de fichier
        const allowedTypes = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'txt', 'docx'];
        const fileExtension = file.name.toLowerCase().split('.').pop();
        if (!fileExtension || !allowedTypes.includes(fileExtension)) {
          setError(`Type de fichier non supporté: ${file.name}`);
          continue;
        }

        try {
          const result = await documentService.uploadDocument(file, user.uid);
          
          // Mettre à jour le progrès
          setUploadProgress(prev => 
            prev.map((upload, index) => 
              index === i ? result : upload
            )
          );

          if (result.status === 'completed') {
            // Notifier le parent si nécessaire
            if (onUploadComplete) {
              // Récupérer le document créé
              const documents = await documentService.getUserDocuments(user.uid);
              const newDocument = documents.find(doc => 
                doc.name === file.name && 
                doc.uploadedAt.includes(new Date().toISOString().split('T')[0])
              );
              if (newDocument) {
                onUploadComplete(newDocument);
              }
            }
          }
        } catch (error) {
          setError(`Erreur lors du téléversement de ${file.name}`);
          console.error('Erreur de téléversement:', error);
        }
      }
    } finally {
      setIsUploading(false);
      // Nettoyer le progrès après 5 secondes
      setTimeout(() => setUploadProgress([]), 5000);
    }
  };

  const getFileIcon = (type: string): string => {
    switch (type.toLowerCase()) {
      case 'pdf':
        return '📄';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
        return '🖼️';
      case 'txt':
        return '📝';
      case 'docx':
        return '📘';
      default:
        return '📄';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg ${className}`}>
      {/* En-tête */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Téléverser des Documents
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Ajoutez vos documents à la bibliothèque pour les utiliser dans vos générations
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <XIcon className="h-6 w-6" />
            </button>
          )}
        </div>
      </div>

      {/* Zone de téléversement */}
      <div className="p-6">
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <UploadCloudIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Glissez-déposez vos fichiers ici
          </p>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            ou cliquez pour sélectionner des fichiers
          </p>
          <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors font-medium">
            Sélectionner des fichiers
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.txt,.docx"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isUploading}
            />
          </label>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
            Formats supportés: PDF, Images (JPG, PNG, GIF, WebP), Texte (TXT), Word (DOCX)
            <br />
            Taille maximale: 50MB par fichier
          </p>
        </div>

        {/* Messages d'erreur */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center">
              <AlertCircleIcon className="h-5 w-5 text-red-500 mr-2" />
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-600 dark:text-red-400 text-sm mt-2 hover:underline"
            >
              Fermer
            </button>
          </div>
        )}

        {/* Progrès de téléversement */}
        {uploadProgress.length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              Téléversement en cours...
            </h3>
            <div className="space-y-3">
              {uploadProgress.map((upload, index) => (
                <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">{getFileIcon(upload.file.name)}</span>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {upload.file.name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {formatFileSize(upload.file.size)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {upload.status === 'completed' && (
                        <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      )}
                      {upload.status === 'error' && (
                        <AlertCircleIcon className="h-5 w-5 text-red-500" />
                      )}
                      <span className="text-sm font-medium">
                        {upload.progress.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        upload.status === 'completed'
                          ? 'bg-green-500'
                          : upload.status === 'error'
                          ? 'bg-red-500'
                          : 'bg-blue-500'
                      }`}
                      style={{ width: `${upload.progress}%` }}
                    />
                  </div>
                  
                  {upload.status === 'error' && upload.error && (
                    <p className="text-red-600 dark:text-red-400 text-sm mt-2">
                      {upload.error}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 