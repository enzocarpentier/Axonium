import { db, storage } from '../firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  getStorage, 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject,
  StorageReference 
} from 'firebase/storage';
import type { Document, DocumentLibrary, DocumentProcessingResult, DocumentUploadProgress } from '../types';
import { extractTextFromImage } from './geminiService';

export class DocumentService {
  private static instance: DocumentService;

  private constructor() {}

  public static getInstance(): DocumentService {
    if (!DocumentService.instance) {
      DocumentService.instance = new DocumentService();
    }
    return DocumentService.instance;
  }

  // Téléverser un document vers Firebase Storage
  async uploadDocument(file: File, userId: string): Promise<DocumentUploadProgress> {
    return new Promise((resolve, reject) => {
      try {
        // Créer une référence unique pour le fichier
        const timestamp = Date.now();
        const fileName = `${timestamp}_${file.name}`;
        const storageRef = ref(storage!, `documents/${userId}/${fileName}`);

        // Créer la tâche de téléversement
        const uploadTask = uploadBytesResumable(storageRef, file);

        // Écouter les changements de progression
        uploadTask.on('state_changed', 
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            resolve({
              file,
              progress,
              status: 'uploading'
            });
          },
          (error) => {
            console.error('Erreur lors du téléversement:', error);
            resolve({
              file,
              progress: 0,
              status: 'error',
              error: 'Erreur lors du téléversement'
            });
          },
          async () => {
            try {
              // Obtenir l'URL de téléchargement
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              
              // Sauvegarder les métadonnées dans Firestore
              const document = await this.saveDocumentToFirestore(file, {
                downloadURL,
                storageRef: uploadTask.snapshot.ref.fullPath,
                size: uploadTask.snapshot.totalBytes
              }, userId);

              resolve({
                file,
                progress: 100,
                status: 'completed'
              });
            } catch (error) {
              console.error('Erreur lors de la sauvegarde:', error);
              resolve({
                file,
                progress: 0,
                status: 'error',
                error: error instanceof Error ? error.message : 'Erreur lors de la sauvegarde'
              });
            }
          }
        );
      } catch (error) {
        console.error('Erreur lors de l\'initialisation du téléversement:', error);
        resolve({
          file,
          progress: 0,
          status: 'error',
          error: 'Erreur lors de l\'initialisation'
        });
      }
    });
  }

  private async saveDocumentToFirestore(
    file: File, 
    storageResponse: {
      downloadURL: string;
      storageRef: string;
      size: number;
    }, 
    userId: string
  ): Promise<Document> {
    const documentData: Omit<Document, 'id'> = {
      userId,
      name: file.name,
      type: this.getFileType(file.name),
      size: storageResponse.size,
      firebaseStorageUrl: storageResponse.downloadURL,
      firebaseStorageRef: storageResponse.storageRef,
      uploadedAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
      usageCount: 0,
      isProcessed: false,
      processingStatus: 'pending',
      tags: this.generateDefaultTags(file.name),
      description: this.generateDescription(file.name),
      isPublic: false
    };

    const docRef = await addDoc(collection(db, 'documents'), documentData);
    return { id: docRef.id, ...documentData };
  }

  private getFileType(filename: string): Document['type'] {
    const extension = filename.toLowerCase().split('.').pop();
    
    if (['pdf'].includes(extension || '')) {
      return 'pdf';
    } else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) {
      return 'image';
    } else if (['txt', 'md', 'doc', 'docx'].includes(extension || '')) {
      return 'text';
    } else {
      return 'other';
    }
  }

  private generateDefaultTags(filename: string): string[] {
    const extension = filename.toLowerCase().split('.').pop();
    const tags: string[] = [];
    
    // Tags basés sur l'extension
    switch (extension) {
      case 'pdf':
        tags.push('pdf', 'document');
        break;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
        tags.push('image', 'photo');
        break;
      case 'txt':
        tags.push('texte', 'document');
        break;
      case 'docx':
        tags.push('word', 'document');
        break;
    }
    
    // Tags basés sur le nom du fichier
    const name = filename.toLowerCase();
    if (name.includes('cours') || name.includes('course')) tags.push('cours');
    if (name.includes('examen') || name.includes('exam')) tags.push('examen');
    if (name.includes('résumé') || name.includes('summary')) tags.push('résumé');
    if (name.includes('notes')) tags.push('notes');
    
    return tags;
  }

  private generateDescription(filename: string): string {
    const extension = filename.toLowerCase().split('.').pop();
    const name = filename.replace(/\.[^/.]+$/, ''); // Enlever l'extension
    
    switch (extension) {
      case 'pdf':
        return `Document PDF: ${name}`;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
        return `Image: ${name}`;
      case 'txt':
        return `Fichier texte: ${name}`;
      case 'docx':
        return `Document Word: ${name}`;
      default:
        return `Document: ${name}`;
    }
  }

  async getUserDocuments(userId: string): Promise<Document[]> {
    try {
      const q = query(
        collection(db, 'documents'),
        where('userId', '==', userId),
        orderBy('uploadedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Document));
    } catch (error) {
      console.error('Erreur lors de la récupération des documents:', error);
      return [];
    }
  }

  async getDocument(documentId: string): Promise<Document | null> {
    try {
      const docRef = doc(db, 'documents', documentId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Document;
      }
      return null;
    } catch (error) {
      console.error('Erreur lors de la récupération du document:', error);
      return null;
    }
  }

  async updateDocument(documentId: string, updates: Partial<Document>): Promise<void> {
    try {
      const docRef = doc(db, 'documents', documentId);
      await updateDoc(docRef, {
        ...updates,
        lastUpdatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du document:', error);
      throw error;
    }
  }

  async deleteDocument(documentId: string): Promise<void> {
    try {
      // Récupérer le document pour obtenir la référence de stockage
      const document = await this.getDocument(documentId);
      if (!document) {
        throw new Error('Document non trouvé');
      }

      // Supprimer le fichier de Firebase Storage
      if (document.firebaseStorageRef) {
        const storageRef = ref(storage!, document.firebaseStorageRef);
        await deleteObject(storageRef);
      }

      // Supprimer le document de Firestore
      const docRef = doc(db, 'documents', documentId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Erreur lors de la suppression du document:', error);
      throw error;
    }
  }

  async processDocument(document: Document): Promise<DocumentProcessingResult> {
    try {
      // Marquer comme en cours de traitement
      await this.updateDocument(document.id, {
        processingStatus: 'processing',
        isProcessed: false
      });

      let result: DocumentProcessingResult;

      switch (document.type) {
        case 'pdf':
          result = await this.processPDF(document.firebaseStorageUrl);
          break;
        case 'image':
          result = await this.processImage(document.firebaseStorageUrl, document.name);
          break;
        case 'text':
          result = await this.processTextFile(document.firebaseStorageUrl);
          break;
        default:
          throw new Error(`Type de document non supporté: ${document.type}`);
      }

      // Marquer comme traité
      await this.updateDocument(document.id, {
        processingStatus: 'completed',
        isProcessed: true,
        processedText: result.text,
        processingError: null
      });

      return result;
    } catch (error) {
      // Marquer l'erreur
      await this.updateDocument(document.id, {
        processingStatus: 'error',
        isProcessed: false,
        processingError: error instanceof Error ? error.message : 'Erreur inconnue'
      });
      throw error;
    }
  }

  private async processPDF(url: string): Promise<DocumentProcessingResult> {
    try {
      // Télécharger le PDF
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      
      // Utiliser pdfjsLib pour extraire le texte
      const pdf = await (window as any).pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map((item: any) => 'str' in item ? item.str : '').join(' ') + '\n\n';
      }

      return {
        text: fullText.trim(),
        confidence: 0.9,
        processingTime: Date.now()
      };
    } catch (error) {
      console.error('Erreur lors du traitement PDF:', error);
      throw new Error('Impossible de traiter le fichier PDF');
    }
  }

  private async processImage(url: string, filename: string): Promise<DocumentProcessingResult> {
    try {
      // Télécharger l'image
      const response = await fetch(url);
      const blob = await response.blob();
      
      // Convertir en base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          const base64String = result.split(',')[1];
          resolve(base64String);
        };
        reader.onerror = reject;
      });
      
      reader.readAsDataURL(blob);
      const base64String = await base64Promise;
      
      // Utiliser le service Gemini pour extraire le texte
      const extractedText = await extractTextFromImage(base64String, blob.type, 'system');
      
      return {
        text: extractedText,
        confidence: 0.8,
        processingTime: Date.now()
      };
    } catch (error) {
      console.error('Erreur lors du traitement d\'image:', error);
      throw new Error('Impossible de traiter l\'image. Vérifiez que votre clé API Gemini est configurée.');
    }
  }

  private async processTextFile(url: string): Promise<DocumentProcessingResult> {
    try {
      const response = await fetch(url);
      const text = await response.text();
      
      return {
        text: text.trim(),
        confidence: 1.0,
        processingTime: Date.now()
      };
    } catch (error) {
      console.error('Erreur lors du traitement du fichier texte:', error);
      throw new Error('Impossible de traiter le fichier texte');
    }
  }

  async searchDocuments(userId: string, query: string): Promise<Document[]> {
    try {
      const allDocuments = await this.getUserDocuments(userId);
      
      return allDocuments.filter(doc => 
        doc.name.toLowerCase().includes(query.toLowerCase()) ||
        doc.description?.toLowerCase().includes(query.toLowerCase()) ||
        doc.tags?.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
      );
    } catch (error) {
      console.error('Erreur lors de la recherche de documents:', error);
      return [];
    }
  }

  async incrementUsageCount(documentId: string): Promise<void> {
    try {
      const docRef = doc(db, 'documents', documentId);
      await updateDoc(docRef, {
        usageCount: (await getDoc(docRef)).data()?.usageCount + 1,
        lastUsedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erreur lors de l\'incrémentation du compteur d\'usage:', error);
    }
  }

  async getLibraryStats(userId: string): Promise<DocumentLibrary> {
    try {
      const documents = await this.getUserDocuments(userId);
      
      const stats = {
        totalDocuments: documents.length,
        totalSize: documents.reduce((sum, doc) => sum + (doc.size || 0), 0),
        documentsByType: documents.reduce((acc, doc) => {
          acc[doc.type] = (acc[doc.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        recentDocuments: documents.slice(0, 5),
        mostUsedDocuments: documents
          .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
          .slice(0, 5)
      };

      return stats;
    } catch (error) {
      console.error('Erreur lors du calcul des statistiques:', error);
      return {
        totalDocuments: 0,
        totalSize: 0,
        documentsByType: {},
        recentDocuments: [],
        mostUsedDocuments: []
      };
    }
  }

  // Nouvelle méthode pour obtenir les documents récemment utilisés
  async getRecentlyUsedDocuments(userId: string, limit: number = 10): Promise<Document[]> {
    try {
      const q = query(
        collection(db, 'documents'),
        where('userId', '==', userId),
        where('usageCount', '>', 0),
        orderBy('usageCount', 'desc'),
        orderBy('lastUsedAt', 'desc'),
        limit(limit)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Document));
    } catch (error) {
      console.error('Erreur lors de la récupération des documents récents:', error);
      return [];
    }
  }

  // Nouvelle méthode pour mettre à jour les tags d'un document
  async updateDocumentTags(documentId: string, tags: string[]): Promise<void> {
    try {
      await this.updateDocument(documentId, { tags });
    } catch (error) {
      console.error('Erreur lors de la mise à jour des tags:', error);
      throw error;
    }
  }

  // Nouvelle méthode pour mettre à jour la description d'un document
  async updateDocumentDescription(documentId: string, description: string): Promise<void> {
    try {
      await this.updateDocument(documentId, { description });
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la description:', error);
      throw error;
    }
  }
}

export default DocumentService.getInstance(); 