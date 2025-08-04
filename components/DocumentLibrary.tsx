import React, { useState, useEffect, useCallback } from 'react';
import { auth } from '../firebase';
import documentService from '../services/documentService';
import type { Document, DocumentUploadProgress } from '../types';
import { DocumentUploader } from './DocumentUploader';
import { 
  SearchIcon, 
  PlusIcon, 
  Trash2Icon, 
  EditIcon, 
  TagIcon,
  CalendarIcon,
  FileTextIcon,
  ImageIcon,
  ArchiveIcon,
  StarIcon,
  AlertCircleIcon
} from './icons';

interface DocumentLibraryProps {
  onDocumentSelect?: (document: Document) => void;
  selectedDocumentId?: string;
  className?: string;
  showUploader?: boolean;
  onUploaderToggle?: (show: boolean) => void;
}

export const DocumentLibrary: React.FC<DocumentLibraryProps> = ({
  onDocumentSelect,
  selectedDocumentId,
  className = '',
  showUploader = false,
  onUploaderToggle
}) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'usage' | 'size'>('date');
  const [filterType, setFilterType] = useState<string>('all');

  const user = auth.currentUser;

  // Charger les documents
  const loadDocuments = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const userDocuments = await documentService.getUserDocuments(user.uid);
      setDocuments(userDocuments);
      setFilteredDocuments(userDocuments);
    } catch (error) {
      setError('Erreur lors du chargement des documents');
      console.error('Erreur lors du chargement des documents:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Rechercher et filtrer des documents
  const filterAndSearchDocuments = useCallback(() => {
    let filtered = documents;

    // Filtrer par type
    if (filterType !== 'all') {
      filtered = filtered.filter(doc => doc.type === filterType);
    }

    // Rechercher
    if (searchQuery.trim()) {
      filtered = filtered.filter(doc => 
        doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Trier
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'usage':
          return (b.usageCount || 0) - (a.usageCount || 0);
        case 'size':
          return (b.size || 0) - (a.size || 0);
        case 'date':
        default:
          return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
      }
    });

    setFilteredDocuments(filtered);
  }, [documents, searchQuery, sortBy, filterType]);

  // Effet pour filtrer et rechercher
  useEffect(() => {
    filterAndSearchDocuments();
  }, [filterAndSearchDocuments]);

  // Supprimer un document
  const handleDeleteDocument = async (documentId: string) => {
    if (!user) return;

    if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) {
      return;
    }

    try {
      await documentService.deleteDocument(documentId);
      await loadDocuments();
    } catch (error) {
      setError('Erreur lors de la suppression du document');
      console.error('Erreur de suppression:', error);
    }
  };

  // Gérer l'upload complet
  const handleUploadComplete = async (document: Document) => {
    await loadDocuments();
    if (onUploaderToggle) {
      onUploaderToggle(false);
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

  // Obtenir l'icône du type de fichier
  const getFileIcon = (type: Document['type']): React.ReactNode => {
    switch (type) {
      case 'pdf':
        return <FileTextIcon className="h-6 w-6 text-red-500" />;
      case 'image':
        return <ImageIcon className="h-6 w-6 text-green-500" />;
      case 'text':
        return <FileTextIcon className="h-6 w-6 text-blue-500" />;
      default:
        return <ArchiveIcon className="h-6 w-6 text-gray-500" />;
    }
  };

  // Obtenir le nom du type de fichier
  const getFileTypeName = (type: Document['type']): string => {
    switch (type) {
      case 'pdf':
        return 'PDF';
      case 'image':
        return 'Image';
      case 'text':
        return 'Texte';
      default:
        return 'Autre';
    }
  };

  // Effet pour charger les documents au montage
  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  if (!user) {
    return (
      <div className={`p-4 text-center text-gray-500 ${className}`}>
        Veuillez vous connecter pour accéder à votre bibliothèque de documents.
      </div>
    );
  }

  if (showUploader) {
    return (
      <DocumentUploader
        onUploadComplete={handleUploadComplete}
        onClose={() => onUploaderToggle?.(false)}
        className={className}
      />
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* En-tête */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              Bibliothèque de Documents
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {documents.length} document{documents.length !== 1 ? 's' : ''} • {formatFileSize(documents.reduce((sum, doc) => sum + (doc.size || 0), 0))}
            </p>
          </div>
          
          {/* Bouton d'ajout */}
          <button
            onClick={() => {
              console.log('Bouton Ajouter cliqué !');
              if (onUploaderToggle) {
                onUploaderToggle(true);
              } else {
                console.log('Fonction onUploaderToggle non disponible');
                // Ici on pourrait ouvrir une modale d'upload ou rediriger vers une page d'upload
              }
            }}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Ajouter</span>
          </button>
        </div>

        {/* Contrôles */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Barre de recherche */}
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher dans vos documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
            />
          </div>

          {/* Filtres */}
          <div className="flex gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            >
              <option value="all">Tous les types</option>
              <option value="pdf">PDF</option>
              <option value="image">Images</option>
              <option value="text">Texte</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            >
              <option value="date">Plus récents</option>
              <option value="name">Nom</option>
              <option value="usage">Plus utilisés</option>
              <option value="size">Taille</option>
            </select>

            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              title={viewMode === 'grid' ? 'Vue liste' : 'Vue grille'}
            >
              {viewMode === 'grid' ? (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Messages d'erreur */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
          <div className="flex items-start space-x-3">
            <AlertCircleIcon className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-800 dark:text-red-200 font-medium">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-red-600 dark:text-red-400 text-sm mt-2 hover:underline"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Liste des documents */}
      <div className="p-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Chargement de votre bibliothèque...</p>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="text-center py-8 px-8 flex flex-col items-center justify-center min-h-[300px]">
            <div className="text-6xl mb-6 flex justify-center">📚</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 text-center">
              {searchQuery ? 'Aucun document trouvé' : 'Votre bibliothèque est vide'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto leading-relaxed text-center">
              {searchQuery 
                ? 'Essayez de modifier vos critères de recherche' 
                : 'Commencez par téléverser vos premiers documents pour les réutiliser facilement'
              }
            </p>
            {!searchQuery && (
              <button
                onClick={() => {
                  console.log('Bouton Ajouter des documents cliqué !');
                  if (onUploaderToggle) {
                    onUploaderToggle(true);
                  } else {
                    console.log('Fonction onUploaderToggle non disponible');
                    // Ici on pourrait ouvrir une modale d'upload ou rediriger vers une page d'upload
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg transition-colors shadow-sm"
              >
                Ajouter des documents
              </button>
            )}
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
            {filteredDocuments.map((document) => (
              <div
                key={document.id}
                className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] ${
                  selectedDocumentId === document.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-200 dark:ring-blue-800'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                } ${viewMode === 'list' ? 'flex items-center space-x-4' : ''}`}
                onClick={() => onDocumentSelect?.(document)}
              >
                <div className={`flex items-start justify-between ${viewMode === 'list' ? 'flex-1' : ''}`}>
                  <div className={`flex items-center space-x-3 ${viewMode === 'list' ? 'flex-1' : ''}`}>
                    <div className="flex-shrink-0">
                      {getFileIcon(document.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 dark:text-white truncate">
                        {document.name}
                      </h3>
                      <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mt-1">
                        <span className="font-medium">{getFileTypeName(document.type)}</span>
                        <span>•</span>
                        <span>{formatFileSize(document.size)}</span>
                        {document.usageCount > 0 && (
                          <>
                            <span>•</span>
                            <span className="flex items-center text-yellow-600 dark:text-yellow-400">
                              <StarIcon className="h-4 w-4 mr-1" />
                              {document.usageCount}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <CalendarIcon className="h-4 w-4" />
                        <span>{new Date(document.uploadedAt).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: Implémenter l'édition
                      }}
                      className="text-gray-400 hover:text-blue-500 transition-colors p-1 rounded"
                      title="Éditer"
                    >
                      <EditIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteDocument(document.id);
                      }}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded"
                      title="Supprimer"
                    >
                      <Trash2Icon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                {document.tags && document.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {document.tags.slice(0, 3).map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs rounded flex items-center text-gray-600 dark:text-gray-300"
                      >
                        <TagIcon className="h-3 w-3 mr-1" />
                        {tag}
                      </span>
                    ))}
                    {document.tags.length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs rounded text-gray-600 dark:text-gray-300">
                        +{document.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}; 