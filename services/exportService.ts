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

export interface DashboardExportData extends ExportData {
    dashboardStats: {
        totalSessions: number;
        recentSessions: number;
        monthlySessions: number;
        typeStats: Record<string, number>;
        incompleteSessions: number;
        topScoringSessions: number;
        mostUsedType: string;
        averageScore?: number;
        productivityScore?: number;
    };
    activitySummary: {
        lastActivity: string;
        mostActiveDay: string;
        streakDays: number;
        totalStudyTime?: number; // en minutes
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
            doc.text(`Créations: ${data.metadata.totalSessions}`, margin, y);
            y += 8;
            doc.text(`Templates: ${data.metadata.totalTemplates}`, margin, y);
            y += 15;

            // Créations
            if (data.sessions && data.sessions.length > 0) {
                checkPageBreak(30);
                doc.setFontSize(16).setFont('helvetica', 'bold');
                doc.text('Créations', margin, y);
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

    // Exporter les données du tableau de bord
    async exportDashboardData(
        sessions: Session[],
        preferences: UserPreferences,
        templates: Template[],
        profile: { firstName?: string; email?: string; createdAt?: string },
        userId: string,
        dashboardStats: any,
        filename: string
    ): Promise<void> {
        try {
            const now = new Date();
            const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            
            // Calculer les statistiques d'activité
            const recentSessions = sessions.filter(s => new Date(s.createdAt) >= lastWeek);
            const activityByDay = recentSessions.reduce((acc, session) => {
                const day = new Date(session.createdAt).toLocaleDateString('fr-FR');
                acc[day] = (acc[day] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);
            
            const mostActiveDay = Object.entries(activityByDay)
                .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Aucune activité';
            
            // Calculer le score de productivité
            const qcmSessions = sessions.filter(s => s.generationType === 'qcm') as QcmSession[];
            const averageScore = qcmSessions.length > 0 
                ? qcmSessions.reduce((sum, s) => sum + (s.score / s.quizData.questions.length), 0) / qcmSessions.length
                : 0;
            
            const productivityScore = Math.round(
                (recentSessions.length * 0.3) + 
                (averageScore * 0.4) + 
                (sessions.length * 0.3)
            );
            
            const dashboardExportData: DashboardExportData = {
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
                },
                dashboardStats: {
                    totalSessions: dashboardStats.totalSessions,
                    recentSessions: dashboardStats.recentSessions,
                    monthlySessions: dashboardStats.monthlySessions,
                    typeStats: dashboardStats.typeStats,
                    incompleteSessions: dashboardStats.incompleteSessions.length,
                    topScoringSessions: dashboardStats.topScoringSessions.length,
                    mostUsedType: dashboardStats.mostUsedType,
                    averageScore: Math.round(averageScore * 100),
                    productivityScore: Math.min(productivityScore, 100)
                },
                activitySummary: {
                    lastActivity: sessions.length > 0 
                        ? new Date(sessions[0].createdAt).toLocaleDateString('fr-FR')
                        : 'Aucune activité',
                    mostActiveDay,
                    streakDays: this.calculateStreakDays(sessions),
                    totalStudyTime: this.estimateStudyTime(sessions)
                }
            };
            
            // Exporter en PDF avec un format spécial pour le tableau de bord
            await this.exportDashboardToPDF(dashboardExportData, filename);
            
        } catch (error) {
            console.error('Erreur lors de l\'export du tableau de bord:', error);
            throw new Error('Erreur lors de l\'export du tableau de bord');
        }
    }
    
    // Calculer les jours de suite d'activité
    private calculateStreakDays(sessions: Session[]): number {
        if (sessions.length === 0) return 0;
        
        const sortedSessions = sessions
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        let streak = 0;
        let currentDate = new Date();
        const today = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
        
        for (let i = 0; i < 30; i++) { // Vérifier sur 30 jours
            const checkDate = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
            const hasActivity = sortedSessions.some(session => {
                const sessionDate = new Date(session.createdAt);
                return sessionDate.getFullYear() === checkDate.getFullYear() &&
                       sessionDate.getMonth() === checkDate.getMonth() &&
                       sessionDate.getDate() === checkDate.getDate();
            });
            
            if (hasActivity) {
                streak++;
            } else {
                break;
            }
        }
        
        return streak;
    }
    
    // Estimer le temps d'étude total
    private estimateStudyTime(sessions: Session[]): number {
        let totalMinutes = 0;
        
        sessions.forEach(session => {
            switch (session.generationType) {
                case 'qcm':
                    totalMinutes += 15; // 15 min pour un QCM
                    break;
                case 'summary':
                    totalMinutes += 10; // 10 min pour un résumé
                    break;
                case 'revision_sheet':
                    totalMinutes += 20; // 20 min pour une fiche
                    break;
                case 'mind_map':
                    totalMinutes += 25; // 25 min pour une carte mentale
                    break;
                case 'chat':
                    totalMinutes += session.messages.length * 2; // 2 min par message
                    break;
                case 'guided_study':
                    totalMinutes += 45; // 45 min pour une étude guidée
                    break;
            }
        });
        
        return totalMinutes;
    }
    
    // Exporter le tableau de bord en PDF
    private async exportDashboardToPDF(data: DashboardExportData, filename: string): Promise<void> {
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

            // En-tête spécial tableau de bord
            doc.setFontSize(24).setFont('helvetica', 'bold');
            doc.text('Tableau de Bord Axonium', pageWidth / 2, y, { align: 'center' });
            y += 15;

            // Informations utilisateur
            doc.setFontSize(12).setFont('helvetica', 'normal');
            doc.text(`Utilisateur: ${data.metadata.userFirstName || data.metadata.userEmail || 'Anonyme'}`, margin, y);
            y += 8;
            doc.text(`Date d'export: ${new Date(data.metadata.exportDate).toLocaleDateString('fr-FR')}`, margin, y);
            y += 15;

            // Statistiques principales
            checkPageBreak(40);
            doc.setFontSize(16).setFont('helvetica', 'bold');
            doc.text('Statistiques Principales', margin, y);
            y += 10;

            doc.setFontSize(10).setFont('helvetica', 'normal');
            doc.text(`Créations totales: ${data.dashboardStats.totalSessions}`, margin, y);
            y += 6;
            doc.text(`Créations cette semaine: ${data.dashboardStats.recentSessions}`, margin, y);
            y += 6;
            doc.text(`Créations ce mois: ${data.dashboardStats.monthlySessions}`, margin, y);
            y += 6;
            doc.text(`Score de productivité: ${data.dashboardStats.productivityScore}/100`, margin, y);
            y += 6;
            doc.text(`Score moyen QCM: ${data.dashboardStats.averageScore}%`, margin, y);
            y += 15;

            // Types de contenu utilisés
            checkPageBreak(30);
            doc.setFontSize(16).setFont('helvetica', 'bold');
            doc.text('Types de Contenu Utilisés', margin, y);
            y += 10;

            Object.entries(data.dashboardStats.typeStats)
                .sort(([,a], [,b]) => b - a)
                .forEach(([type, count]) => {
                    doc.setFontSize(10).setFont('helvetica', 'normal');
                    doc.text(`${this.formatGenerationType(type)}: ${count}`, margin + 5, y);
                    y += 6;
                });
            y += 10;

            // Résumé d'activité
            checkPageBreak(30);
            doc.setFontSize(16).setFont('helvetica', 'bold');
            doc.text('Résumé d\'Activité', margin, y);
            y += 10;

            doc.setFontSize(10).setFont('helvetica', 'normal');
            doc.text(`Dernière activité: ${data.activitySummary.lastActivity}`, margin, y);
            y += 6;
            doc.text(`Jour le plus actif: ${data.activitySummary.mostActiveDay}`, margin, y);
            y += 6;
            doc.text(`Série d'activité: ${data.activitySummary.streakDays} jours`, margin, y);
            y += 6;
            doc.text(`Temps d'étude estimé: ${Math.round(data.activitySummary.totalStudyTime || 0)} minutes`, margin, y);
            y += 15;

            // Créations récentes
            if (data.sessions && data.sessions.length > 0) {
                checkPageBreak(30);
                doc.setFontSize(16).setFont('helvetica', 'bold');
                doc.text('Créations Récentes', margin, y);
                y += 10;

                data.sessions.slice(0, 10).forEach((session, index) => {
                    checkPageBreak(25);
                    
                    doc.setFontSize(10).setFont('helvetica', 'bold');
                    doc.text(`${index + 1}. ${session.title}`, margin, y);
                    y += 6;
                    
                    doc.setFontSize(8).setFont('helvetica', 'normal');
                    doc.text(`Type: ${this.formatGenerationType(session.generationType)}`, margin + 5, y);
                    y += 4;
                    doc.text(`Date: ${new Date(session.createdAt).toLocaleDateString('fr-FR')}`, margin + 5, y);
                    y += 8;
                });
            }

            // Sauvegarder le PDF
            doc.save(`${filename}_dashboard.pdf`);
        } catch (error) {
            console.error('Erreur lors de l\'export PDF du tableau de bord:', error);
            throw new Error('Erreur lors de l\'export PDF du tableau de bord');
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