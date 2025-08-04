import { jsPDF } from 'jspdf';
import type { Session, UserPreferences, Template } from '../types';

export interface ExportOptions {
    format: 'pdf' | 'json';
    includeSessions: boolean;
    includePreferences: boolean;
    includeTemplates: boolean;
    includeProfile: boolean;
    dateRange?: {
        start: Date;
        end: Date;
    };
}

export interface ExportData {
    metadata: {
        exportDate: string;
        userId: string;
        userEmail?: string;
        userFirstName?: string;
        totalSessions: number;
        totalTemplates: number;
    };
    sessions?: Session[];
    preferences?: UserPreferences;
    templates?: Template[];
    profile?: {
        firstName?: string;
        email?: string;
        createdAt: string;
    };
}

export class ExportService {
    private static instance: ExportService;

    private constructor() {}

    public static getInstance(): ExportService {
        if (!ExportService.instance) {
            ExportService.instance = new ExportService();
        }
        return ExportService.instance;
    }

    // Exporter les données en JSON
    async exportToJSON(data: ExportData, filename: string): Promise<void> {
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

    // Exporter les données en PDF
    async exportToPDF(data: ExportData, filename: string): Promise<void> {
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
            doc.text('Export de données Axonium', pageWidth / 2, y, { align: 'center' });
            y += 15;

            // Métadonnées
            doc.setFontSize(12).setFont('helvetica', 'normal');
            doc.text(`Date d'export: ${new Date(data.metadata.exportDate).toLocaleDateString('fr-FR')}`, margin, y);
            y += 8;
            doc.text(`Utilisateur: ${data.metadata.userFirstName || data.metadata.userEmail || 'Anonyme'}`, margin, y);
            y += 8;
            doc.text(`Sessions: ${data.metadata.totalSessions}`, margin, y);
            y += 8;
            doc.text(`Templates: ${data.metadata.totalTemplates}`, margin, y);
            y += 15;

            // Sessions
            if (data.sessions && data.sessions.length > 0) {
                checkPageBreak(30);
                doc.setFontSize(16).setFont('helvetica', 'bold');
                doc.text('Sessions', margin, y);
                y += 10;

                data.sessions.forEach((session, index) => {
                    checkPageBreak(40);
                    
                    doc.setFontSize(12).setFont('helvetica', 'bold');
                    doc.text(`${index + 1}. ${session.title}`, margin, y);
                    y += 6;
                    
                    doc.setFontSize(10).setFont('helvetica', 'normal');
                    doc.text(`Type: ${this.formatGenerationType(session.generationType)}`, margin + 5, y);
                    y += 5;
                    doc.text(`Date: ${new Date(session.createdAt).toLocaleDateString('fr-FR')}`, margin + 5, y);
                    y += 5;
                    
                    if (session.generationType === 'qcm') {
                        const qcmSession = session as any;
                        doc.text(`Score: ${qcmSession.score || 0}`, margin + 5, y);
                        y += 5;
                    }
                    
                    y += 8;
                });
            }

            // Préférences
            if (data.preferences) {
                checkPageBreak(30);
                doc.setFontSize(16).setFont('helvetica', 'bold');
                doc.text('Préférences utilisateur', margin, y);
                y += 10;

                doc.setFontSize(10).setFont('helvetica', 'normal');
                doc.text(`Type de génération par défaut: ${data.preferences.defaultGenerationType}`, margin, y);
                y += 5;
                doc.text(`Nombre de questions par défaut: ${data.preferences.defaultNumQuestions}`, margin, y);
                y += 5;
                doc.text(`Difficulté par défaut: ${data.preferences.defaultDifficulty}`, margin, y);
                y += 5;
                doc.text(`Format d'export: ${data.preferences.exportFormat}`, margin, y);
                y += 5;
                doc.text(`Thème: ${data.preferences.theme}`, margin, y);
                y += 15;
            }

            // Templates
            if (data.templates && data.templates.length > 0) {
                checkPageBreak(30);
                doc.setFontSize(16).setFont('helvetica', 'bold');
                doc.text('Templates personnalisés', margin, y);
                y += 10;

                data.templates.forEach((template, index) => {
                    checkPageBreak(25);
                    
                    doc.setFontSize(12).setFont('helvetica', 'bold');
                    doc.text(`${index + 1}. ${template.name}`, margin, y);
                    y += 6;
                    
                    doc.setFontSize(10).setFont('helvetica', 'normal');
                    doc.text(`Catégorie: ${template.category}`, margin + 5, y);
                    y += 5;
                    doc.text(`Description: ${template.description}`, margin + 5, y);
                    y += 8;
                });
            }

            // Sauvegarder le PDF
            doc.save(`${filename}.pdf`);
        } catch (error) {
            console.error('Erreur lors de l\'export PDF:', error);
            throw new Error('Erreur lors de l\'export PDF');
        }
    }

    // Formater le type de génération pour l'affichage
    private formatGenerationType(type: string): string {
        const typeMap: { [key: string]: string } = {
            'qcm': 'QCM',
            'summary': 'Résumé',
            'chat': 'Chat',
            'revision_sheet': 'Fiche de révision',
            'mind_map': 'Carte mentale',
            'guided_study': 'Étude guidée'
        };
        return typeMap[type] || type;
    }

    // Préparer les données d'export
    prepareExportData(
        sessions: Session[],
        preferences: UserPreferences,
        templates: Template[],
        profile: { firstName?: string; email?: string; createdAt?: string },
        userId: string
    ): ExportData {
        return {
            metadata: {
                exportDate: new Date().toISOString(),
                userId,
                userEmail: profile.email,
                userFirstName: profile.firstName,
                totalSessions: sessions.length,
                totalTemplates: templates.length
            },
            sessions,
            preferences,
            templates,
            profile: {
                firstName: profile.firstName,
                email: profile.email,
                createdAt: profile.createdAt || new Date().toISOString()
            }
        };
    }

    // Exporter selon les options
    async exportData(data: ExportData, options: ExportOptions, filename: string): Promise<void> {
        try {
            if (options.format === 'json') {
                await this.exportToJSON(data, filename);
            } else if (options.format === 'pdf') {
                await this.exportToPDF(data, filename);
            }
        } catch (error) {
            console.error('Erreur lors de l\'export:', error);
            throw error;
        }
    }
}

export default ExportService.getInstance(); 