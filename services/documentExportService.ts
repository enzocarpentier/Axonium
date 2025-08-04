import { jsPDF } from 'jspdf';
import type { Document, DocumentLibrary } from '../types';

export interface DocumentExportOptions {
  format: 'pdf' | 'json' | 'csv';
  includeMetadata: boolean;
  includeProcessingData: boolean;
  includeUsageStats: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface DocumentExportData {
  metadata: {
    exportDate: string;
    userId: string;
    totalDocuments: number;
    totalSize: number;
    documentsByType: Record<string, number>;
  };
  documents: Document[];
  libraryStats?: DocumentLibrary;
}

export class DocumentExportService {
  private static instance: DocumentExportService;

  private constructor() {}

  public static getInstance(): DocumentExportService {
    if (!DocumentExportService.instance) {
      DocumentExportService.instance = new DocumentExportService();
    }
    return DocumentExportService.instance;
  }

  // Préparer les données d'export
  prepareExportData(
    documents: Document[],
    libraryStats: DocumentLibrary,
    userId: string
  ): DocumentExportData {
    return {
      metadata: {
        exportDate: new Date().toISOString(),
        userId,
        totalDocuments: documents.length,
        totalSize: documents.reduce((sum, doc) => sum + (doc.size || 0), 0),
        documentsByType: documents.reduce((acc, doc) => {
          acc[doc.type] = (acc[doc.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      },
      documents,
      libraryStats
    };
  }

  // Exporter en JSON
  async exportToJSON(data: DocumentExportData, filename: string): Promise<void> {
    try {
      const jsonContent = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur lors de l\'export JSON:', error);
      throw new Error('Erreur lors de l\'export JSON');
    }
  }

  // Exporter en CSV
  async exportToCSV(data: DocumentExportData, filename: string): Promise<void> {
    try {
      const headers = [
        'Nom',
        'Type',
        'Taille (bytes)',
        'Date de téléversement',
        'Dernière utilisation',
        'Nombre d\'utilisations',
        'Tags',
        'Description',
        'URL de stockage'
      ];

      const csvContent = [
        headers.join(','),
        ...data.documents.map(doc => [
          `"${doc.name}"`,
          doc.type,
          doc.size,
          doc.uploadedAt,
          doc.lastUsedAt,
          doc.usageCount,
          `"${doc.tags.join('; ')}"`,
          `"${doc.description || ''}"`,
          doc.firebaseStorageUrl
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur lors de l\'export CSV:', error);
      throw new Error('Erreur lors de l\'export CSV');
    }
  }

  // Exporter en PDF
  async exportToPDF(data: DocumentExportData, filename: string): Promise<void> {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      let y = margin;

      const checkPageBreak = (heightNeeded: number) => {
        if (y + heightNeeded > doc.internal.pageSize.getHeight() - margin) {
          doc.addPage();
          y = margin;
        }
      };

      // En-tête
      doc.setFontSize(24).setFont('helvetica', 'bold');
      doc.text('Export de la Bibliothèque de Documents', pageWidth / 2, y, { align: 'center' });
      y += 15;

      // Métadonnées
      doc.setFontSize(12).setFont('helvetica', 'normal');
      doc.text(`Date d'export: ${new Date(data.metadata.exportDate).toLocaleDateString('fr-FR')}`, margin, y);
      y += 8;
      doc.text(`Total de documents: ${data.metadata.totalDocuments}`, margin, y);
      y += 8;
      doc.text(`Taille totale: ${this.formatFileSize(data.metadata.totalSize)}`, margin, y);
      y += 15;

      // Statistiques par type
      checkPageBreak(30);
      doc.setFontSize(16).setFont('helvetica', 'bold');
      doc.text('Répartition par type', margin, y);
      y += 10;

      Object.entries(data.metadata.documentsByType).forEach(([type, count]) => {
        doc.setFontSize(10).setFont('helvetica', 'normal');
        doc.text(`${this.getFileTypeName(type)}: ${count} document(s)`, margin + 5, y);
        y += 6;
      });
      y += 10;

      // Liste des documents
      checkPageBreak(30);
      doc.setFontSize(16).setFont('helvetica', 'bold');
      doc.text('Documents', margin, y);
      y += 10;

      data.documents.forEach((document, index) => {
        checkPageBreak(40);
        
        doc.setFontSize(12).setFont('helvetica', 'bold');
        doc.text(`${index + 1}. ${document.name}`, margin, y);
        y += 6;
        
        doc.setFontSize(10).setFont('helvetica', 'normal');
        doc.text(`Type: ${this.getFileTypeName(document.type)}`, margin + 5, y);
        y += 5;
        doc.text(`Taille: ${this.formatFileSize(document.size)}`, margin + 5, y);
        y += 5;
        doc.text(`Date: ${new Date(document.uploadedAt).toLocaleDateString('fr-FR')}`, margin + 5, y);
        y += 5;
        doc.text(`Utilisations: ${document.usageCount}`, margin + 5, y);
        y += 5;
        
        if (document.tags.length > 0) {
          doc.text(`Tags: ${document.tags.join(', ')}`, margin + 5, y);
          y += 5;
        }
        
        y += 8;
      });

      // Sauvegarder le PDF
      doc.save(`${filename}.pdf`);
    } catch (error) {
      console.error('Erreur lors de l\'export PDF:', error);
      throw new Error('Erreur lors de l\'export PDF');
    }
  }

  // Exporter selon les options
  async exportDocuments(data: DocumentExportData, options: DocumentExportOptions, filename: string): Promise<void> {
    try {
      if (options.format === 'json') {
        await this.exportToJSON(data, filename);
      } else if (options.format === 'csv') {
        await this.exportToCSV(data, filename);
      } else if (options.format === 'pdf') {
        await this.exportToPDF(data, filename);
      }
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      throw error;
    }
  }

  // Formater la taille du fichier
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // Obtenir le nom du type de fichier
  private getFileTypeName(type: string): string {
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
  }

  // Générer un rapport détaillé de la bibliothèque
  async generateLibraryReport(
    documents: Document[],
    libraryStats: DocumentLibrary,
    userId: string,
    filename: string
  ): Promise<void> {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      let y = margin;

      const checkPageBreak = (heightNeeded: number) => {
        if (y + heightNeeded > doc.internal.pageSize.getHeight() - margin) {
          doc.addPage();
          y = margin;
        }
      };

      // En-tête du rapport
      doc.setFontSize(24).setFont('helvetica', 'bold');
      doc.text('Rapport de la Bibliothèque de Documents', pageWidth / 2, y, { align: 'center' });
      y += 15;

      // Informations générales
      doc.setFontSize(12).setFont('helvetica', 'normal');
      doc.text(`Date du rapport: ${new Date().toLocaleDateString('fr-FR')}`, margin, y);
      y += 8;
      doc.text(`Utilisateur: ${userId}`, margin, y);
      y += 15;

      // Statistiques principales
      checkPageBreak(40);
      doc.setFontSize(16).setFont('helvetica', 'bold');
      doc.text('Statistiques Principales', margin, y);
      y += 10;

      doc.setFontSize(10).setFont('helvetica', 'normal');
      doc.text(`Total de documents: ${libraryStats.totalDocuments}`, margin, y);
      y += 6;
      doc.text(`Taille totale: ${this.formatFileSize(libraryStats.totalSize)}`, margin, y);
      y += 6;
      doc.text(`Documents récents: ${libraryStats.recentDocuments.length}`, margin, y);
      y += 6;
      doc.text(`Documents les plus utilisés: ${libraryStats.mostUsedDocuments.length}`, margin, y);
      y += 15;

      // Répartition par type
      checkPageBreak(30);
      doc.setFontSize(16).setFont('helvetica', 'bold');
      doc.text('Répartition par Type', margin, y);
      y += 10;

      Object.entries(libraryStats.documentsByType).forEach(([type, count]) => {
        doc.setFontSize(10).setFont('helvetica', 'normal');
        doc.text(`${this.getFileTypeName(type)}: ${count} document(s)`, margin + 5, y);
        y += 6;
      });
      y += 10;

      // Documents récents
      if (libraryStats.recentDocuments.length > 0) {
        checkPageBreak(30);
        doc.setFontSize(16).setFont('helvetica', 'bold');
        doc.text('Documents Récents', margin, y);
        y += 10;

        libraryStats.recentDocuments.forEach((document, index) => {
          checkPageBreak(25);
          
          doc.setFontSize(10).setFont('helvetica', 'bold');
          doc.text(`${index + 1}. ${document.name}`, margin, y);
          y += 6;
          
          doc.setFontSize(8).setFont('helvetica', 'normal');
          doc.text(`Type: ${this.getFileTypeName(document.type)} • Taille: ${this.formatFileSize(document.size)}`, margin + 5, y);
          y += 4;
          doc.text(`Date: ${new Date(document.uploadedAt).toLocaleDateString('fr-FR')}`, margin + 5, y);
          y += 8;
        });
        y += 10;
      }

      // Documents les plus utilisés
      if (libraryStats.mostUsedDocuments.length > 0) {
        checkPageBreak(30);
        doc.setFontSize(16).setFont('helvetica', 'bold');
        doc.text('Documents les Plus Utilisés', margin, y);
        y += 10;

        libraryStats.mostUsedDocuments.forEach((document, index) => {
          checkPageBreak(25);
          
          doc.setFontSize(10).setFont('helvetica', 'bold');
          doc.text(`${index + 1}. ${document.name}`, margin, y);
          y += 6;
          
          doc.setFontSize(8).setFont('helvetica', 'normal');
          doc.text(`Utilisations: ${document.usageCount} • Type: ${this.getFileTypeName(document.type)}`, margin + 5, y);
          y += 4;
          doc.text(`Dernière utilisation: ${new Date(document.lastUsedAt).toLocaleDateString('fr-FR')}`, margin + 5, y);
          y += 8;
        });
      }

      // Sauvegarder le rapport
      doc.save(`${filename}_rapport.pdf`);
    } catch (error) {
      console.error('Erreur lors de la génération du rapport:', error);
      throw new Error('Erreur lors de la génération du rapport');
    }
  }
}

export default DocumentExportService.getInstance(); 