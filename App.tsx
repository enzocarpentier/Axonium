import React, { useState, useCallback, useMemo, useRef, useEffect, useLayoutEffect } from 'react';


import type { QuizData, QuizQuestion, UserAnswers, Session, QcmSession, SummarySession, ChatSession, Message, RevisionSheetData, RevisionSheetSession, GroundingSource, MindMapData, MindMapNode, MindMapSession, GuidedStudySession, Template, GenerationParameters, UserPreferences, SessionWithSharing, Document } from './types.ts';
import { generateQuizFromText, generateSummaryFromText, startChatSession, generateRevisionSheetFromText, extractTextFromImage, getChatSystemInstruction, generateMindMapFromText, continueChat } from './services/geminiService.ts';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import Loader from './components/Loader.tsx';
import TemplateSelector from './components/TemplateSelector.tsx';
import CustomTemplateCreator from './components/CustomTemplateCreator.tsx';
import UserSettings from './components/UserSettings.tsx';
import SignupModal from './components/SignupModal.tsx';
import userPreferencesService from './services/userPreferencesService';
import DataExportModal from './components/DataExportModal.tsx';
import exportService, { type ExportOptions } from './services/exportService';
import ShareModal from './components/ShareModal.tsx';
import shareService from './services/shareService';
import apiKeyService from './services/apiKeyService.ts';
import { DocumentSelector } from './components/DocumentSelector.tsx';
import { DocumentLibrary } from './components/DocumentLibrary.tsx';
import documentService from './services/documentService';

import PageTransition from './components/PageTransition.tsx';
import AnimatedList from './components/AnimatedList.tsx';
import AnimatedNavigation from './components/AnimatedNavigation.tsx';
import ElegantSpinner from './components/spinners/ElegantSpinner.tsx';
import ProgressSpinner from './components/ProgressSpinner.tsx';

import { useAnimations, usePageTransition } from './hooks/useAnimations.ts';
import { BrainCircuitIcon, FileTextIcon, CheckCircleIcon, XCircleIcon, SparklesIcon, UploadCloudIcon, BookOpenIcon, ClipboardListIcon, RotateCwIcon, DownloadIcon, LayersIcon, MessageSquareIcon, UserIcon, SendIcon, HistoryIcon, Trash2Icon, NotebookTextIcon, SearchIcon, ImageIcon, GlobeIcon, MindMapIcon, GraduationCapIcon, LogOutIcon, MailIcon, KeyRoundIcon, ChevronDownIcon, SettingsIcon, ArrowLeftIcon, HomeIcon, BellIcon, AlertTriangleIcon, InfoIcon, XIcon, SunIcon, MoonIcon, HelpCircleIcon, MenuIcon, Share2Icon, UsersIcon, PenIcon, PlusIcon } from './components/icons.tsx';
import * as pdfjsLib from 'pdfjs-dist';

// Firebase imports
import { auth, db, firebaseError } from './firebase.ts';
import { User, onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { collection, addDoc, getDocs, getDoc, setDoc, query, where, orderBy, doc, deleteDoc, updateDoc, Timestamp } from 'firebase/firestore';


pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs`;

// Interface pour les brouillons Firebase
interface Draft {
    id?: string;
    userId: string;
    documentText: string;
    generationType: GenerationInputType;
    numQuestions: number;
    difficulty: Difficulty;
    lastUpdated: string;
    isActive: boolean;
}

type GenerationInputType = 'qcm' | 'summary' | 'chat' | 'revision_sheet' | 'mind_map' | 'guided_study';
type AppState = 'auth' | 'main' | 'history' | 'input' | 'loading' | 'title_input' | 'summary_display' | 'quiz' | 'results' | 'flashcards' | 'chat' | 'revision_sheet_display' | 'mind_map_display' | 'guided_study';
type Difficulty = 'Facile' | 'Moyen' | 'Difficile';

// Types pour le système de notifications
interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    timestamp: Date;
    read: boolean;
    action?: {
        label: string;
        onClick: () => void;
    };
}

const App: React.FC = () => {
    // Gérer l'erreur d'initialisation de Firebase
    if (firebaseError || !auth || !db) {
        return (
            <div className="p-8 m-4 rounded-xl bg-red-50 border border-red-200">
                <div className="flex flex-col items-center text-center text-red-800">
                     <XCircleIcon className="h-12 w-12 text-red-500 mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Erreur de Configuration Firebase</h2>
                    <p className="max-w-xl text-slate-700">{firebaseError || "Impossible d'initialiser les services Firebase."}</p>
                    <p className="mt-4 text-sm text-slate-500">
                        Cette application nécessite une configuration Firebase pour fonctionner. Veuillez vous assurer que la variable d'environnement `FIREBASE_CONFIG` est correctement définie et contient une configuration Firebase JSON valide.
                    </p>
                </div>
            </div>
        );
    }

    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [appState, setAppState] = useState<AppState>('loading');
    const [generationType, setGenerationType] = useState<GenerationInputType>('qcm');
    const [flashcardSource, setFlashcardSource] = useState<'input' | 'results'>('input');
    
    const [sessions, setSessions] = useState<(Session | SessionWithSharing)[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [customSessionTitle, setCustomSessionTitle] = useState<string>('');
    const [showTitleInput, setShowTitleInput] = useState<boolean>(false);
    const [pendingSessionData, setPendingSessionData] = useState<Omit<Session, 'id'> | null>(null);
    
    // États pour la bibliothèque de documents
    const [showDocumentSelector, setShowDocumentSelector] = useState<boolean>(false);
    const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
    const [showDocumentLibrary, setShowDocumentLibrary] = useState<boolean>(false);
    const [showDocumentUploader, setShowDocumentUploader] = useState<boolean>(false);

    // États pour les brouillons Firebase
    const [documentText, setDocumentText] = useState<string>('');
    const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
    const [quizData, setQuizData] = useState<QuizData | null>(null);
    const [activeQuiz, setActiveQuiz] = useState<QuizData | null>(null);
    const [summary, setSummary] = useState<string | null>(null);
    const [revisionSheetData, setRevisionSheetData] = useState<RevisionSheetData | null>(null);
    const [mindMapData, setMindMapData] = useState<MindMapData | null>(null);
    const [chatMessages, setChatMessages] = useState<Message[]>([]);
    const [userAnswers, setUserAnswers] = useState<UserAnswers>({});
    const [error, setError] = useState<string | null>(null);
    const [isProcessingFile, setIsProcessingFile] = useState<boolean>(false);
    const [processingMessage, setProcessingMessage] = useState<string>('');
    
    const [numQuestions, setNumQuestions] = useState<number>(5);
    const [difficulty, setDifficulty] = useState<Difficulty>('Moyen');
    
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [isAnswerChecked, setIsAnswerChecked] = useState<boolean>(false);
    const [score, setScore] = useState<number>(0);
    
    const [historySearchTerm, setHistorySearchTerm] = useState('');

    // États pour les templates
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [showTemplateSelector, setShowTemplateSelector] = useState(false);
    const [showCustomTemplateCreator, setShowCustomTemplateCreator] = useState(false);
    const [userTemplates, setUserTemplates] = useState<Template[]>([]);
    const [communityTemplates, setCommunityTemplates] = useState<Template[]>([]);
    const [favoriteTemplates, setFavoriteTemplates] = useState<string[]>([]);

    // États pour le profil utilisateur
    const [userProfile, setUserProfile] = useState<{firstName?: string, email?: string, hasSeenWelcomeNotification?: boolean} | null>(null);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [showProfileEditor, setShowProfileEditor] = useState(false);
    
    // États pour les paramètres utilisateur
    const [userPreferences, setUserPreferences] = useState<UserPreferences>({
        defaultGenerationType: 'qcm',
        defaultNumQuestions: 5,
        defaultDifficulty: 'Moyen',
        defaultLanguage: 'fr',
        theme: 'auto',
        fontSize: 'medium',
        compactMode: false,
        emailNotifications: true,
        pushNotifications: true,
        notificationSound: true,
        autoSave: true,
        autoSaveInterval: 1,
        exportFormat: 'pdf',
        aiModel: 'gemini',
        maxTokens: 2000,
        temperature: 0.7
    });
    const [showUserSettings, setShowUserSettings] = useState(false);
    
    // États pour le système de notifications
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);
    
    // États pour l'export de données
    const [showDataExportModal, setShowDataExportModal] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [selectedSessionForSharing, setSelectedSessionForSharing] = useState<Session | null>(null);
    
    // États pour le système de demandes d'inscription


    
    // Hooks d'animation
    const { prefersReducedMotion } = useAnimations();
    const { shouldRender: shouldRenderMain, transitionClass: mainTransitionClass } = usePageTransition(appState === 'main', 'up');
    const { shouldRender: shouldRenderHistory, transitionClass: historyTransitionClass } = usePageTransition(appState === 'history', 'left');
    const { shouldRender: shouldRenderInput, transitionClass: inputTransitionClass } = usePageTransition(appState === 'input', 'up');

    // État pour le thème sombre/clair
    const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
        // Vérifier si le thème est sauvegardé dans localStorage
        const savedTheme = localStorage.getItem('axonium-theme');
        if (savedTheme) {
            return savedTheme === 'dark';
        }
        // Vérifier la préférence système
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

    // Fonctions pour gérer les notifications
    const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
        const newNotification: Notification = {
            ...notification,
            id: Date.now().toString(),
            timestamp: new Date(),
            read: false
        };
        setNotifications(prev => [newNotification, ...prev]);
    };

    const markNotificationAsRead = (id: string) => {
        setNotifications(prev => 
            prev.map(notif => 
                notif.id === id ? { ...notif, read: true } : notif
            )
        );
    };

    const removeNotification = (id: string) => {
        setNotifications(prev => prev.filter(notif => notif.id !== id));
    };

    const clearAllNotifications = () => {
        setNotifications([]);
    };

    // Fonction helper pour ajouter facilement des notifications
    const showNotification = (title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', action?: { label: string; onClick: () => void }) => {
        addNotification({
            title,
            message,
            type,
            action
        });
    };

    // Fonctions pour gérer le thème
    const toggleTheme = () => {
        const newTheme = !isDarkMode;
        setIsDarkMode(newTheme);
        localStorage.setItem('axonium-theme', newTheme ? 'dark' : 'light');
    };

    // Appliquer le thème au document
    useEffect(() => {
        const root = document.documentElement;
        if (isDarkMode) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }, [isDarkMode]);

    // Appliquer les préférences utilisateur par défaut
    useEffect(() => {
        if (userPreferences) {
            // Appliquer les paramètres de génération par défaut
            if (generationType !== userPreferences.defaultGenerationType) {
                setGenerationType(userPreferences.defaultGenerationType);
            }
            if (numQuestions !== userPreferences.defaultNumQuestions) {
                setNumQuestions(userPreferences.defaultNumQuestions);
            }
            if (difficulty !== userPreferences.defaultDifficulty) {
                setDifficulty(userPreferences.defaultDifficulty);
            }
        }
    }, [userPreferences]);

    // Fermer le menu profil quand on clique ailleurs
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Element;
            if (!target.closest('.profile-menu')) {
                setShowProfileMenu(false);
            }
        };

        if (showProfileMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showProfileMenu]);

    // Fonctions pour gérer les brouillons Firebase
    const saveDraft = async (draftData: Partial<Draft>) => {
        if (!currentUser) {
            console.log('Pas d\'utilisateur connecté, impossible de sauvegarder');
            return;
        }
        
        try {
            const draft: Draft = {
                userId: currentUser.uid,
                documentText: draftData.documentText || documentText,
                generationType: draftData.generationType || generationType,
                numQuestions: draftData.numQuestions || numQuestions,
                difficulty: draftData.difficulty || difficulty,
                lastUpdated: new Date().toISOString(),
                isActive: true
            };

            console.log('Sauvegarde du brouillon:', {
                currentDraftId,
                documentText: draft.documentText.substring(0, 50) + '...',
                generationType: draft.generationType,
                numQuestions: draft.numQuestions,
                difficulty: draft.difficulty
            });

            if (currentDraftId) {
                // Mettre à jour le brouillon existant
                await updateDoc(doc(db, "drafts", currentDraftId), draft as any);
                console.log('Brouillon mis à jour avec succès');
            } else {
                // Créer un nouveau brouillon
                const docRef = await addDoc(collection(db, "drafts"), draft as any);
                setCurrentDraftId(docRef.id);
                console.log('Nouveau brouillon créé avec ID:', docRef.id);
            }
        } catch (error) {
            console.error("Erreur lors de la sauvegarde du brouillon:", error);
        }
    };

    const loadDraft = async () => {
        if (!currentUser) {
            console.log('Pas d\'utilisateur connecté, impossible de charger le brouillon');
            return;
        }
        
        try {
            console.log('Chargement du brouillon pour l\'utilisateur:', currentUser.uid);
            const draftsCol = collection(db, "drafts");
            const q = query(
                draftsCol, 
                where("userId", "==", currentUser.uid),
                where("isActive", "==", true)
            );
            const querySnapshot = await getDocs(q);
            
            console.log('Nombre de brouillons trouvés:', querySnapshot.size);
            
            if (!querySnapshot.empty) {
                // Trouver le brouillon le plus récent manuellement
                const drafts = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Draft & { id: string }));
                
                const latestDraft = drafts.sort((a, b) => 
                    new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
                )[0];
                
                console.log('Brouillon trouvé:', {
                    id: latestDraft.id,
                    documentText: latestDraft.documentText.substring(0, 50) + '...',
                    generationType: latestDraft.generationType,
                    numQuestions: latestDraft.numQuestions,
                    difficulty: latestDraft.difficulty
                });
                
                setDocumentText(latestDraft.documentText);
                setGenerationType(latestDraft.generationType);
                setNumQuestions(latestDraft.numQuestions);
                setDifficulty(latestDraft.difficulty);
                setCurrentDraftId(latestDraft.id);
                console.log('Brouillon chargé avec succès');
            } else {
                console.log('Aucun brouillon trouvé');
            }
        } catch (error) {
            console.error("Erreur lors du chargement du brouillon:", error);
        }
    };

    const clearDraft = async () => {
        if (!currentUser || !currentDraftId) return;
        
        try {
            await updateDoc(doc(db, "drafts", currentDraftId), { isActive: false });
            setCurrentDraftId(null);
            setDocumentText('');
            setGenerationType('qcm');
            setNumQuestions(5);
            setDifficulty('Moyen');
        } catch (error) {
            console.error("Erreur lors de la suppression du brouillon:", error);
        }
    };

    // Fonctions pour gérer les templates
    const handleTemplateSelect = (template: Template) => {
        setSelectedTemplate(template);
        setGenerationType(template.parameters.generationType);
        if (template.parameters.numQuestions) {
            setNumQuestions(template.parameters.numQuestions);
        }
        if (template.parameters.difficulty) {
            setDifficulty(template.parameters.difficulty);
        }
        setShowTemplateSelector(false);
    };

    const generateSystemPrompt = (parameters: GenerationParameters): string => {
        const { generationType, numQuestions, difficulty, customInstructions, targetAudience, focus } = parameters;
        
        let basePrompt = '';
        
        // Base selon le type de génération
        switch (generationType) {
            case 'qcm':
                basePrompt = `Tu es un expert en création de QCM pour l'évaluation de la compréhension. Analyse le document fourni et crée un QCM de ${numQuestions || 10} questions avec un niveau de difficulté '${difficulty || 'Moyen'}'.`;
                break;
            case 'summary':
                basePrompt = `Tu es un expert en synthèse de documents. Analyse le document fourni et crée un résumé structuré et clair.`;
                break;
            case 'revision_sheet':
                basePrompt = `Tu es un assistant pédagogique expert. Analyse le document fourni et crée une fiche de révision complète et structurée.`;
                break;
            case 'mind_map':
                basePrompt = `Tu es un expert en organisation visuelle de l'information. Analyse le document fourni et crée une carte mentale structurée.`;
                break;
            case 'chat':
                basePrompt = `Tu es un assistant conversationnel expert. Analyse le document fourni et aide l'utilisateur à comprendre et explorer le contenu.`;
                break;
            case 'guided_study':
                basePrompt = `Tu es un coach d'étude expert. Analyse le document fourni et crée un parcours d'apprentissage guidé.`;
                break;
            default:
                basePrompt = `Tu es un assistant expert. Analyse le document fourni et génère du contenu adapté.`;
        }
        
        // Ajouter les instructions personnalisées
        if (customInstructions) {
            basePrompt += `\n\nInstructions spécifiques : ${customInstructions}`;
        }
        
        // Ajouter le public cible
        if (targetAudience) {
            basePrompt += `\n\nPublic cible : ${targetAudience}`;
        }
        

        
        // Ajouter le focus
        if (focus) {
            basePrompt += `\n\nFocus principal : ${focus}`;
        }
        
        // Instructions finales
        basePrompt += `\n\nBase-toi uniquement sur le contenu du document fourni pour créer du contenu personnalisé et pertinent.`;
        
        return basePrompt;
    };

    const handleCustomTemplateCreate = () => {
        setShowCustomTemplateCreator(true);
    };

    // Gérer la sélection de document depuis la bibliothèque
    const handleDocumentSelect = (document: Document, processedText: string) => {
        setSelectedDocument(document);
        setDocumentText(processedText);
        setShowDocumentSelector(false);
        showNotification(
            'Document sélectionné',
            `${document.name} a été chargé avec succès`,
            'success'
        );
    };

    // Ouvrir le sélecteur de documents
    const handleOpenDocumentSelector = () => {
        setShowDocumentSelector(true);
    };

    // Supprimer le document sélectionné
    const handleClearSelectedDocument = () => {
        setSelectedDocument(null);
        setDocumentText('');
    };

    const handleSaveCustomTemplate = async (template: Template) => {
        if (!currentUser) {
            console.error('Utilisateur non connecté');
            setError('Vous devez être connecté pour créer un template');
            return;
        }

        try {
            console.log('Tentative de sauvegarde du template:', template);
            
            // Créer un objet template sans l'ID pour Firebase
            const templateToSave = { ...template };
            delete templateToSave.id; // Supprimer l'ID vide
            
            // Sauvegarder le template dans Firebase
            const docRef = await addDoc(collection(db, "templates"), templateToSave);
            const savedTemplate = { ...template, id: docRef.id };
            
            // Ajouter aux templates utilisateur avec l'ID correct
            setUserTemplates(prev => [...prev, savedTemplate]);
            
            // Si le template est public, recharger les templates communautaires
            if (template.isPublic) {
                await loadCommunityTemplates();
            }
            
            // Fermer le créateur
            setShowCustomTemplateCreator(false);
            
            console.log('Template personnalisé créé avec succès:', savedTemplate);
            
            // Afficher un message de succès
            const message = template.isPublic 
                ? 'Template créé et partagé avec la communauté !' 
                : 'Template créé avec succès !';
            alert(message);
            
        } catch (error) {
            console.error('Erreur lors de la création du template:', error);
            setError('Erreur lors de la création du template personnalisé');
            alert('Erreur lors de la création du template: ' + error);
        }
    };

    const handleDeleteTemplate = async (templateId: string) => {
        if (!currentUser) {
            console.error('Utilisateur non connecté');
            setError('Vous devez être connecté pour supprimer un template');
            return;
        }

        // Vérifier que l'ID du template est valide
        if (!templateId || templateId.trim() === '') {
            console.error('ID de template invalide:', templateId);
            alert('ID de template invalide');
            return;
        }

        try {
            console.log('Tentative de suppression du template:', templateId);
            console.log('Utilisateur actuel:', currentUser.uid);
            
            // Vérifier que le template existe avant de le supprimer
            const templateRef = doc(db, "templates", templateId);
            const templateDoc = await getDoc(templateRef);
            
            if (!templateDoc.exists()) {
                console.error('Template non trouvé dans Firebase:', templateId);
                alert('Template non trouvé dans Firebase');
                return;
            }
            
            console.log('Template trouvé dans Firebase, suppression...');
            
            // Supprimer le template de Firebase
            await deleteDoc(templateRef);
            console.log('Template supprimé de Firebase avec succès');
            
            // Retirer des templates utilisateur
            setUserTemplates(prev => {
                const filtered = prev.filter(template => template.id !== templateId);
                console.log('Templates utilisateur mis à jour:', filtered.length);
                return filtered;
            });
            
            // Retirer des favoris si présent
            if (favoriteTemplates.includes(templateId)) {
                const newFavorites = favoriteTemplates.filter(id => id !== templateId);
                setFavoriteTemplates(newFavorites);
                await updateDoc(doc(db, "users", currentUser.uid), {
                    favoriteTemplates: newFavorites
                });
                console.log('Template retiré des favoris');
            }
            
            // Recharger les templates communautaires pour refléter la suppression
            await loadCommunityTemplates();
            
            console.log('Template supprimé avec succès de tous les endroits');
            alert('Template supprimé avec succès !');
            
        } catch (error) {
            console.error('Erreur lors de la suppression du template:', error);
            console.error('Détails de l\'erreur:', {
                templateId,
                userId: currentUser.uid,
                error: error.message
            });
            setError('Erreur lors de la suppression du template');
            alert('Erreur lors de la suppression du template: ' + error.message);
        }
    };

    const applyTemplateParameters = (template: Template) => {
        const params = template.parameters;
        setGenerationType(params.generationType);
        if (params.numQuestions) setNumQuestions(params.numQuestions);
        if (params.difficulty) setDifficulty(params.difficulty);
        
        // Générer automatiquement le prompt si pas déjà défini
        if (!params.systemPrompt) {
            const generatedPrompt = generateSystemPrompt(params);
            // Mettre à jour le template avec le prompt généré
            template.parameters.systemPrompt = generatedPrompt;
        }
    };

    const handleToggleFavorite = async (templateId: string) => {
        if (!currentUser) return;
        
        try {
            const newFavorites = favoriteTemplates.includes(templateId)
                ? favoriteTemplates.filter(id => id !== templateId)
                : [...favoriteTemplates, templateId];
            
            setFavoriteTemplates(newFavorites);
            
            // Sauvegarder dans Firebase
            await updateDoc(doc(db, "users", currentUser.uid), {
                favoriteTemplates: newFavorites
            });
        } catch (error) {
            console.error("Erreur lors de la sauvegarde des favoris:", error);
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            console.log('🔄 État d\'authentification changé:', user ? 'Utilisateur connecté' : 'Utilisateur déconnecté');
            setCurrentUser(user);
            setAuthLoading(false);
            
            if (user) {
                console.log('✅ Utilisateur authentifié, chargement des données...');
                setAppState('loading');
                
                // Attendre un peu avant de charger les données pour éviter les conflits
                setTimeout(async () => {
                    try {
                        const userSessions = await fetchSessions(user.uid);
                        console.log('✅ Sessions chargées:', userSessions.length);
                        setSessions(userSessions);
                        setAppState('main');
                    } catch (error) {
                        console.error("❌ Erreur lors du chargement des sessions:", error);
                        setAppState('main'); // Afficher quand même le menu principal
                    }
                }, 500);
                
                // Vérifier les sessions partagées après que l'utilisateur soit complètement initialisé
                setTimeout(async () => {
                    await checkSharedSessionFromURL();
                }, 2000);
            } else {
                console.log('👤 Utilisateur non connecté, affichage de la page d\'authentification');
                setSessions([]);
                setAppState('auth');
                
                // Vérifier les sessions partagées même si pas connecté (pour afficher le message)
                await checkSharedSessionFromURL();
            }
        });
        return () => unsubscribe();
    }, []);

    // Charger le brouillon après que l'utilisateur soit complètement initialisé
            useEffect(() => {
            if (currentUser && !authLoading && appState === 'main') {
                console.log('Utilisateur connecté, chargement du brouillon...');
                loadDraft();
                loadUserProfile(); // Charge le profil et les favoris
                loadUserPreferences(); // Charge les préférences utilisateur
                loadUserTemplates();
                loadCommunityTemplates();
                
                // Recharger les sessions pour s'assurer que les sessions partagées sont à jour
                const reloadSessions = async () => {
                    try {
                        const userSessions = await fetchSessions(currentUser.uid);
                        console.log('Sessions rechargées:', userSessions.length);
                        
                        // Combiner toutes les sessions
                        const allSessions = [...userSessions];
                        const uniqueSessions = allSessions.filter((session, index, self) => 
                            index === self.findIndex(s => (s as any).id === (session as any).id)
                        );
                        
                        console.log('Total des sessions après rechargement:', uniqueSessions.length);
                        setSessions(uniqueSessions);
                    } catch (error) {
                        console.error("Erreur lors du rechargement des sessions:", error);
                    }
                };
                
                // Recharger les sessions après un délai pour s'assurer que tout est initialisé
                setTimeout(reloadSessions, 1000);
            }
        }, [currentUser, authLoading, appState]);

        const loadUserProfile = async () => {
            if (!currentUser) return;
            
            try {
                console.log('🔍 Chargement du profil utilisateur pour:', currentUser.uid);
                const userDoc = await getDoc(doc(db, "users", currentUser.uid));
                
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    console.log('✅ Données utilisateur trouvées:', userData);
                    
                    const hasSeenWelcome = userData.hasSeenWelcomeNotification || false;
                    const firstName = userData.firstName || userData.displayName?.split(' ')[0] || null;
                    
                    setUserProfile({
                        firstName: firstName,
                        email: userData.email || currentUser.email,
                        hasSeenWelcomeNotification: hasSeenWelcome
                    });
                    
                    console.log('✅ Profil utilisateur chargé:', { firstName, email: userData.email });
                    
                    if (userData.favoriteTemplates) {
                        setFavoriteTemplates(userData.favoriteTemplates);
                    }
                    
                    // Notification de bienvenue pour les utilisateurs existants qui ne l'ont pas encore vue
                    if (!hasSeenWelcome) {
                        setTimeout(() => {
                            showNotification(
                                'Bienvenue dans Axonium v1.0 ! 🎉',
                                'Découvrez la première version de votre assistant d\'étude intelligent. Créez des QCM, résumés, cartes mentales et plus encore !',
                                'success',
                                {
                                    label: 'Commencer',
                                    onClick: () => setAppState('input')
                                }
                            );
                            
                            // Marquer que la notification a été vue
                            updateDoc(doc(db, "users", currentUser.uid), {
                                hasSeenWelcomeNotification: true
                            });
                        }, 1000);
                    }
                } else {
                    console.log('⚠️ Aucun profil utilisateur trouvé, création d\'un nouveau profil');
                    // Créer un profil pour les nouveaux utilisateurs
                    await setDoc(doc(db, "users", currentUser.uid), {
                        email: currentUser.email,
                        createdAt: new Date().toISOString(),
                        favoriteTemplates: [],
                        hasSeenWelcomeNotification: false
                    });
                    setUserProfile({
                        email: currentUser.email,
                        hasSeenWelcomeNotification: false
                    });
                    
                    // Notification de bienvenue pour les nouveaux utilisateurs
                    setTimeout(() => {
                        showNotification(
                            'Bienvenue dans Axonium v1.0 ! 🎉',
                            'Découvrez la première version de votre assistant d\'étude intelligent. Créez des QCM, résumés, cartes mentales et plus encore !',
                            'success',
                            {
                                label: 'Commencer',
                                onClick: () => setAppState('input')
                            }
                        );
                        
                        // Marquer que la notification a été vue
                        updateDoc(doc(db, "users", currentUser.uid), {
                            hasSeenWelcomeNotification: true
                        });
                    }, 1000);
                }
            } catch (error) {
                console.error("❌ Erreur lors du chargement du profil:", error);
            }
        };

        const loadUserPreferences = async () => {
            if (!currentUser) return;
            
            try {
                const settingsDoc = await getDoc(doc(db, "userSettings", currentUser.uid));
                if (settingsDoc.exists()) {
                    const settingsData = settingsDoc.data();
                    if (settingsData.preferences) {
                        setUserPreferences(settingsData.preferences);
                        
                        // Appliquer le thème immédiatement
                        if (settingsData.preferences.theme === 'dark') {
                            setIsDarkMode(true);
                        } else if (settingsData.preferences.theme === 'light') {
                            setIsDarkMode(false);
                        } else if (settingsData.preferences.theme === 'auto') {
                            setIsDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
                        }
                        
                        // Appliquer la taille de police
                        userPreferencesService.applyFontSizePreference(settingsData.preferences.fontSize);
                        
                        // Appliquer le mode compact
                        userPreferencesService.applyCompactModePreference(settingsData.preferences.compactMode);
                    }
                }
            } catch (error) {
                console.error("Erreur lors du chargement des préférences:", error);
            }
        };

            const handlePreferencesUpdate = (newPreferences: UserPreferences) => {
        setUserPreferences(newPreferences);
        
        // Appliquer les changements immédiatement
        if (newPreferences.theme === 'dark') {
            setIsDarkMode(true);
        } else if (newPreferences.theme === 'light') {
            setIsDarkMode(false);
        } else if (newPreferences.theme === 'auto') {
            setIsDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
        }
        
        // Appliquer la taille de police
        userPreferencesService.applyFontSizePreference(newPreferences.fontSize);
        
        // Appliquer le mode compact
        userPreferencesService.applyCompactModePreference(newPreferences.compactMode);
        
        // Notification de succès
        showNotification(
            'Préférences mises à jour',
            'Vos paramètres ont été sauvegardés avec succès.',
            'success'
        );
    };

    // Fonction d'export de données
    const handleDataExport = async (options: ExportOptions) => {
        if (!currentUser) {
            showNotification('Erreur', 'Vous devez être connecté pour exporter vos données.', 'error');
            return;
        }

        setIsExporting(true);
        try {
            // Préparer les données selon les options
            const exportData = exportService.prepareExportData(
                options.includeSessions ? sessions : [],
                options.includePreferences ? userPreferences : undefined,
                options.includeTemplates ? userTemplates : [],
                userProfile || {},
                currentUser.uid
            );

            // Filtrer les données selon les options
            const filteredData = {
                ...exportData,
                sessions: options.includeSessions ? exportData.sessions : undefined,
                preferences: options.includePreferences ? exportData.preferences : undefined,
                templates: options.includeTemplates ? exportData.templates : undefined,
                profile: options.includeProfile ? exportData.profile : undefined
            };

            // Générer le nom de fichier
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `axonium_export_${timestamp}`;

            // Exporter les données
            await exportService.exportData(filteredData, options, filename);

            // Notification de succès
            showNotification(
                'Export réussi',
                `Vos données ont été exportées en ${options.format.toUpperCase()} avec succès.`,
                'success'
            );
        } catch (error) {
            console.error('Erreur lors de l\'export:', error);
            showNotification(
                'Erreur d\'export',
                'Une erreur est survenue lors de l\'export de vos données.',
                'error'
            );
        } finally {
            setIsExporting(false);
        }
    };

        const updateUserProfile = async (firstName: string) => {
            if (!currentUser) return;
            
            try {
                await updateDoc(doc(db, "users", currentUser.uid), {
                    firstName: firstName
                });
                setUserProfile(prev => prev ? {...prev, firstName} : {firstName, email: currentUser.email});
                setShowProfileEditor(false);
                alert('Profil mis à jour avec succès !');
            } catch (error) {
                console.error("Erreur lors de la mise à jour du profil:", error);
                alert('Erreur lors de la mise à jour du profil');
            }
        };

        const loadFavorites = async () => {
            if (!currentUser) return;
            
            try {
                const userDoc = await getDoc(doc(db, "users", currentUser.uid));
                if (userDoc.exists() && userDoc.data().favoriteTemplates) {
                    setFavoriteTemplates(userDoc.data().favoriteTemplates);
                }
            } catch (error) {
                console.error("Erreur lors du chargement des favoris:", error);
            }
        };

        const loadUserTemplates = async () => {
            if (!currentUser) return;
            
            try {
                console.log('Chargement des templates personnalisés...');
                const templatesCol = collection(db, "templates");
                const q = query(templatesCol, where("userId", "==", currentUser.uid));
                const querySnapshot = await getDocs(q);
                const userTemplatesData = querySnapshot.docs.map(doc => {
                    const template = { 
                        id: doc.id, 
                        ...doc.data() 
                    } as Template;
                    
                    // Vérifier que l'ID est valide
                    if (!template.id || template.id.trim() === '') {
                        console.warn('Template avec ID invalide trouvé:', template);
                        template.id = doc.id; // Utiliser l'ID du document Firebase
                    }
                    
                    console.log('Template chargé:', { id: template.id, name: template.name });
                    return template;
                });
                
                console.log('Templates personnalisés chargés:', userTemplatesData);
                setUserTemplates(userTemplatesData);
            } catch (error) {
                console.error("Erreur lors du chargement des templates personnalisés:", error);
            }
        };

        const loadCommunityTemplates = async () => {
            if (!currentUser) return;
            
            try {
                console.log('Chargement des templates communautaires...');
                const templatesCol = collection(db, "templates");
                // Requête temporaire pour inclure tous les templates publics
                const q = query(
                    templatesCol, 
                    where("isPublic", "==", true)
                );
                const querySnapshot = await getDocs(q);
                const communityTemplatesData = querySnapshot.docs
                    .map(doc => {
                        const template = { 
                            id: doc.id, 
                            ...doc.data() 
                        } as Template;
                        
                        // Vérifier que l'ID est valide
                        if (!template.id || template.id.trim() === '') {
                            console.warn('Template communautaire avec ID invalide trouvé:', template);
                            template.id = doc.id;
                        }
                        
                        console.log('Template communautaire chargé:', { id: template.id, name: template.name, userId: template.userId, isPublic: template.isPublic });
                        return template;
                    });
                // Ne plus filtrer - afficher tous les templates publics dans Communautaire
                
                console.log('Templates communautaires chargés:', communityTemplatesData);
                setCommunityTemplates(communityTemplatesData);
            } catch (error) {
                console.error("Erreur lors du chargement des templates communautaires:", error);
            }
        };

    // Sauvegarder automatiquement le brouillon quand le contenu change
    useEffect(() => {
        if (currentUser && documentText.trim().length > 0) {
            console.log('Sauvegarde automatique du brouillon...');
            const timeoutId = setTimeout(() => {
                saveDraft({});
            }, 1000); // Sauvegarder après 1 seconde d'inactivité
            
            return () => clearTimeout(timeoutId);
        }
    }, [documentText, currentUser]);

    // Sauvegarder quand les paramètres changent
    useEffect(() => {
        if (currentUser && (generationType !== 'qcm' || numQuestions !== 5 || difficulty !== 'Moyen')) {
            console.log('Sauvegarde des paramètres...');
            saveDraft({});
        }
    }, [generationType, numQuestions, difficulty, currentUser]);

    // Vérifier et charger les sessions partagées via URL
    const checkSharedSessionFromURL = async () => {
        const urlParams = new URLSearchParams(window.location.search);
        const sharedToken = urlParams.get('shared');
        const invitationToken = urlParams.get('invitation');
        
        if (sharedToken || invitationToken) {
            const token = sharedToken || invitationToken;
            const isInvitation = !!invitationToken;
            
            console.log(`${isInvitation ? 'Token d\'invitation' : 'Token de partage'} détecté:`, token);
            
            // Vérifier l'état de connexion directement avec Firebase Auth
            const currentAuthUser = auth?.currentUser;
            console.log('État de connexion - currentUser:', currentUser ? 'Connecté' : 'Non connecté');
            console.log('État de connexion - auth.currentUser:', currentAuthUser ? 'Connecté' : 'Non connecté');
            
            // Utiliser l'utilisateur Firebase Auth directement s'il est disponible
            const userToUse = currentUser || currentAuthUser;
            
            if (!userToUse) {
                console.log('Utilisateur non connecté, attente...');
                // Attendre jusqu'à 5 secondes que l'utilisateur se connecte
                for (let i = 0; i < 50; i++) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    const authUser = auth?.currentUser;
                    if (authUser) {
                        console.log('Utilisateur maintenant connecté via Firebase Auth');
                        break;
                    }
                }
                
                const finalAuthUser = auth?.currentUser;
                if (!finalAuthUser) {
                    console.log('Utilisateur toujours non connecté après attente');
                    showNotification(
                        'Connexion requise', 
                        'Vous devez être connecté pour accéder aux sessions partagées.', 
                        'info'
                    );
                    return;
                }
            }
            
            try {
                console.log('Tentative de chargement de la session partagée...');
                const sharedSession = isInvitation 
                    ? await shareService.getSessionByInvitation(token!)
                    : await shareService.getSessionByPublicLink(token!);
                
                if (sharedSession) {
                    console.log('Session partagée trouvée:', sharedSession);
                    
                    try {
                        // Créer une copie de la session partagée dans Firebase
                        const sessionCopy = {
                            ...sharedSession,
                            userId: currentUser?.uid || auth?.currentUser?.uid, // Nouveau propriétaire
                            createdAt: new Date().toISOString(), // Nouvelle date de création
                            isShared: false // Plus une session partagée
                        };
                        
                        // Supprimer l'ID original et les champs de partage
                        delete (sessionCopy as any).id;
                        delete (sessionCopy as any).sharedBy;
                        delete (sessionCopy as any).sharePermissions;
                        delete (sessionCopy as any).publicShare;
                        delete (sessionCopy as any).shareInvitation;
                        
                        console.log('Création de la copie de session dans Firebase:', sessionCopy);
                        
                        // Ajouter la session copiée à Firebase
                        const docRef = await addDoc(collection(db, "sessions"), sessionCopy);
                        const newSession = { id: docRef.id, ...sessionCopy };
                        
                        console.log('Session copiée créée avec ID:', docRef.id);
                        
                        // Ajouter la nouvelle session à la liste locale
                    setSessions(prev => {
                            const newSessions = [newSession, ...prev];
                            console.log('Nouveau nombre de sessions:', newSessions.length);
                            return newSessions;
                    });
                    
                    // Notification de succès
                    showNotification(
                            'Session partagée importée', 
                            `La création "${(sharedSession as any).title}" a été copiée dans vos créations.`, 
                        'success'
                    );
                    
                    // Nettoyer l'URL
                    const newUrl = new URL(window.location.href);
                    newUrl.searchParams.delete('shared');
                        newUrl.searchParams.delete('invitation');
                    window.history.replaceState({}, '', newUrl.toString());
                        
                    } catch (error) {
                        console.error("Erreur lors de la création de la copie de session:", error);
                        showNotification(
                            'Erreur', 
                            'Impossible de copier la session partagée. Veuillez réessayer.', 
                            'error'
                        );
                    }
                } else {
                    console.log('Aucune session trouvée pour ce token');
                    showNotification(
                        'Lien invalide', 
                        'Ce lien de partage n\'est plus valide ou a expiré.', 
                        'error'
                    );
                }
            } catch (error) {
                console.error("Erreur lors du chargement de la session partagée:", error);
                showNotification(
                    'Erreur', 
                    'Impossible de charger la session partagée. Le lien peut être expiré ou invalide.', 
                    'error'
                );
            }
        }
    };

    const fetchSessions = async (userId: string): Promise<(Session | SessionWithSharing)[]> => {
        try {
            console.log('🔍 Tentative de chargement des sessions pour l\'utilisateur:', userId);
            
            if (!db) {
                console.error('❌ Firestore non initialisé');
                return [];
            }
            
            const sessionsCol = collection(db, "sessions");
            const q = query(sessionsCol, where("userId", "==", userId));
            const querySnapshot = await getDocs(q);
            const userSessions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Session))
                .filter(session => session && session.id && session.title && session.createdAt); // Filtrer les sessions vides
            
            console.log('✅ Sessions utilisateur chargées:', userSessions.length);
            
            // Charger aussi les sessions partagées avec l'utilisateur
            try {
                const sharedSessions = await shareService.getSharedSessions(userId);
                console.log('✅ Sessions partagées chargées:', sharedSessions.length);
                
                // Combiner toutes les sessions (Firebase + sessions partagées)
                const allSessions = [...userSessions, ...sharedSessions];
                
                // Supprimer les doublons basés sur l'ID
                const uniqueSessions = allSessions.filter((session, index, self) => 
                    index === self.findIndex(s => (s as any).id === (session as any).id)
                );
                
                console.log('✅ Total des sessions (après déduplication):', uniqueSessions.length);
                
                // Trier par date de création
                return uniqueSessions.sort((a, b) => {
                    const dateA = new Date((a as any).createdAt).getTime();
                    const dateB = new Date((b as any).createdAt).getTime();
                    return dateB - dateA;
                });
            } catch (shareError) {
                console.warn('⚠️ Erreur lors du chargement des sessions partagées:', shareError);
                // Retourner seulement les sessions Firebase en cas d'erreur avec les sessions partagées
                return userSessions.sort((a, b) => {
                    const dateA = new Date((a as any).createdAt).getTime();
                    const dateB = new Date((b as any).createdAt).getTime();
                    return dateB - dateA;
                });
            }
        } catch (error) {
            console.error("❌ Erreur de lecture des sessions Firestore:", error);
            setError("Impossible de charger vos créations.");
            return [];
        }
    };
    
    const handleLogout = async () => {
        try {
            await signOut(auth);
            // Notification de déconnexion réussie
            showNotification('Déconnexion réussie', 'Vous avez été déconnecté avec succès.', 'success');
            // Recharger la page pour retourner à la page d'authentification
            window.location.reload();
        } catch (error) {
            console.error("Erreur de déconnexion:", error);
            setError("Erreur lors de la déconnexion.");
            showNotification('Erreur de déconnexion', 'Une erreur est survenue lors de la déconnexion.', 'error');
        }
    };

    // Fonctions pour le système de demandes d'inscription




    // Fonction pour générer un nom de session significatif
    const generateSessionTitle = (documentText: string, generationType: GenerationInputType, difficulty?: Difficulty, numQuestions?: number): string => {
        // Extraire les mots-clés du document
        const words = documentText.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(word => word.length > 3)
            .slice(0, 10);
        
        // Trouver les mots les plus fréquents
        const wordCount = words.reduce((acc, word) => {
            acc[word] = (acc[word] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        const topWords = Object.entries(wordCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));
        
        // Générer un titre basé sur le type de génération
        const typePrefixes = {
            'qcm': `QCM ${difficulty || 'Moyen'} - ${numQuestions || 5} questions`,
            'summary': 'Résumé',
            'chat': 'Discussion',
            'revision_sheet': 'Fiche de révision',
            'mind_map': 'Carte mentale',
            'guided_study': 'Étude guidée'
        };
        
        const prefix = typePrefixes[generationType];
        const keywords = topWords.length > 0 ? `: ${topWords.join(', ')}` : '';
        
        // Si le document commence par un titre clair, l'utiliser
        const firstLine = documentText.split('\n')[0].trim();
        if (firstLine.length > 10 && firstLine.length < 100 && !firstLine.includes('...')) {
            return `${prefix} - ${firstLine}`;
        }
        
        // Sinon, utiliser les mots-clés
        return `${prefix}${keywords}`;
    };

    const handleGenerate = useCallback(async () => {
        if (!currentUser) {
            setError("Vous devez être connecté pour générer du contenu.");
            return;
        }
        
        // Vérifier si l'utilisateur a une clé API configurée
        const hasApiKey = await apiKeyService.hasApiKey(currentUser.uid);
        if (!hasApiKey) {
            setError("Vous devez configurer votre clé API Gemini pour utiliser les fonctionnalités de génération. Allez dans Paramètres > Clé API pour la configurer.");
            showNotification(
                'Clé API requise',
                'Configurez votre clé API Gemini dans les paramètres pour générer du contenu.',
                'warning',
                {
                    label: 'Configurer',
                    onClick: () => setShowUserSettings(true)
                }
            );
            return;
        }
        
        if (documentText.trim().length < 100) {
            setError("Veuillez fournir un texte d'au moins 100 caractères pour générer un contenu pertinent.");
            return;
        }
        setError(null);
        setAppState('loading');

        try {
            const newSessionBase = {
                userId: currentUser.uid,
                documentText,
                createdAt: new Date().toISOString(),
                title: generateSessionTitle(documentText, generationType, difficulty, numQuestions),
            };
            
            // Récupérer le prompt spécialisé du template sélectionné
            const templatePrompt = selectedTemplate?.parameters.systemPrompt;

            let newSessionData: Omit<Session, 'id'> | null = null;

            switch (generationType) {
                case 'qcm': {
                    const quizResult = await generateQuizFromText(documentText, numQuestions, difficulty, currentUser.uid, templatePrompt);
                    const data: Omit<QcmSession, 'id'> = { ...newSessionBase, generationType: 'qcm', quizData: quizResult, userAnswers: {}, score: 0 };
                    newSessionData = data;
                    setPendingSessionData(data);
                    setCustomSessionTitle(newSessionBase.title);
                    setAppState('title_input');
                    break;
                }
                case 'summary': {
                    const summaryResult = await generateSummaryFromText(documentText, currentUser.uid, templatePrompt);
                    const data: Omit<SummarySession, 'id'> = { ...newSessionBase, generationType: 'summary', summary: summaryResult };
                    newSessionData = data;
                    setPendingSessionData(data);
                    setCustomSessionTitle(newSessionBase.title);
                    setAppState('title_input');
                    break;
                }
                case 'chat': {
                    const data: Omit<ChatSession, 'id'> = { ...newSessionBase, generationType: 'chat', messages: [] };
                    newSessionData = data;
                    setPendingSessionData(data);
                    setCustomSessionTitle(newSessionBase.title);
                    setAppState('title_input');
                    break;
                }
                case 'revision_sheet': {
                    const sheetResult = await generateRevisionSheetFromText(documentText, currentUser.uid, templatePrompt);
                    const data: Omit<RevisionSheetSession, 'id'> = { ...newSessionBase, generationType: 'revision_sheet', revisionSheetData: sheetResult };
                    newSessionData = data;
                    setPendingSessionData(data);
                    setCustomSessionTitle(newSessionBase.title);
                    setAppState('title_input');
                    break;
                }
                case 'mind_map': {
                    const mindMapResult = await generateMindMapFromText(documentText, currentUser.uid);
                    const data: Omit<MindMapSession, 'id'> = { ...newSessionBase, generationType: 'mind_map', mindMapData: mindMapResult };
                    newSessionData = data;
                    setPendingSessionData(data);
                    setCustomSessionTitle(newSessionBase.title);
                    setAppState('title_input');
                    break;
                }
                case 'guided_study': {
                    setProcessingMessage("Création de votre parcours d'étude guidé...");
                    const [sheetResult, quizResult] = await Promise.all([
                        generateRevisionSheetFromText(documentText, currentUser.uid, templatePrompt),
                        generateQuizFromText(documentText, numQuestions, difficulty, currentUser.uid, templatePrompt)
                    ]);
                     const data: Omit<GuidedStudySession, 'id'> = { 
                        ...newSessionBase, generationType: 'guided_study', title: `Étude Guidée: ${newSessionBase.title}`,
                        revisionSheetData: sheetResult, quizData: quizResult, userAnswers: {}, score: 0, messages: [], currentStep: 0,
                     };
                    newSessionData = data;
                    setAppState('guided_study');
                    setProcessingMessage('');
                    break;
                }
            }
            
            // Créer la session seulement pour les types qui ne passent pas par title_input
            if (newSessionData && generationType === 'guided_study') {
                const docRef = await addDoc(collection(db, "sessions"), newSessionData);
                const finalSession = { id: docRef.id, ...newSessionData } as Session;
                setSessions(prev => [finalSession, ...prev]);
                setActiveSessionId(finalSession.id);
                
                // Notification de succès
                showNotification(
                    'Étude guidée créée !',
                    'Votre étude guidée a été générée avec succès.',
                    'success'
                );
                
                            // Nettoyer le brouillon après la génération réussie
            await clearDraft();
            
            // Notification pour supprimer les doublons si nécessaire
            showNotification(
                'Doublons détectés',
                'Il semble que vous ayez des sessions en double. Cliquez pour les nettoyer.',
                'warning',
                {
                    label: 'Nettoyer les doublons',
                    onClick: removeDuplicateSessions
                }
            );
        }



        } catch (err: any) {
            setError(err.message || "Une erreur inattendue est survenue lors de la génération.");
            setAppState('input');
        }
    }, [documentText, numQuestions, difficulty, generationType, currentUser]);

    const handlePdfFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        event.target.value = '';
        if (file.type !== 'application/pdf') {
            setError("Veuillez sélectionner un fichier PDF."); return;
        }
        setError(null); 
        setDocumentText('');
        setIsProcessingFile(true);
        setProcessingMessage('Extraction du texte du PDF...');

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                fullText += textContent.items.map(item => 'str' in item ? item.str : '').join(' ') + '\n\n';
            }
            setDocumentText(fullText.trim());
        } catch (err) {
            console.error("Erreur de parsing PDF:", err);
            setError("Impossible de parser le fichier PDF. Il est peut-être corrompu.");
        } finally {
            setIsProcessingFile(false);
        }
    }, []);

    const handleImageFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        event.target.value = '';
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            setError("Veuillez sélectionner un fichier image (JPEG, PNG, WebP).");
            return;
        }
        
        // Vérifier si l'utilisateur a une clé API configurée
        if (!currentUser) {
            setError("Vous devez être connecté pour utiliser cette fonctionnalité.");
            return;
        }
        
        const hasApiKey = await apiKeyService.hasApiKey(currentUser.uid);
        if (!hasApiKey) {
            setError("Vous devez configurer votre clé API Gemini pour extraire du texte depuis les images. Allez dans Paramètres > Clé API pour la configurer.");
            showNotification(
                'Clé API requise',
                'Configurez votre clé API Gemini dans les paramètres pour extraire du texte depuis les images.',
                'warning',
                {
                    label: 'Configurer',
                    onClick: () => setShowUserSettings(true)
                }
            );
            return;
        }
        
        setError(null);
        setDocumentText('');
        setIsProcessingFile(true);
        setProcessingMessage("Analyse de l'image et extraction du texte...");

        try {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64String = (reader.result as string).split(',')[1];
                if (base64String) {
                    try {
                        const extractedText = await extractTextFromImage(base64String, file.type, currentUser.uid);
                        setDocumentText(extractedText);
                    } catch (err: any) {
                        setError(err.message || "Impossible d'extraire le texte de l'image.");
                    } finally {
                        setIsProcessingFile(false);
                    }
                }
            };
            reader.onerror = () => {
                setError("Erreur lors de la lecture du fichier image.");
                setIsProcessingFile(false);
            };
            reader.readAsDataURL(file);
        } catch (err) {
            console.error("Erreur lors de la gestion du fichier image:", err);
            setError("Une erreur est survenue lors du traitement de l'image.");
            setIsProcessingFile(false);
        }
    }, []);


    const resetQuizState = () => {
        setUserAnswers({}); setCurrentQuestionIndex(0); setSelectedOption(null); setIsAnswerChecked(false); setScore(0);
    };

    const resetAllContent = () => {
        setDocumentText('');
        setQuizData(null);
        setActiveQuiz(null);
        setSummary(null);
        setRevisionSheetData(null);
        setMindMapData(null);
        setChatMessages([]);
        setError(null);
        resetQuizState();
    };

    const handleBackToHistory = async () => {
        setAppState('history');
        setActiveSessionId(null);
        resetAllContent();
        
        // Recharger les sessions quand on va dans l'historique
        if (currentUser) {
            try {
                const userSessions = await fetchSessions(currentUser.uid);
                console.log('Sessions rechargées pour l\'historique:', userSessions.length);
                setSessions(userSessions);
            } catch (error) {
                console.error("Erreur lors du rechargement des sessions pour l'historique:", error);
            }
        }
    };

    const handleCreateNew = () => {
        setAppState('input');
        setActiveSessionId(null);
        resetAllContent();
    };

    const handleBackToMain = async () => {
        setAppState('main');
        
        // Recharger les sessions quand on revient au menu principal
        if (currentUser) {
            try {
                const userSessions = await fetchSessions(currentUser.uid);
                console.log('Sessions rechargées pour le menu principal:', userSessions.length);
                setSessions(userSessions);
            } catch (error) {
                console.error("Erreur lors du rechargement des sessions pour le menu principal:", error);
            }
        }
    };

    const handleConfirmTitle = async () => {
        if (!pendingSessionData || !customSessionTitle.trim()) {
            return;
        }

        try {
            // Créer la session avec le titre personnalisé
            const sessionData = { ...pendingSessionData, title: customSessionTitle.trim() };
            
            // Créer la session dans Firebase
            const docRef = await addDoc(collection(db, 'sessions'), sessionData);
            const newSession = { ...sessionData, id: docRef.id } as Session;
            
            // Ajouter la session à la liste
            setSessions(prev => [newSession, ...prev]);
            
            // Configurer l'affichage selon le type de session
            switch (sessionData.generationType) {
                case 'qcm': {
                    setQuizData((sessionData as QcmSession).quizData);
                    setActiveQuiz((sessionData as QcmSession).quizData);
                    resetQuizState();
                    setFlashcardSource('input');
                    setAppState('quiz');
                    break;
                }
                case 'summary': {
                    setSummary((sessionData as SummarySession).summary);
                    setAppState('summary_display');
                    break;
                }
                case 'chat': {
                    setChatMessages([]);
                    setAppState('chat');
                    break;
                }
                case 'revision_sheet': {
                    setRevisionSheetData((sessionData as RevisionSheetSession).revisionSheetData);
                    setAppState('revision_sheet_display');
                    break;
                }
                case 'mind_map': {
                    setMindMapData((sessionData as MindMapSession).mindMapData);
                    setAppState('mind_map_display');
                    break;
                }
                case 'guided_study': {
                    const guidedSession = sessionData as GuidedStudySession;
                    setRevisionSheetData(guidedSession.revisionSheetData);
                    setQuizData(guidedSession.quizData);
                    setActiveQuiz(guidedSession.quizData);
                    resetQuizState();
                    setFlashcardSource('input');
                    setAppState('guided_study');
                    break;
                }
            }
            
            // Réinitialiser les états
            setPendingSessionData(null);
            setCustomSessionTitle('');
            
            showNotification(
                'Création réussie',
                'Votre contenu a été créé avec succès !',
                'success'
            );
            
        } catch (error) {
            console.error('Erreur lors de la création de la session:', error);
            showNotification(
                'Erreur',
                'Une erreur est survenue lors de la création de votre contenu.',
                'error'
            );
        }
    };

    const handleCancelTitle = () => {
        setPendingSessionData(null);
        setCustomSessionTitle('');
        setAppState('input');
    };
    
    const handleOpenSession = (session: Session) => {
        setActiveSessionId(session.id);
        setDocumentText(session.documentText);
        switch (session.generationType) {
            case 'qcm':
                if (session.quizData) {
                    setQuizData(session.quizData);
                    setActiveQuiz(session.quizData);
                    setUserAnswers(session.userAnswers || {});
                    setScore(session.score || 0);
                    setCurrentQuestionIndex(0);
                    setIsAnswerChecked(false);
                    setSelectedOption(null);
                    setAppState('results');
                } else {
                    setGenerationType('qcm');
                    setAppState('input');
                }
                break;
            case 'summary':
                setSummary(session.summary);
                setAppState('summary_display');
                break;
            case 'chat':
                setChatMessages(session.messages);
                setAppState('chat');
                break;
            case 'revision_sheet':
                setRevisionSheetData(session.revisionSheetData);
                setAppState('revision_sheet_display');
                break;
            case 'mind_map':
                setMindMapData(session.mindMapData);
                setAppState('mind_map_display');
                break;
            case 'guided_study':
                setAppState('guided_study');
                break;
        }
    };
    
    const handleDeleteSession = async (sessionId: string) => {
        if (window.confirm("Êtes-vous sûr de vouloir supprimer cette session ?")) {
            try {
                // Vérifier si c'est une session partagée
                const sessionToDelete = sessions.find(s => s.id === sessionId);
                
                console.log('Session à supprimer:', sessionToDelete);
                console.log('Propriétés de la session:', {
                    id: sessionToDelete?.id,
                    userId: sessionToDelete?.userId,
                    currentUserId: currentUser?.uid,
                    isShared: 'isShared' in (sessionToDelete || {}),
                    isSharedValue: (sessionToDelete as any)?.isShared
                });
                
                // Afficher toutes les sessions pour débogage
                console.log('Toutes les sessions:', sessions.map(s => ({
                    id: s.id,
                    title: (s as any).title,
                    userId: s.userId,
                    isShared: (s as any).isShared,
                    sharedBy: (s as any).sharedBy
                })));
                
                if (sessionToDelete && (sessionToDelete as any).isShared === true) {
                    console.log('Session partagée détectée, proposition de retrait local');
                    // C'est une session partagée - proposer de la retirer de l'historique local
                    if (window.confirm("Cette création vous a été partagée. Voulez-vous la retirer de vos créations locales ? Elle restera disponible pour les autres utilisateurs.")) {
                        // Retirer de l'état local
                        setSessions(prev => prev.filter(s => s.id !== sessionId));
                        

                        
                        showNotification(
                            'Création retirée',
                            'La création partagée a été retirée de vos créations.',
                            'success'
                        );
                    }
                    return;
                }
                
                // Vérifier que l'utilisateur est bien le propriétaire de la session
                if (sessionToDelete && sessionToDelete.userId !== currentUser?.uid) {
                    showNotification(
                        'Accès refusé',
                        'Vous ne pouvez supprimer que vos propres sessions.',
                        'error'
                    );
                    return;
                }
                
                // Supprimer la session de Firebase
                await deleteDoc(doc(db, "sessions", sessionId));
                
                // Retirer de la liste locale
                setSessions(prev => prev.filter(s => s.id !== sessionId));
                
                showNotification(
                    'Création supprimée',
                    'La création a été supprimée avec succès.',
                    'success'
                );
            } catch (error) {
                console.error("Erreur de suppression:", error);
                setError("Impossible de supprimer la session.");
                showNotification(
                    'Erreur de suppression',
                    'Une erreur est survenue lors de la suppression de la création.',
                    'error'
                );
            }
        }
    };

    const handleShareSession = (session: Session) => {
        setSelectedSessionForSharing(session);
        setShowShareModal(true);
    };

    const updateSessionInDb = async (sessionId: string, updates: Partial<Session>) => {
        if (!sessionId) return;
        try {
            const sessionRef = doc(db, "sessions", sessionId);
            await updateDoc(sessionRef, updates);
        } catch (error) {
            console.error("Erreur de mise à jour Firestore:", error);
            setError("Impossible de sauvegarder la progression.");
        }
    };

    const handleUpdateGuidedStudySession = useCallback(async (updates: Partial<GuidedStudySession>) => {
        if (!activeSessionId) return;
        await updateSessionInDb(activeSessionId, updates);
        setSessions(prev => prev.map(s => {
            if (s.id === activeSessionId && s.generationType === 'guided_study') {
                return { ...s, ...updates };
            }
            return s;
        }));
    }, [activeSessionId]);
    
    const handleUpdateQuizSession = useCallback(async (finalAnswers: UserAnswers, finalScore: number) => {
        if (!activeSessionId) return;
        const updates = { userAnswers: finalAnswers, score: finalScore };
        await updateSessionInDb(activeSessionId, updates);
        setSessions(prev => prev.map(s => {
            if (s.id === activeSessionId && s.generationType === 'qcm') {
                return { ...s, ...updates };
            }
            return s;
        }));
    }, [activeSessionId]);

    const handleUpdateChatSession = useCallback(async (messages: Message[]) => {
        if (!activeSessionId) return;
        const updates = { messages: messages };
        await updateSessionInDb(activeSessionId, updates);
        setSessions(prev => prev.map(s => {
            if (s.id === activeSessionId && (s.generationType === 'chat' || s.generationType === 'guided_study')) {
                return { ...s, ...updates };
            }
            return s;
        }));
    }, [activeSessionId]);
    
    const handleOptionSelect = (option: string) => { if (!isAnswerChecked) { setSelectedOption(option); } };
    const handleCheckAnswer = () => {
        if (!selectedOption || !activeQuiz) return;
        setIsAnswerChecked(true);
        const currentQuestion = activeQuiz.questions[currentQuestionIndex];
        const isCorrect = selectedOption === currentQuestion.correctAnswer;
        const newScore = isCorrect ? score + 1 : score;
        setScore(newScore);
        const newAnswers = { ...userAnswers, [currentQuestionIndex]: selectedOption };
        setUserAnswers(newAnswers);

        const isLastQuestion = currentQuestionIndex === activeQuiz.questions.length - 1;
        if (isLastQuestion) {
            const activeSession = sessions.find(s => s.id === activeSessionId);
            if (activeSession?.generationType === 'qcm') {
                handleUpdateQuizSession(newAnswers, newScore);
            }
        }
    };

    const handleNextQuestion = () => {
        if (!activeQuiz) return;
        const isLastQuestion = currentQuestionIndex === activeQuiz.questions.length - 1;
        if (isLastQuestion) {
            setAppState('results');
        } else {
            setCurrentQuestionIndex(prev => prev + 1);
            setSelectedOption(null); setIsAnswerChecked(false);
        }
    };

    const handleRetakeQuiz = (mode: 'all' | 'incorrect') => {
        if (!quizData) return;
        let quizToRetake: QuizData;
        if (mode === 'all') {
            quizToRetake = quizData;
        } else {
            const incorrectQuestions = quizData.questions.filter((q, index) => userAnswers[index] !== q.correctAnswer);
            if(incorrectQuestions.length === 0) { alert("Félicitations, vous avez répondu correctement à toutes les questions !"); return; }
            quizToRetake = { ...quizData, title: `${quizData.title} (Incorrectes)`, questions: incorrectQuestions };
        }
        setActiveQuiz(quizToRetake);
        resetQuizState();
        setAppState('quiz');
    };
    
    const handleStartFlashcardsFromResults = () => { if (quizData) { setActiveQuiz(quizData); setFlashcardSource('results'); setAppState('flashcards'); } };
    
    const handleExportResults = () => {
        if (!activeQuiz) return;
        const { title, questions } = activeQuiz;
        const totalQuestions = questions.length;
        const finalScore = Object.keys(userAnswers).reduce((acc, index) => {
            const question = questions[Number(index)];
            const userAnswer = userAnswers[Number(index)];
            return userAnswer === question.correctAnswer ? acc + 1 : acc;
        }, 0);
        
        const percentage = totalQuestions > 0 ? Math.round((finalScore / totalQuestions) * 100) : 0;
        let content = `Résultats du Quiz : ${title}\nScore : ${finalScore} / ${totalQuestions} (${percentage}%)\n\n----------------------------------------\n\n`;
        questions.forEach((q, index) => {
            const userAnswer = userAnswers[index];
            const isCorrect = userAnswer === q.correctAnswer;
            content += `Question ${index + 1}: ${q.questionText}\nVotre réponse : ${userAnswer || 'Non répondue'} ${isCorrect ? '(Correct)' : '(Incorrect)'}\n`;
            if (!isCorrect) content += `Bonne réponse : ${q.correctAnswer}\n`;
            content += `Justification : ${q.justification}\n\n`;
        });
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `resultats_quiz_${title.replace(/\s+/g, '_')}.txt`;
        a.click();
        URL.revokeObjectURL(a.href);
    };

    const handleExportRevisionSheet = (sheetData: RevisionSheetData, title: string) => {
        const doc = new jsPDF();
        const page_width = doc.internal.pageSize.getWidth();
        const margin = 15;
        let y = margin;
    
        const checkPageBreak = (heightNeeded: number) => {
            if (y + heightNeeded > doc.internal.pageSize.getHeight() - margin) {
                doc.addPage();
                y = margin;
            }
        }
    
        doc.setFontSize(22).setFont('helvetica', 'bold');
        doc.text("Fiche de Révision", page_width / 2, y, { align: 'center' });
        y += 10;
        doc.setFontSize(14).setFont('helvetica', 'italic').setTextColor(100);
        const titleLines = doc.splitTextToSize(title, page_width - margin*2);
        doc.text(titleLines, page_width / 2, y, { align: 'center' });
        y += titleLines.length * 7 + 10;
        doc.setTextColor(0);
    
        const addSectionTitle = (text: string) => {
            checkPageBreak(20);
            doc.setFontSize(16).setFont('helvetica', 'bold');
            doc.text(text, margin, y);
            y += 8;
        }
    
        const addBodyText = (text: string, options: {isListItem?: boolean} = {}) => {
            const indent = options.isListItem ? 5 : 0;
            const lines = doc.setFontSize(11).setFont('helvetica', 'normal').splitTextToSize(text, page_width - margin * 2 - indent);
            const height = lines.length * 7;
            checkPageBreak(height);
            if(options.isListItem) {
                doc.circle(margin + 2, y - 2, 1, 'F');
            }
            doc.text(lines, margin + indent, y);
            y += height + 4;
        }
    
        addSectionTitle("Résumé Approfondi");
        addBodyText(sheetData.summary);
    
        addSectionTitle("Concepts Clés");
        sheetData.keyConcepts.forEach(concept => {
            const termLines = doc.setFontSize(12).setFont('helvetica', 'bold').splitTextToSize(concept.term, page_width - margin*2);
            const defLines = doc.setFontSize(11).setFont('helvetica', 'normal').splitTextToSize(concept.definition, page_width - margin*2 - 5);
            const heightNeeded = (termLines.length * 7) + (defLines.length * 7) + 5;
            checkPageBreak(heightNeeded);
    
            doc.setFontSize(12).setFont('helvetica', 'bold');
            doc.text(termLines, margin, y);
            y += termLines.length * 7 + 2;
    
            doc.setFontSize(11).setFont('helvetica', 'normal');
            doc.text(defLines, margin + 5, y);
            y += defLines.length * 7 + 5;
        });
    
        addSectionTitle("Grandes Idées & Thématiques");
        sheetData.mainIdeas.forEach(idea => { addBodyText(idea, { isListItem: true }); });
    
        addSectionTitle("Questions de Réflexion");
        sheetData.reflectionQuestions.forEach((question, index) => {
            const text = `${index + 1}. ${question}`;
            const lines = doc.setFontSize(11).setFont('helvetica', 'normal').splitTextToSize(text, page_width - margin*2);
            const height = lines.length * 7;
            checkPageBreak(height);
            doc.text(lines, margin, y);
            y += height + 4;
        });
    
        doc.save(`Fiche_de_Révision_${title.replace(/\s+/g, '_')}.pdf`);
    };

    const filteredSessions = useMemo(() => {
        if (!historySearchTerm) return sessions;
        return sessions.filter(session =>
            session.title.toLowerCase().includes(historySearchTerm.toLowerCase()) ||
            session.documentText.toLowerCase().includes(historySearchTerm.toLowerCase())
        );
    }, [sessions, historySearchTerm]);
    
    const renderContent = () => {
        if (authLoading || (currentUser && appState === 'loading')) {
             return <Loader text="Chargement de votre espace..." />;
        }
        if (!currentUser) {
            return <AuthSection 
                setGlobalError={() => {}}
                showNotification={showNotification}
                onShowAccountRequest={() => {}}
            />;
        }

        // Rendu avec transitions animées
        return (
            <>
                {/* Section principale */}
                {shouldRenderMain && (
                    <PageTransition 
                        isVisible={appState === 'main'} 
                        direction="up"
                        className={mainTransitionClass}
                    >
                                                <DashboardSection
                            sessions={sessions}
                            onNewGeneration={handleCreateNew}
                            onOpenSession={handleOpenSession}
                            onDeleteSession={handleDeleteSession}
                            onShareSession={handleShareSession}
                            onRenameSession={handleRenameSession}
                            onLogout={handleLogout}
                            currentUser={currentUser}
                            userProfile={userProfile}
                            userPreferences={userPreferences}
                            onOpenSettings={() => setShowUserSettings(true)}
                            onImproveSessionNames={improveExistingSessionNames}
                            onRemoveDuplicates={removeDuplicateSessions}
                            onSetGenerationType={setGenerationType}
                            onUpdateUserProfile={updateUserProfile}
                        />
                    </PageTransition>
                )}

                {/* Section historique */}
                {shouldRenderHistory && (
                    <PageTransition 
                        isVisible={appState === 'history'} 
                        direction="left"
                        className={historyTransitionClass}
                    >
                        <HistorySection 
                            sessions={filteredSessions} 
                            onNewSession={handleCreateNew} 
                            onOpenSession={handleOpenSession} 
                            onDeleteSession={handleDeleteSession} 
                            onShareSession={handleShareSession}
                            searchTerm={historySearchTerm} 
                            onSearchChange={setHistorySearchTerm} 
                        />
                    </PageTransition>
                )}

                {/* Section saisie */}
                {shouldRenderInput && (
                    <PageTransition 
                        isVisible={appState === 'input'} 
                        direction="up"
                        className={inputTransitionClass}
                    >
                        <DocumentInputSection 
                            text={documentText} 
                            setText={setDocumentText} 
                            onGenerate={handleGenerate} 
                            onPdfChange={handlePdfFileChange} 
                            onImageChange={handleImageFileChange} 
                            isProcessing={isProcessingFile} 
                            processingMessage={processingMessage} 
                            error={error} 
                            setError={setError} 
                            numQuestions={numQuestions} 
                            setNumQuestions={setNumQuestions} 
                            difficulty={difficulty} 
                            setDifficulty={setDifficulty} 
                            generationType={generationType} 
                            setGenerationType={setGenerationType} 
                            onBack={handleBackToMain}
                            onBackToMain={() => setAppState('main')}
                            selectedTemplate={selectedTemplate}
                            onTemplateSelect={handleTemplateSelect}
                            onShowTemplateSelector={() => setShowTemplateSelector(true)}
                            userPreferences={userPreferences}
                            onOpenDocumentSelector={handleOpenDocumentSelector}
                            selectedDocument={selectedDocument}
                            onClearSelectedDocument={handleClearSelectedDocument}
                            showDocumentLibrary={showDocumentSelector}
                            onToggleDocumentLibrary={() => setShowDocumentSelector(!showDocumentSelector)}
                        />
                    </PageTransition>
                )}

                {/* Section saisie du titre */}
                {appState === 'title_input' && (
                    <PageTransition 
                        isVisible={true} 
                        direction="up"
                        className="flex-1 overflow-hidden"
                    >
                        <TitleInputSection 
                            title={customSessionTitle}
                            setTitle={setCustomSessionTitle}
                            onConfirm={handleConfirmTitle}
                            onCancel={handleCancelTitle}
                            generationType={pendingSessionData?.generationType || 'qcm'}
                        />
                    </PageTransition>
                )}

                {/* Autres sections avec animations */}
                {appState === 'loading' && (
                    <PageTransition isVisible={true} direction="up">
                        <Loader text={processingMessage || "Analyse du document et génération de votre contenu..."} />
                    </PageTransition>
                )}

                {appState === 'summary_display' && summary && (
                    <PageTransition isVisible={true} direction="up">
                        <SummaryDisplaySection summary={summary} onExit={handleBackToMain} />
                    </PageTransition>
                )}

                {appState === 'revision_sheet_display' && revisionSheetData && (
                    <PageTransition isVisible={true} direction="up">
                        {(() => {
                            const activeSheetSession = sessions.find(s => s.id === activeSessionId && s.generationType === 'revision_sheet') as RevisionSheetSession | undefined;
                            return activeSheetSession && <RevisionSheetDisplaySection revisionSheetData={revisionSheetData} onExit={handleBackToMain} onExport={() => handleExportRevisionSheet(revisionSheetData, activeSheetSession.title)} />;
                        })()}
                    </PageTransition>
                )}

                {appState === 'mind_map_display' && mindMapData && (
                    <PageTransition isVisible={true} direction="up">
                        <MindMapDisplaySection mindMapData={mindMapData} onExit={handleBackToMain} />
                    </PageTransition>
                )}

                {appState === 'quiz' && activeQuiz && (
                    <PageTransition isVisible={true} direction="up">
                        <QuizSection 
                            question={activeQuiz.questions[currentQuestionIndex]} 
                            questionIndex={currentQuestionIndex} 
                            totalQuestions={activeQuiz.questions.length} 
                            selectedOption={selectedOption} 
                            onOptionSelect={handleOptionSelect} 
                            onCheckAnswer={handleCheckAnswer} 
                            onNextQuestion={handleNextQuestion} 
                            isAnswerChecked={isAnswerChecked} 
                            onExit={handleBackToMain} 
                        />
                    </PageTransition>
                )}

                {appState === 'results' && (
                    <PageTransition isVisible={true} direction="up">
                        {(() => {
                            const activeQcmSession = sessions.find(s => s.id === activeSessionId && s.generationType === 'qcm') as QcmSession | undefined;
                            return activeQcmSession && <ResultsSection session={activeQcmSession} onExit={handleBackToMain} onRetakeQuiz={handleRetakeQuiz} onStudy={handleStartFlashcardsFromResults} onExport={handleExportResults} />;
                        })()}
                    </PageTransition>
                )}

                {appState === 'flashcards' && quizData && (
                    <PageTransition isVisible={true} direction="up">
                        {(() => {
                            const onExitFlashcards = flashcardSource === 'results' ? () => setAppState('results') : handleBackToMain;
                            return <FlashcardSection quizData={quizData} onExit={onExitFlashcards} />;
                        })()}
                    </PageTransition>
                )}

                {appState === 'chat' && (
                    <PageTransition isVisible={true} direction="up">
                        {(() => {
                            const activeChatSession = sessions.find(s => s.id === activeSessionId && (s.generationType === 'chat' || s.generationType === 'guided_study')) as ChatSession | GuidedStudySession | undefined;
                            return activeChatSession && <ChatSection initialMessages={activeChatSession.messages} onExit={handleBackToMain} onMessagesUpdate={handleUpdateChatSession} documentText={activeChatSession.documentText} userId={currentUser.uid} />;
                        })()}
                    </PageTransition>
                )}

                {appState === 'guided_study' && (
                    <PageTransition isVisible={true} direction="up">
                        {(() => {
                            const activeGuidedSession = sessions.find(s => s.id === activeSessionId && s.generationType === 'guided_study') as GuidedStudySession | undefined;
                            return activeGuidedSession && <GuidedStudySection session={activeGuidedSession} onUpdateSession={handleUpdateGuidedStudySession} onExit={handleBackToMain} onUpdateChatMessages={handleUpdateChatSession} onExportRevisionSheet={handleExportRevisionSheet} />;
                        })()}
                    </PageTransition>
                )}
            </>
        );
    };

    // Fonction pour renommer une session
    const handleRenameSession = async (sessionId: string, newTitle: string) => {
        if (!currentUser) return;
        
        try {
            // Mettre à jour dans Firebase
            await updateDoc(doc(db, "sessions", sessionId), {
                title: newTitle
            });
            
            // Mettre à jour dans l'état local
            setSessions(prev => prev.map(s => 
                s.id === sessionId ? { ...s, title: newTitle } : s
            ));
            
            showNotification(
                'Création renommée',
                'Le nom de la création a été mis à jour avec succès.',
                'success'
            );
        } catch (error) {
            console.error("Erreur lors du renommage:", error);
            showNotification(
                'Erreur',
                'Impossible de renommer la création.',
                'error'
            );
        }
    };

    // Fonction pour améliorer automatiquement les noms des sessions existantes
    // Fonction pour supprimer les sessions en double
    const removeDuplicateSessions = async () => {
        if (!currentUser) return;
        
        try {
            const sessionsToCheck = sessions.filter(s => s.userId === currentUser.uid);
            const duplicates: string[] = [];
            
            // Trouver les sessions avec le même contenu mais des titres différents
            for (let i = 0; i < sessionsToCheck.length; i++) {
                for (let j = i + 1; j < sessionsToCheck.length; j++) {
                    const session1 = sessionsToCheck[i];
                    const session2 = sessionsToCheck[j];
                    
                    // Vérifier si les sessions ont le même contenu mais des titres différents
                    if (session1.documentText === session2.documentText && 
                        session1.generationType === session2.generationType &&
                        session1.title !== session2.title) {
                        
                        // Garder celle avec le titre le plus long (probablement le titre personnalisé)
                        const sessionToDelete = session1.title.length > session2.title.length ? session2 : session1;
                        duplicates.push(sessionToDelete.id);
                    }
                }
            }
            
            // Supprimer les doublons
            for (const sessionId of duplicates) {
                await deleteDoc(doc(db, "sessions", sessionId));
            }
            
            if (duplicates.length > 0) {
                // Recharger les sessions
                const userSessions = await fetchSessions(currentUser.uid);
                setSessions(userSessions);
                
                showNotification(
                    'Doublons supprimés',
                    `${duplicates.length} session(s) en double ont été supprimées.`,
                    'success'
                );
            } else {
                showNotification(
                    'Aucun doublon trouvé',
                    'Toutes vos sessions sont uniques.',
                    'info'
                );
            }
        } catch (error) {
            console.error("Erreur lors de la suppression des doublons:", error);
            showNotification(
                'Erreur',
                'Impossible de supprimer les sessions en double.',
                'error'
            );
        }
    };

    const improveExistingSessionNames = async () => {
        if (!currentUser) return;
        
        try {
            const sessionsToUpdate = sessions.filter(session => {
                // Identifier les sessions avec des noms génériques
                const genericNames = ['Nouvelle Session', 'Session', 'Document', 'Texte'];
                return genericNames.some(name => session.title.includes(name));
            });
            
            if (sessionsToUpdate.length === 0) {
                showNotification(
                    'Aucune amélioration nécessaire',
                    'Toutes vos sessions ont déjà des noms significatifs.',
                    'info'
                );
                return;
            }
            
            let updatedCount = 0;
            for (const session of sessionsToUpdate) {
                const newTitle = generateSessionTitle(
                    session.documentText, 
                    session.generationType,
                    session.generationType === 'qcm' ? 'Moyen' : undefined,
                    session.generationType === 'qcm' ? (session as QcmSession).quizData?.questions?.length : undefined
                );
                
                await updateDoc(doc(db, "sessions", session.id), {
                    title: newTitle
                });
                updatedCount++;
            }
            
            // Recharger les sessions
            const userSessions = await fetchSessions(currentUser.uid);
            setSessions(userSessions);
            
            showNotification(
                'Noms améliorés',
                `${updatedCount} création(s) ont été renommées avec des noms plus significatifs.`,
                'success'
            );
        } catch (error) {
            console.error("Erreur lors de l'amélioration des noms:", error);
            showNotification(
                'Erreur',
                'Impossible d\'améliorer les noms des créations.',
                'error'
            );
        }
    };

    return (
        <div className="h-screen bg-slate-50 dark:bg-slate-900 flex flex-col overflow-hidden transition-colors duration-300 min-h-screen flex-1">
            <header className="w-full bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm z-50 flex-shrink-0 transition-colors duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-14">
                        {/* Logo et titre */}
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                                <BrainCircuitIcon className="h-5 w-5 text-white" />
                        </div>
                            <div className="flex flex-col">
                                <h1 className="text-lg font-bold text-slate-900 dark:text-white">Axonium</h1>
                                <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">Assistant d'étude IA</p>
                            </div>
                        </div>

                        {/* Navigation centrale - affichée seulement si l'utilisateur est connecté */}
                        {currentUser && (
                            <>
                                {/* Navigation desktop */}
                                <nav className="hidden md:flex items-center gap-2">
                                    <button
                                        onClick={() => setAppState('main')}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                                            appState === 'main'
                                                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700'
                                        }`}
                                    >
                                        <HomeIcon className="h-5 w-5" />
                                        Accueil
                                    </button>
                                    <button
                                        onClick={() => setAppState('history')}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                                            appState === 'history'
                                                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700'
                                        }`}
                                    >
                                        <BookOpenIcon className="h-5 w-5" />
                                        Études
                                    </button>
                                    <button
                                        onClick={handleCreateNew}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                                            appState === 'input'
                                                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700'
                                        }`}
                                    >
                                        <PlusIcon className="h-5 w-5" />
                                        Créer
                                    </button>
                                </nav>

                                {/* Bouton menu mobile */}
                                <button
                                    onClick={() => setShowMobileMenu(!showMobileMenu)}
                                    className="md:hidden p-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                    aria-label="Menu mobile"
                                >
                                    <MenuIcon className="h-5 w-5" />
                                </button>
                            </>
                        )}

                        {/* Bouton de toggle du thème - toujours visible */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={toggleTheme}
                                className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                aria-label={isDarkMode ? "Passer au mode clair" : "Passer au mode sombre"}
                            >
                                {isDarkMode ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
                            </button>

                            <NotificationBell
                                notifications={notifications}
                                showNotifications={showNotifications}
                                onToggleNotifications={() => setShowNotifications(!showNotifications)}
                                onMarkAsRead={markNotificationAsRead}
                                onRemoveNotification={removeNotification}
                                onClearAll={clearAllNotifications}
                            />

                            {/* Menu utilisateur - seulement si connecté */}
                            {currentUser && (
                                <>
                                    {/* Menu profil */}
                                    <div className="relative profile-menu">
                                    <button 
                                        onClick={() => setShowProfileMenu(!showProfileMenu)}
                                        className="flex items-center gap-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium p-2 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-500 transition-all duration-200 shadow-sm hover:shadow-md h-9"
                                    >
                                        <div className="w-5 h-5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-sm">
                                            <span className="text-white text-xs font-bold">
                                                {userProfile?.firstName ? userProfile.firstName.charAt(0).toUpperCase() : 'U'}
                                            </span>
                                        </div>
                                        <div className="hidden sm:block text-center">
                                            <div className="text-xs font-semibold text-slate-800 dark:text-white">
                                                {userProfile?.firstName || 'Utilisateur'}
                                            </div>
                                        </div>
                                        <ChevronDownIcon className="h-2.5 w-2.5 text-slate-400 dark:text-slate-500 transition-transform duration-200" />
                                    </button>
                                    
                                    {showProfileMenu && (
                                        <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden backdrop-blur-sm">
                                            <div className="p-5 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-slate-700 dark:to-slate-600">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg aspect-square">
                                                        <span className="text-white text-lg font-bold">
                                                            {userProfile?.firstName ? userProfile.firstName.charAt(0).toUpperCase() : 'U'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-900 dark:text-white text-base">
                                                            {userProfile?.firstName || 'Utilisateur'}
                                                        </div>
                                                        <div className="text-xs text-slate-600 dark:text-slate-300">
                                                    {userProfile?.email}
                                                </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="py-3">
                                                <button 
                                                    onClick={() => {
                                                        setShowProfileMenu(false);
                                                        setShowProfileEditor(true);
                                                    }}
                                                    className="w-full text-left px-5 py-3.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 dark:hover:from-slate-700 dark:hover:to-slate-600 flex items-center gap-3 transition-all duration-200 font-medium"
                                                >
                                                    <UserIcon className="h-4 w-4 text-indigo-500" />
                                                    Modifier le profil
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        setShowProfileMenu(false);
                                                        setShowUserSettings(true);
                                                    }}
                                                    className="w-full text-left px-5 py-3.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 dark:hover:from-slate-700 dark:hover:to-slate-600 flex items-center gap-3 transition-all duration-200 font-medium"
                                                >
                                                    <SettingsIcon className="h-4 w-4 text-indigo-500" />
                                                    Paramètres
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        setShowProfileMenu(false);
                                                        setShowDataExportModal(true);
                                                    }}
                                                    className="w-full text-left px-5 py-3.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 dark:hover:from-slate-700 dark:hover:to-slate-600 flex items-center gap-3 transition-all duration-200 font-medium"
                                                >
                                                    <DownloadIcon className="h-4 w-4 text-indigo-500" />
                                                    Export de données
                                                </button>
                                                <div className="border-t border-slate-200 dark:border-slate-700 my-3"></div>
                                                <button 
                                                    onClick={handleLogout}
                                                    className="w-full text-left px-5 py-3.5 text-sm text-red-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 dark:hover:from-red-900 dark:hover:to-red-800 flex items-center gap-3 transition-all duration-200 font-medium"
                                                >
                                                    <LogOutIcon className="h-4 w-4" />
                                                    Déconnexion
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                </>
                            )}
                        </div>
                    </div>
                            </div>
        </header>

        {/* Menu mobile overlay */}
        {showMobileMenu && currentUser && (
            <div className="md:hidden fixed inset-0 z-50 bg-black bg-opacity-50" onClick={() => setShowMobileMenu(false)}>
                <div className="absolute top-0 right-0 w-64 h-full bg-white dark:bg-slate-800 shadow-xl transform transition-transform duration-300 ease-in-out" onClick={(e) => e.stopPropagation()}>
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Menu</h3>
                            <button
                                onClick={() => setShowMobileMenu(false)}
                                className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            >
                                <XIcon className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                    
                    <nav className="p-4 space-y-2">
                        <button
                            onClick={() => {
                                setAppState('main');
                                setShowMobileMenu(false);
                            }}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                                appState === 'main' 
                                    ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300' 
                                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                        >
                            <HomeIcon className="h-5 w-5" />
                            Accueil
                        </button>
                        
                        <button
                            onClick={() => {
                                setAppState('history');
                                setShowMobileMenu(false);
                            }}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                                appState === 'history' 
                                    ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300' 
                                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                        >
                            <HistoryIcon className="h-5 w-5" />
                            Historique
                        </button>
                        
                        <button
                            onClick={() => {
                                handleCreateNew();
                                setShowMobileMenu(false);
                            }}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                                appState === 'input' 
                                    ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300' 
                                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                        >
                            <PlusIcon className="h-5 w-5" />
                            Créer
                        </button>
                    </nav>
                </div>
            </div>
        )}
            <main className="flex-1 p-2 pt-2 pb-4 overflow-hidden min-h-0">
                <div className={`mx-auto transition-all duration-500 ease-in-out h-full flex flex-col min-h-0 flex-1 ${appState === 'mind_map_display' ? 'max-w-screen-xl' : 'max-w-full'}`}>
                        {showTemplateSelector ? (
                            <div className="p-4 flex-1 overflow-auto">
                                <TemplateSelector
                                    onTemplateSelect={handleTemplateSelect}
                                    onCustomTemplateCreate={handleCustomTemplateCreate}
                                    selectedTemplate={selectedTemplate}
                                    onToggleFavorite={handleToggleFavorite}
                                    favoriteTemplates={favoriteTemplates}
                                    userTemplates={userTemplates}
                                    communityTemplates={communityTemplates}
                                    onDeleteTemplate={handleDeleteTemplate}
                                />
                            </div>
                        ) : (
                            <div className="flex-1 overflow-auto h-full min-h-0">
                                {renderContent()}
                            </div>
                        )}
                        
                        {showCustomTemplateCreator && (
                            <CustomTemplateCreator
                                onClose={() => setShowCustomTemplateCreator(false)}
                                onSave={handleSaveCustomTemplate}
                                currentUser={currentUser}
                            />
                        )}

                        {showProfileEditor && (
                            <ProfileEditor
                                onClose={() => setShowProfileEditor(false)}
                                onSave={updateUserProfile}
                                currentProfile={userProfile}
                            />
                        )}

                        {showUserSettings && (
                            <UserSettings
                                currentUser={currentUser}
                                onClose={() => setShowUserSettings(false)}
                                onPreferencesUpdate={handlePreferencesUpdate}
                                currentPreferences={userPreferences}
                                onDataExport={() => {
                                    setShowUserSettings(false);
                                    setShowDataExportModal(true);
                                }}
                                onRemoveDuplicates={removeDuplicateSessions}
                                showNotification={showNotification}
                            />
                        )}

                        {showDataExportModal && (
                            <DataExportModal
                                isOpen={showDataExportModal}
                                onClose={() => setShowDataExportModal(false)}
                                onExport={handleDataExport}
                                isLoading={isExporting}
                            />
                        )}

                        {showShareModal && selectedSessionForSharing && (
                            <ShareModal
                                session={selectedSessionForSharing}
                                isOpen={showShareModal}
                                onClose={() => {
                                    setShowShareModal(false);
                                    setSelectedSessionForSharing(null);
                                }}
                                currentUserId={currentUser?.uid || ''}
                            />
                        )}


                </div>
                    </main>
                </div>
    );
};

// --- Sections and Components ---

// --- Auth Section ---
const AuthSection: React.FC<{ 
    setGlobalError: (error: string | null) => void;
    showNotification: (title: string, message: string, type: 'info' | 'success' | 'warning' | 'error', action?: { label: string; onClick: () => void }) => void;
    onShowAccountRequest: () => void;
}> = ({ setGlobalError, showNotification, onShowAccountRequest }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showSignupModal, setShowSignupModal] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setGlobalError(null);

        try {
                await signInWithEmailAndPassword(auth!, email, password);
            // onAuthStateChanged will handle navigation
        } catch (err: any) {
            console.error(err.code, err.message);
            switch (err.code) {
                case 'auth/invalid-email':
                    setError("L'adresse e-mail n'est pas valide.");
                    break;
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                    setError("L'e-mail ou le mot de passe est incorrect.");
                    break;
                default:
                    setError("Une erreur est survenue. Veuillez réessayer.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSignupSuccess = (user: any) => {
        // L'utilisateur est automatiquement connecté après l'inscription
        showNotification(
            'Bienvenue !',
            'Votre compte a été créé avec succès. Vous êtes maintenant connecté.',
            'success'
        );
    };

    return (
        <>
            <div className="p-8 max-w-md mx-auto animate__animated animate__fadeIn">
                <h2 className="text-2xl font-bold text-center text-slate-800 dark:text-white mb-2">Connexion</h2>
                <p className="text-center text-slate-500 dark:text-slate-400 mb-6">Accédez à votre espace d'étude personnel.</p>
                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="relative">
                        <MailIcon className="h-5 w-5 text-slate-400 absolute top-1/2 left-3 -translate-y-1/2" />
                        <input type="email" placeholder="Adresse e-mail" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400" />
                    </div>
                    <div className="relative">
                        <KeyRoundIcon className="h-5 w-5 text-slate-400 absolute top-1/2 left-3 -translate-y-1/2" />
                        <input type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400" />
                    </div>
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                    <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-3 bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-indigo-700 transition-all disabled:bg-slate-400">
                        {loading ? (
                            <>
                                <ElegantSpinner type="wave" size="sm" color="white" />
                                Traitement...
                            </>
                        ) : "Se connecter"}
                    </button>
                </form>
                
                {/* Séparateur */}
                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-300 dark:border-slate-600"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400">ou</span>
                    </div>
                </div>

                {/* Bouton d'inscription */}
                <button 
                    onClick={() => setShowSignupModal(true)}
                    className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-3 px-6 rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all"
                >
                    <UserIcon className="h-5 w-5" />
                    Créer un compte
                </button>

                <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
                    Vous avez déjà un compte ? Connectez-vous ci-dessus.
                </p>
            </div>

            {/* Modal d'inscription */}
            <SignupModal
                isOpen={showSignupModal}
                onClose={() => setShowSignupModal(false)}
                onSignupSuccess={handleSignupSuccess}
                showNotification={showNotification}
            />
        </>
    );
};

// --- Dashboard Section ---
interface DashboardSectionProps {
    sessions: (Session | SessionWithSharing)[];
    onNewGeneration: () => void;
    onOpenSession: (session: Session) => void;
    onDeleteSession: (sessionId: string) => void;
    onShareSession: (session: Session) => void;
    onRenameSession: (sessionId: string, newTitle: string) => void;
    onLogout: () => void;
    currentUser: User;
    userProfile: {firstName?: string, email?: string, hasSeenWelcomeNotification?: boolean} | null;
    userPreferences: UserPreferences;
    onOpenSettings: () => void;
    onImproveSessionNames: () => void;
    onRemoveDuplicates: () => void;
    onSetGenerationType: (type: GenerationInputType) => void;
    onUpdateUserProfile: (firstName: string) => void;
}

const DashboardSection: React.FC<DashboardSectionProps> = ({ 
    sessions, 
    onNewGeneration, 
    onOpenSession, 
    onDeleteSession, 
    onShareSession,
    onRenameSession,
    onLogout, 
    currentUser,
    userProfile,
    userPreferences,
    onOpenSettings,
    onImproveSessionNames,
    onRemoveDuplicates,
    onSetGenerationType,
    onUpdateUserProfile
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [showAllHistory, setShowAllHistory] = useState(false);
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
    const [editingTitle, setEditingTitle] = useState('');
    
    // Calculer les statistiques du tableau de bord
    const dashboardStats = useMemo(() => {
        const now = new Date();
        const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        const recentSessions = sessions.filter(s => new Date(s.createdAt) >= lastWeek);
        const monthlySessions = sessions.filter(s => new Date(s.createdAt) >= lastMonth);
        
        const typeStats = sessions.reduce((acc, session) => {
            acc[session.generationType] = (acc[session.generationType] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        // Sessions inachevées (QCM non terminés, chats courts)
        const incompleteSessions = sessions.filter(session => {
            if (session.generationType === 'qcm') {
                const qcmSession = session as QcmSession;
                return !qcmSession.userAnswers || Object.keys(qcmSession.userAnswers).length === 0;
            }
            if (session.generationType === 'chat') {
                const chatSession = session as ChatSession;
                return chatSession.messages.length <= 2; // Chats avec peu de messages
            }
            if (session.generationType === 'guided_study') {
                const guidedSession = session as GuidedStudySession;
                return guidedSession.currentStep < 3; // Études guidées non terminées
            }
            return false;
        });
        
        // Sessions avec les meilleurs scores
        const topScoringSessions = sessions
            .filter(s => s.generationType === 'qcm')
            .map(s => s as QcmSession)
            .filter(s => s.score > 0)
            .sort((a, b) => {
                const aScore = a.score / a.quizData.questions.length;
                const bScore = b.score / b.quizData.questions.length;
                return bScore - aScore;
            })
            .slice(0, 3);
        
        return {
            totalSessions: sessions.length,
            recentSessions: recentSessions.length,
            monthlySessions: monthlySessions.length,
            typeStats,
            incompleteSessions: incompleteSessions.slice(0, 5), // Top 5 sessions inachevées
            topScoringSessions,
            mostUsedType: Object.entries(typeStats).sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || 'qcm'
        };
    }, [sessions]);
    
    const displaySessions = sessions
        .filter(session => 
            session && session.id && session.title && session.createdAt &&
            (session.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            session.generationType.toLowerCase().includes(searchTerm.toLowerCase()))
        )
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, showAllHistory ? sessions.length : 5);

    const formatGenerationType = (type: string) => {
        return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const SessionIcon = ({ type }: { type: Session['generationType'] }) => {
        const icons: { [key in Session['generationType']]: React.ReactNode } = {
            'qcm': <ClipboardListIcon className="h-6 w-6 text-indigo-500" />,
            'summary': <BookOpenIcon className="h-6 w-6 text-emerald-500" />,
            'chat': <MessageSquareIcon className="h-6 w-6 text-sky-500" />,
            'revision_sheet': <NotebookTextIcon className="h-6 w-6 text-purple-500" />,
            'mind_map': <MindMapIcon className="h-6 w-6 text-orange-500" />,
            'guided_study': <GraduationCapIcon className="h-6 w-6 text-yellow-500" />,
        };
        return <div className="flex-shrink-0 h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center">{icons[type] || null}</div>;
    };

    const getTypeColor = (type: string) => {
        const colors: { [key: string]: string } = {
            'qcm': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
            'summary': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
            'chat': 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200',
            'revision_sheet': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
            'mind_map': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
            'guided_study': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
        };
        return colors[type] || 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200';
    };

    const handleStartRename = (session: Session) => {
        setEditingSessionId(session.id);
        setEditingTitle(session.title);
    };

    const handleSaveRename = async () => {
        if (editingSessionId && editingTitle.trim()) {
            await onRenameSession(editingSessionId, editingTitle.trim());
            setEditingSessionId(null);
            setEditingTitle('');
        }
    };

    const handleCancelRename = () => {
        setEditingSessionId(null);
        setEditingTitle('');
    };

    return (
        <div className="p-4 pt-4 pb-6 animate__animated animate__fadeIn h-full flex flex-col min-h-0" style={{ height: 'calc(100vh - 70px)', minHeight: 'calc(100vh - 70px)' }}>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 sm:gap-4 h-full min-h-0 flex-1" style={{ height: '100%', minHeight: '100%' }}>
                {/* Panneau 1: Statistiques et Vue d'ensemble */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-3 border border-slate-200 dark:border-slate-600 flex flex-col h-full min-h-0">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                                <BrainCircuitIcon className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-800 dark:text-white">Tableau de bord</h2>
                                <div className="flex items-center gap-2">
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Bienvenue, {userProfile?.firstName || 'Utilisateur'} !
                                    </p>
                                    {!userProfile?.firstName && (
                                        <button
                                            onClick={() => {
                                                const firstName = prompt('Entrez votre prénom :');
                                                if (firstName && firstName.trim()) {
                                                    onUpdateUserProfile(firstName.trim());
                                                }
                                            }}
                                            className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 underline"
                                            title="Définir votre prénom"
                                        >
                                            Modifier
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={async () => {
                                    try {
                                        const timestamp = new Date().toISOString().split('T')[0];
                                        const filename = `axonium_dashboard_${timestamp}`;
                                        
                                        await exportService.exportDashboardData(
                                            sessions as Session[],
                                            userPreferences,
                                            [], // templates - à implémenter si nécessaire
                                            userProfile || {},
                                            currentUser.uid,
                                            dashboardStats,
                                            filename
                                        );
                                        
                                        // Notification de succès
                                        if (typeof window !== 'undefined' && (window as any).showNotification) {
                                            (window as any).showNotification(
                                                'Export réussi',
                                                'Votre tableau de bord a été exporté en PDF avec succès.',
                                                'success'
                                            );
                                        }
                                    } catch (error) {
                                        console.error('Erreur lors de l\'export du tableau de bord:', error);
                                        if (typeof window !== 'undefined' && (window as any).showNotification) {
                                            (window as any).showNotification(
                                                'Erreur d\'export',
                                                'Une erreur est survenue lors de l\'export du tableau de bord.',
                                                'error'
                                            );
                                        }
                                    }
                                }}
                                className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                                title="Exporter le tableau de bord en PDF"
                            >
                                <DownloadIcon className="h-4 w-4" />
                                Exporter
                            </button>
                        </div>
                    </div>

                    {/* Statistiques rapides */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-700 dark:to-slate-600 rounded-xl p-3">
                            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                                {dashboardStats.totalSessions}
                            </div>
                            <div className="text-xs text-slate-600 dark:text-slate-300">Créations totales</div>
                        </div>
                        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-slate-700 dark:to-slate-600 rounded-xl p-3">
                            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                {dashboardStats.recentSessions}
                            </div>
                            <div className="text-xs text-slate-600 dark:text-slate-300">Créations cette semaine</div>
                        </div>
                    </div>

                    {/* Types de contenu les plus utilisés */}
                    <div className="mb-6">
                        <h3 className="font-semibold text-slate-800 dark:text-white mb-3 text-sm">Types de contenu</h3>
                        <div className="space-y-2">
                            {Object.entries(dashboardStats.typeStats)
                                .sort(([,a], [,b]) => (b as number) - (a as number))
                                .slice(0, 4)
                                .map(([type, count]) => (
                                    <div key={type} className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                <SessionIcon type={type as Session['generationType']} />
                                <span className="text-sm text-slate-700 dark:text-slate-300">
                                    {type === 'qcm' ? 'QCM' : formatGenerationType(type)}
                                </span>
                            </div>
                                        <span className="text-sm font-semibold text-slate-800 dark:text-white">
                                            {count}
                                        </span>
                                    </div>
                                ))}
                        </div>
                    </div>

                    {/* Suggestions "Reprendre où vous en étiez" */}
                    {dashboardStats.incompleteSessions.length > 0 && (
                        <div className="mb-6">
                            <h3 className="font-semibold text-slate-800 dark:text-white mb-3 text-sm flex items-center gap-2">
                                <RotateCwIcon className="h-4 w-4 text-orange-500" />
                                Reprendre où vous en étiez
                            </h3>
                            <div className="space-y-2">
                                {dashboardStats.incompleteSessions.map((session) => (
                                    <button
                                        key={session.id}
                                        onClick={() => onOpenSession(session)}
                                        className="w-full text-left p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <SessionIcon type={session.generationType} />
                                            <span className="text-sm font-medium text-slate-800 dark:text-white">
                                                {session.title}
                                            </span>
                                        </div>
                                        <div className="text-xs text-slate-600 dark:text-slate-400">
                                            {formatGenerationType(session.generationType)} • 
                                            {new Date(session.createdAt).toLocaleDateString('fr-FR')}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Meilleurs scores */}
                    {dashboardStats.topScoringSessions.length > 0 && (
                        <div className="mb-6">
                            <h3 className="font-semibold text-slate-800 dark:text-white mb-3 text-sm flex items-center gap-2">
                                <CheckCircleIcon className="h-4 w-4 text-green-500" />
                                Meilleurs scores
                            </h3>
                            <div className="space-y-2">
                                {dashboardStats.topScoringSessions.map((session) => {
                                    const scorePercentage = Math.round((session.score / session.quizData.questions.length) * 100);
                                    return (
                                        <div key={session.id} className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                                            <div className="flex items-center gap-2 mb-1">
                                                <SessionIcon type={session.generationType} />
                                                <span className="text-sm font-medium text-slate-800 dark:text-white">
                                                    {session.title}
                                                </span>
                                            </div>
                                            <div className="text-xs text-slate-600 dark:text-slate-400">
                                                Score: {session.score}/{session.quizData.questions.length} ({scorePercentage}%)
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Panneau 2: Créations récentes */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-3 border border-slate-200 dark:border-slate-600 flex flex-col h-full min-h-0">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                            <HistoryIcon className="h-5 w-5 text-indigo-500" />
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Créations récentes</h2>
                        </div>
                        {sessions.length > 3 && (
                            <button
                                onClick={() => setShowAllHistory(!showAllHistory)}
                                className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium text-sm"
                            >
                                {showAllHistory ? 'Voir moins' : `Voir tout (${sessions.length})`}
                            </button>
                        )}
                    </div>

                    {/* Search */}
                    {sessions.length > 0 && (
                        <div className="relative mb-4">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                <SearchIcon className="h-4 w-4 text-slate-400" />
                            </span>
                            <input
                                type="search"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Rechercher dans vos créations..."
                                className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow duration-200"
                            />
                        </div>
                    )}

                    {/* Sessions List */}
                    {sessions.length > 0 ? (
                        <div className="space-y-2 flex-1 overflow-y-auto min-h-0 h-full">
                            {displaySessions.map((session, index) => {
                                return (
                                    <div
                                        key={session.id}
                                        onClick={() => onOpenSession(session)}
                                        className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl hover:shadow-md hover:border-indigo-300 cursor-pointer transition-all"
                                        style={{ 
                                            minHeight: '80px', 
                                            opacity: 1, 
                                            visibility: 'visible',
                                            display: 'flex',
                                            position: 'relative',
                                            zIndex: 1
                                        }}
                                    >
                                        <SessionIcon type={session.generationType} />
                                        <div className="flex-grow">
                                            <div className="flex items-center gap-2">
                                                {editingSessionId === session.id ? (
                                                    <div 
                                                        className="flex items-center gap-2 flex-1"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <input
                                                            type="text"
                                                            value={editingTitle}
                                                            onChange={(e) => setEditingTitle(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    handleSaveRename();
                                                                } else if (e.key === 'Escape') {
                                                                    handleCancelRename();
                                                                }
                                                            }}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="flex-1 px-2 py-1 text-sm font-bold text-slate-800 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                            autoFocus
                                                        />
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleSaveRename();
                                                            }}
                                                            className="p-1 text-green-600 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-900 rounded"
                                                            title="Sauvegarder"
                                                        >
                                                            <CheckCircleIcon className="h-3 w-3" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleCancelRename();
                                                            }}
                                                            className="p-1 text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                                                            title="Annuler"
                                                        >
                                                            <XIcon className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <h3 className="font-bold text-slate-800 dark:text-slate-300 leading-tight text-sm">{session.title}</h3>
                                                        {(session as any).isShared === true && (
                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                                                                <Share2Icon className="h-2.5 w-2.5 mr-1" />
                                                                Partagé
                                                            </span>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                {new Date(session.createdAt).toLocaleDateString('fr-FR', { 
                                                    day: 'numeric', 
                                                    month: 'long',
                                                    year: 'numeric'
                                                })} - {formatGenerationType(session.generationType)}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onShareSession(session);
                                                }}
                                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-900 rounded-full transition-colors duration-200"
                                                aria-label="Partager la session"
                                            >
                                                <Share2Icon className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleStartRename(session);
                                                }}
                                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-full transition-colors duration-200"
                                                aria-label="Renommer la session"
                                            >
                                                <PenIcon className="h-4 w-4" />
                                            </button>
                                            {(session as any).isShared === true ? (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDeleteSession(session.id);
                                                    }}
                                                    className="p-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-100 dark:hover:bg-orange-900 rounded-full transition-colors duration-200"
                                                    title="Retirer de l'historique local"
                                                >
                                                    <Trash2Icon className="h-4 w-4" />
                                                </button>
                                            ) : (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDeleteSession(session.id);
                                                }}
                                                className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded-full transition-colors duration-200"
                                                aria-label="Supprimer la session"
                                            >
                                                <Trash2Icon className="h-4 w-4" />
                                            </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-8 border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-lg">
                            <LayersIcon className="mx-auto h-8 w-8 text-slate-400" />
                            <h3 className="mt-2 text-base font-medium text-slate-800 dark:text-white">
                                {sessions.length === 0 ? 'Aucune création trouvée' : 'Aucun résultat de recherche'}
                            </h3>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                {sessions.length === 0 ? 'Commencez par générer votre premier contenu' : 'Essayez avec d\'autres termes'}
                            </p>
                        </div>
                    )}
                </div>

                {/* Panneau 3: Génération de Contenu */}
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-700 dark:to-slate-600 rounded-2xl shadow-lg p-3 border border-indigo-200 dark:border-slate-600 flex flex-col h-full min-h-0">
                    <div className="text-center mb-4">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-3">Génération de Contenu</h2>
                        <button
                            onClick={onNewGeneration}
                            className="inline-flex items-center gap-2 bg-indigo-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 button-animate"
                        >
                            <SparklesIcon className="h-6 w-6" />
                            Générer du contenu
                        </button>

                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Créez des QCM, résumés, fiches et plus encore</p>
                    </div>

                    {/* Options de personnalisation rapide */}
                    <div className="space-y-3 flex-1 min-h-0">
                        <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-indigo-100 dark:border-slate-600">
                            <h3 className="font-semibold text-slate-800 dark:text-white mb-2 text-sm">Options rapides</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <button 
                                    onClick={() => {
                                        onSetGenerationType('qcm');
                                        onNewGeneration();
                                    }}
                                    className="flex items-center gap-2 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 hover:border-indigo-300 dark:hover:border-indigo-500 transition-all text-left"
                                >
                                    <ClipboardListIcon className="h-5 w-5 text-indigo-500" />
                                    <div>
                                        <div className="font-medium text-slate-800 dark:text-white text-sm">QCM</div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400">Questions à choix multiples</div>
                                    </div>
                                </button>
                                
                                <button 
                                    onClick={() => {
                                        onSetGenerationType('summary');
                                        onNewGeneration();
                                    }}
                                    className="flex items-center gap-2 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 hover:border-indigo-300 dark:hover:border-indigo-500 transition-all text-left"
                                >
                                    <BookOpenIcon className="h-5 w-5 text-emerald-500" />
                                    <div>
                                        <div className="font-medium text-slate-800 dark:text-white text-sm">Résumé</div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400">Synthèse du contenu</div>
                                    </div>
                                </button>
                                
                                <button 
                                    onClick={() => {
                                        onSetGenerationType('revision_sheet');
                                        onNewGeneration();
                                    }}
                                    className="flex items-center gap-2 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 hover:border-indigo-300 dark:hover:border-indigo-500 transition-all text-left"
                                >
                                    <NotebookTextIcon className="h-5 w-5 text-purple-500" />
                                    <div>
                                        <div className="font-medium text-slate-800 dark:text-white text-sm">Fiche de révision</div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400">Résumé structuré</div>
                                    </div>
                                </button>
                                
                                <button 
                                    onClick={() => {
                                        onSetGenerationType('mind_map');
                                        onNewGeneration();
                                    }}
                                    className="flex items-center gap-2 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 hover:border-indigo-300 dark:hover:border-indigo-500 transition-all text-left"
                                >
                                    <MindMapIcon className="h-5 w-5 text-orange-500" />
                                    <div>
                                        <div className="font-medium text-slate-800 dark:text-white text-sm">Carte mentale</div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400">Organisation visuelle</div>
                                    </div>
                                </button>
                                
                                <button 
                                    onClick={() => {
                                        onSetGenerationType('chat');
                                        onNewGeneration();
                                    }}
                                    className="flex items-center gap-2 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 hover:border-indigo-300 dark:hover:border-indigo-500 transition-all text-left"
                                >
                                    <MessageSquareIcon className="h-5 w-5 text-sky-500" />
                                    <div>
                                        <div className="font-medium text-slate-800 dark:text-white text-sm">Chat</div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400">Discussion interactive</div>
                                    </div>
                                </button>
                                
                                <button 
                                    onClick={() => {
                                        onSetGenerationType('guided_study');
                                        onNewGeneration();
                                    }}
                                    className="flex items-center gap-2 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 hover:border-indigo-300 dark:hover:border-indigo-500 transition-all text-left"
                                >
                                    <GraduationCapIcon className="h-5 w-5 text-yellow-500" />
                                    <div>
                                        <div className="font-medium text-slate-800 dark:text-white text-sm">Étude guidée</div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400">Parcours complet</div>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Suggestions basées sur l'utilisation */}
                        {dashboardStats.mostUsedType && (
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-3 border border-blue-200 dark:border-blue-700">
                                <h3 className="font-semibold text-slate-800 dark:text-white mb-2 text-sm flex items-center gap-2">
                                    <InfoIcon className="h-4 w-4 text-blue-500" />
                                    Suggestion
                                </h3>
                                <p className="text-xs text-slate-600 dark:text-slate-300 mb-2">
                                    Vous utilisez souvent les {formatGenerationType(dashboardStats.mostUsedType).toLowerCase()}s. 
                                    Essayez de créer un {dashboardStats.mostUsedType === 'qcm' ? 'résumé' : dashboardStats.mostUsedType === 'summary' ? 'QCM' : 'résumé'} pour varier vos méthodes d'apprentissage !
                                </p>
                                <button 
                                    onClick={() => {
                                        // Définir le type suggéré basé sur le type le plus utilisé
                                        const suggestedType = dashboardStats.mostUsedType === 'qcm' ? 'summary' : 
                                                           dashboardStats.mostUsedType === 'summary' ? 'qcm' : 'summary';
                                        onSetGenerationType(suggestedType);
                                        onNewGeneration();
                                    }}
                                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                                >
                                    Créer maintenant →
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- History Section ---
interface HistorySectionProps { sessions: (Session | SessionWithSharing)[]; onNewSession: () => void; onOpenSession: (session: Session) => void; onDeleteSession: (sessionId: string) => void; onShareSession: (session: Session) => void; searchTerm: string; onSearchChange: (term: string) => void; }
const HistorySection: React.FC<HistorySectionProps> = ({ sessions, onNewSession, onOpenSession, onDeleteSession, onShareSession, searchTerm, onSearchChange }) => {
    // Fonction helper pour formater le type de génération
    const formatGenerationType = (type: string) => {
        return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const SessionIcon = ({ type }: { type: Session['generationType'] }) => {
        const icons: { [key in Session['generationType']]: React.ReactNode } = {
            'qcm': <ClipboardListIcon className="h-6 w-6 text-indigo-500" />,
            'summary': <BookOpenIcon className="h-6 w-6 text-emerald-500" />,
            'chat': <MessageSquareIcon className="h-6 w-6 text-sky-500" />,
            'revision_sheet': <NotebookTextIcon className="h-6 w-6 text-purple-500" />,
            'mind_map': <MindMapIcon className="h-6 w-6 text-orange-500" />,
            'guided_study': <GraduationCapIcon className="h-6 w-6 text-yellow-500" />,
        };
        return <div className="flex-shrink-0 h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center">{icons[type] || null}</div>;
    };
    return (
                    <div className="p-4 sm:p-6 lg:p-8 animate__animated animate__fadeIn">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-4 sm:mb-6 gap-4">
                    <div className="flex items-center gap-3">
                        <BookOpenIcon className="h-6 w-6 sm:h-8 sm:w-8 text-indigo-500" />
                        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-800">Études</h2>
                    </div>
                    <button onClick={onNewSession} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-all duration-300 shadow-sm hover:shadow-md">
                    <PlusIcon className="h-5 w-5" />Créer
                </button>
            </div>
             <div className="relative mb-6">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3"><SearchIcon className="h-5 w-5 text-slate-400" /></span>
                <input type="search" value={searchTerm} onChange={(e) => onSearchChange(e.target.value)} placeholder="Rechercher par titre ou contenu..." className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow duration-200" aria-label="Rechercher une session"/>
            </div>
            {sessions.length > 0 ? (
                <ul className="space-y-3">
                    {sessions.filter(session => session && session.id).map(session => (
                        <li key={session.id} onClick={() => onOpenSession(session)} className="bg-slate-50 border border-slate-200 rounded-xl p-4 transition-all hover:shadow-md hover:border-indigo-300 cursor-pointer">
                            <div className="flex items-center gap-4">
                                <SessionIcon type={session.generationType} />
                                <div className="flex-grow">
                                    <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-slate-800 leading-tight">{session.title}</h3>
                                        {(session as any).isShared === true && (
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                                                <Share2Icon className="h-3 w-3 mr-1" />
                                                Partagé
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-500">
                                        {new Date(session.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} - {formatGenerationType(session.generationType)}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <button onClick={(e) => { e.stopPropagation(); onShareSession(session); }} aria-label="Partager la session" className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-100 rounded-full transition-colors duration-200">
                                        <Share2Icon className="h-5 w-5" />
                                    </button>
                                    {(session as any).isShared === true ? (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id); }} 
                                            aria-label="Retirer de l'historique local" 
                                            className="p-2 text-slate-500 hover:text-orange-600 hover:bg-orange-100 rounded-full transition-colors duration-200"
                                            title="Retirer de l'historique local"
                                        >
                                            <Trash2Icon className="h-5 w-5" />
                                        </button>
                                    ) : (
                                    <button onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id); }} aria-label="Supprimer la session" className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-100 rounded-full transition-colors duration-200">
                                        <Trash2Icon className="h-5 w-5" />
                                    </button>
                                    )}
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg">
                    <LayersIcon className="mx-auto h-12 w-12 text-slate-400" />
                    <h3 className="mt-2 text-lg font-medium text-slate-800">Aucune session trouvée</h3>
                    <p className="mt-1 text-sm text-slate-500">Créez votre première session pour commencer.</p>
                </div>
            )}
        </div>
    );
};

// --- Document Input Section ---
interface DocumentInputSectionProps { 
    text: string; 
    setText: (text: string) => void; 
    onGenerate: () => void; 
    onPdfChange: (e: React.ChangeEvent<HTMLInputElement>) => void; 
    onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void; 
    isProcessing: boolean; 
    processingMessage: string; 
    error: string | null; 
    setError: (error: string | null) => void; 
    numQuestions: number; 
    setNumQuestions: (n: number) => void; 
    difficulty: Difficulty; 
    setDifficulty: (d: Difficulty) => void; 
    generationType: GenerationInputType; 
    setGenerationType: (t: GenerationInputType) => void; 
    onBack?: () => void;
    onBackToMain?: () => void;
    selectedTemplate?: Template | null;
    onTemplateSelect: (template: Template) => void;
    onShowTemplateSelector: () => void;
    userPreferences: UserPreferences;
    onOpenDocumentSelector?: () => void;
    selectedDocument?: Document | null;
    onClearSelectedDocument?: () => void;
    showDocumentLibrary?: boolean;
    onToggleDocumentLibrary?: () => void;
}
const DocumentInputSection: React.FC<DocumentInputSectionProps> = ({ text, setText, onGenerate, onPdfChange, onImageChange, isProcessing, processingMessage, error, setError, numQuestions, setNumQuestions, difficulty, setDifficulty, generationType, setGenerationType, onBack, onBackToMain, selectedTemplate, onTemplateSelect, onShowTemplateSelector, userPreferences, onOpenDocumentSelector, selectedDocument, onClearSelectedDocument, showDocumentLibrary, onToggleDocumentLibrary }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);

    const generationOptions = [
        { id: 'qcm', name: 'QCM', icon: ClipboardListIcon },
        { id: 'summary', name: 'Résumé', icon: BookOpenIcon },
        { id: 'revision_sheet', name: 'Fiche de révision', icon: NotebookTextIcon },
        { id: 'mind_map', name: 'Carte mentale', icon: MindMapIcon },
        { id: 'chat', name: 'Chat interactif', icon: MessageSquareIcon },
        { id: 'guided_study', name: 'Étude guidée', icon: GraduationCapIcon },
    ];
    
    return (
        <div className="p-4 sm:p-6 lg:p-8 animate__animated animate__fadeIn">
            {/* En-tête */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-800">Générer du contenu</h2>
                <div className="flex items-center gap-3">
                    {onBack && (
                        <button 
                            onClick={onBack} 
                            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border border-slate-300"
                        >
                            <ArrowLeftIcon className="h-5 w-5" />
                            Retour à l'historique
                        </button>
                    )}
                    {onBackToMain && (
                        <button 
                            onClick={onBackToMain} 
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition-colors"
                        >
                            <HomeIcon className="h-5 w-5" />
                            Menu principal
                        </button>
                    )}
                </div>
            </div>
            
            {/* Messages d'erreur */}
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-6" role="alert">
                    <span className="block sm:inline">{error}</span>
                    <span className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setError(null)}>
                        <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
                    </span>
                </div>
            )}
            
            {/* Options d'import */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-3 w-full bg-white border-2 border-dashed border-slate-300 rounded-lg p-6 text-slate-600 hover:border-indigo-500 hover:text-indigo-600 transition-colors duration-200">
                    <UploadCloudIcon className="h-8 w-8"/> 
                    <div className="text-left">
                        <h3 className="font-bold">Importer un PDF</h3>
                        <p className="text-sm">Extraction de texte automatique</p>
                    </div> 
                    <input type="file" ref={fileInputRef} onChange={onPdfChange} accept="application/pdf" className="hidden"/>
                </button>
                <button onClick={() => imageInputRef.current?.click()} className="flex items-center justify-center gap-3 w-full bg-white border-2 border-dashed border-slate-300 rounded-lg p-6 text-slate-600 hover:border-indigo-500 hover:text-indigo-600 transition-colors duration-200">
                    <ImageIcon className="h-8 w-8"/> 
                    <div className="text-left">
                        <h3 className="font-bold">Importer une Image</h3>
                        <p className="text-sm">Extrait le texte d'une photo</p>
                    </div> 
                    <input type="file" ref={imageInputRef} onChange={onImageChange} accept="image/png, image/jpeg, image/webp" className="hidden"/>
                </button>
                {onOpenDocumentSelector && (
                    <button onClick={onOpenDocumentSelector} className="flex items-center justify-center gap-3 w-full bg-white border-2 border-dashed border-slate-300 rounded-lg p-6 text-slate-600 hover:border-indigo-500 hover:text-indigo-600 transition-colors duration-200">
                        <BookOpenIcon className="h-8 w-8"/> 
                        <div className="text-left">
                            <h3 className="font-bold">Bibliothèque</h3>
                            <p className="text-sm">Sélectionner un document</p>
                        </div>
                    </button>
                )}
            </div>

            {/* Contrôles de la bibliothèque */}
            {onToggleDocumentLibrary && (
                <div className="mb-6">
                    <button 
                        onClick={onToggleDocumentLibrary}
                        className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                            showDocumentLibrary 
                                ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                        }`}
                    >
                        <BookOpenIcon className="h-5 w-5" />
                        <span>
                            {showDocumentLibrary ? 'Masquer la bibliothèque' : 'Afficher la bibliothèque de documents'}
                        </span>
                    </button>
                </div>
            )}

            {/* Document sélectionné */}
            {selectedDocument && (
                <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <BookOpenIcon className="h-6 w-6 text-indigo-600" />
                            <div>
                                <h3 className="font-medium text-indigo-800">Document sélectionné: {selectedDocument.name}</h3>
                                <p className="text-sm text-indigo-600">
                                    {(selectedDocument.size / 1024 / 1024).toFixed(1)} MB • {selectedDocument.type.toUpperCase()}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                onClearSelectedDocument?.();
                                setText('');
                            }}
                            className="text-indigo-600 hover:text-indigo-800"
                            title="Supprimer le document"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            {/* Section Bibliothèque de Documents */}
            {showDocumentLibrary && onOpenDocumentSelector && (
                <div className="mb-8">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Bibliothèque de Documents
                            </h3>
                        </div>
                        <div className="p-6">
                            <DocumentLibrary
                                onDocumentSelect={(document) => {
                                    documentService.processDocument(document).then(result => {
                                        setText(result.text);
                                        onClearSelectedDocument?.();
                                    }).catch(error => {
                                        setError('Erreur lors du traitement du document');
                                        console.error('Erreur de traitement:', error);
                                    });
                                }}
                                className="h-[600px]"
                                showUploader={false}
                                onUploaderToggle={(show) => {
                                    console.log('Toggle uploader appelé avec:', show);
                                    // Afficher une notification pour confirmer que le bouton fonctionne
                                    if (show) {
                                        alert('Fonctionnalité d\'ajout de documents - En cours de développement !');
                                    }
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}
            
            {/* Section Saisie de Texte */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Saisie de Texte
                    </h3>
                </div>
                <div className="p-6">
                    <textarea 
                        value={text} 
                        onChange={(e) => setText(e.target.value)} 
                        placeholder="Ou collez votre texte ici... (minimum 100 caractères)" 
                        className="w-full h-48 p-4 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow duration-200 dark:bg-gray-700 dark:text-white resize-none" 
                        minLength={100} 
                        required 
                        disabled={isProcessing} 
                        aria-label="Zone de saisie de texte"
                    />
                </div>
            </div>

            <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-slate-800">1. Choisissez le type de contenu à générer :</h3>
                    <button
                        onClick={onShowTemplateSelector}
                        className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all text-sm"
                    >
                        <SparklesIcon className="h-4 w-4" />
                        <span>Templates</span>
                    </button>
                </div>
                
                {selectedTemplate && (
                    <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <SparklesIcon className="h-4 w-4 text-indigo-600" />
                                <span className="font-medium text-indigo-800">Template: {selectedTemplate.name}</span>
                            </div>
                            <button
                                onClick={() => onTemplateSelect(selectedTemplate)}
                                className="text-sm text-indigo-600 hover:text-indigo-800"
                            >
                                Changer
                            </button>
                        </div>
                    </div>
                )}
                
                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                            {generationOptions.map(opt => (
                                <button key={opt.id} onClick={() => setGenerationType(opt.id as GenerationInputType)} className={`flex flex-col items-center justify-center text-center p-3 rounded-lg border-2 transition-all duration-200 h-full ${generationType === opt.id ? 'bg-indigo-100 border-indigo-500' : 'bg-white border-slate-200 hover:border-slate-400'}`}>
                                    <opt.icon className={`h-6 w-6 mb-1 ${generationType === opt.id ? 'text-indigo-600' : 'text-slate-500'}`} />
                                    <span className={`text-xs font-semibold ${generationType === opt.id ? 'text-indigo-700' : 'text-slate-600'}`}>{opt.name}</span>
                                </button>
                            ))}
                        </div>
            </div>

            {(generationType === 'qcm' || generationType === 'guided_study') && (
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6 animate__animated animate__fadeIn">
                    <h3 className="font-bold text-slate-800 mb-3">2. Personnalisez votre QCM :</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="numQuestions" className="block text-sm font-medium text-slate-700 mb-1">Nombre de questions</label>
                            <input id="numQuestions" type="number" value={numQuestions} onChange={(e) => setNumQuestions(Math.max(1, parseInt(e.target.value)))} min="1" max="20" className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"/>
                        </div>
                        <div>
                            <label htmlFor="difficulty" className="block text-sm font-medium text-slate-700 mb-1">Difficulté</label>
                            <select id="difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                                <option>Facile</option><option>Moyen</option><option>Difficile</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}

            <button onClick={onGenerate} disabled={isProcessing || text.trim().length < 100} className="w-full flex items-center justify-center gap-3 bg-indigo-600 text-white font-extrabold py-4 px-6 rounded-lg hover:bg-indigo-700 transition-all duration-300 disabled:bg-slate-400 disabled:cursor-not-allowed text-lg shadow-sm hover:shadow-lg">
                {isProcessing ? (
                    <>
                        <ElegantSpinner type="wave" size="sm" color="white" />
                        Traitement...
                    </>
                ) : (
                    <><SparklesIcon className="h-6 w-6" />Générer</>
                )}
            </button>
        </div>
    );
};

// --- Summary Display Section ---
const SummaryDisplaySection: React.FC<{ summary: string; onExit: () => void }> = ({ summary, onExit }) => {
    const formatSummary = (text: string) => {
        return text.split('\\* ').join('<li>').split('\\n').join('<br/>');
    };
    
    return (
    <div className="p-6 sm:p-8 animate__animated animate__fadeInUp">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-800 flex items-center gap-3"><BookOpenIcon className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-500"/>Résumé du document</h2>
            <button onClick={onExit} className="bg-slate-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-700 transition-colors">Retour</button>
        </div>
        <div className="prose prose-slate max-w-none bg-slate-50 p-4 sm:p-6 rounded-lg border" dangerouslySetInnerHTML={{ __html: formatSummary(summary) }}></div>
    </div>
);
};

// --- Revision Sheet Display Section ---
const RevisionSheetDisplaySection: React.FC<{ revisionSheetData: RevisionSheetData; onExit: () => void; onExport: () => void }> = ({ revisionSheetData, onExit, onExport }) => (
    <div className="p-6 sm:p-8 animate__animated animate__fadeInUp">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 flex items-center gap-3"><NotebookTextIcon className="h-8 w-8 text-purple-500"/>Fiche de Révision</h2>
            <div className="flex gap-2">
                <button onClick={onExport} className="flex items-center gap-2 bg-white text-indigo-600 font-semibold py-2 px-4 rounded-lg border border-slate-300 hover:bg-indigo-50 transition-colors"><DownloadIcon className="h-5 w-5"/> Exporter en PDF</button>
                <button onClick={onExit} className="bg-slate-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-700 transition-colors">Retour</button>
            </div>
        </div>
        <div className="space-y-6">
            <section>
                <h3 className="font-bold text-xl text-slate-700 border-b-2 border-purple-200 pb-2 mb-3">Résumé Approfondi</h3>
                <p className="text-slate-600 whitespace-pre-wrap">{revisionSheetData.summary}</p>
            </section>
            <section>
                <h3 className="font-bold text-xl text-slate-700 border-b-2 border-purple-200 pb-2 mb-3">Concepts Clés</h3>
                <ul className="space-y-3">
                    {revisionSheetData.keyConcepts.map((concept, i) => <li key={i} className="bg-purple-50 p-3 rounded-lg"><strong className="text-purple-800">{concept.term}:</strong> {concept.definition}</li>)}
                </ul>
            </section>
            <section>
                <h3 className="font-bold text-xl text-slate-700 border-b-2 border-purple-200 pb-2 mb-3">Grandes Idées & Thématiques</h3>
                <ul className="list-disc list-inside space-y-2 text-slate-600">
                    {revisionSheetData.mainIdeas.map((idea, i) => <li key={i}>{idea}</li>)}
                </ul>
            </section>
            <section>
                <h3 className="font-bold text-xl text-slate-700 border-b-2 border-purple-200 pb-2 mb-3">Questions de Réflexion</h3>
                 <ul className="list-decimal list-inside space-y-2 text-slate-600">
                    {revisionSheetData.reflectionQuestions.map((q, i) => <li key={i}>{q}</li>)}
                </ul>
            </section>
        </div>
    </div>
);

// --- Mind Map Display Section ---
const MindMapDisplaySection: React.FC<{ mindMapData: MindMapData; onExit: () => void; }> = ({ mindMapData, onExit }) => {
    const mindMapContainerRef = useRef<HTMLDivElement>(null);
    const [layout, setLayout] = useState<{
        nodes: (any & { id: string; title: string; x: number; y: number; width: number; height: number; type: string; colorIndex?: number })[];
        lines: { d: string; color: string }[];
        width: number;
        height: number;
    } | null>(null);
    const nodeRefs = useRef<{ [key: string]: HTMLDivElement }>({});

    const [isDownloading, setIsDownloading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const allNodesForMeasuring = useMemo(() => {
        const nodes: { id: string, title: string, type: 'central' | 'main' | 'child', colorIndex?: number }[] = [];
        nodes.push({ id: 'central', title: mindMapData.centralTopic, type: 'central' });
        mindMapData.mainNodes.forEach((mn, i) => {
            nodes.push({ id: `main_${i}`, title: mn.title, type: 'main', colorIndex: i });
            (mn.children || []).forEach((cn, j) => {
                nodes.push({ id: `child_${i}_${j}`, title: cn.title, type: 'child', colorIndex: i });
            });
        });
        return nodes;
    }, [mindMapData]);

    useLayoutEffect(() => {
        const measurements: { [key: string]: { width: number; height: number } } = {};
        let allRefsReady = true;
        allNodesForMeasuring.forEach(node => {
            const elem = nodeRefs.current[node.id];
            if (elem) {
                measurements[node.id] = { width: elem.offsetWidth, height: elem.offsetHeight };
            } else {
                allRefsReady = false;
            }
        });

        if (!allRefsReady || Object.keys(nodeRefs.current).length !== allNodesForMeasuring.length) return;

        const PADDING = 60;
        const NODE_H_GAP = 50;
        const PARENT_V_GAP = 60;
        const CHILD_V_GAP = 20;
        const CHILD_H_INDENT = 30;

        const centralMeasure = measurements['central'];
        if (!centralMeasure) return;

        let leftColumnHeight = 0;
        let rightColumnHeight = 0;
        let maxLeftWidth = 0;
        let maxRightWidth = 0;

        const mainNodeMeasures = mindMapData.mainNodes.map((mn, i) => {
            const mainMeasure = measurements[`main_${i}`];
            const childMeasures = (mn.children || []).map((_, j) => measurements[`child_${i}_${j}`]);
            const childrenHeight = childMeasures.reduce((sum, cm) => sum + (cm?.height ?? 0) + CHILD_V_GAP, 0) - (childMeasures.length > 0 ? CHILD_V_GAP : 0);
            const branchHeight = (mainMeasure?.height ?? 0) + (childrenHeight > 0 ? PARENT_V_GAP + childrenHeight : 0);
            
            const childrenMaxWidth = Math.max(0, ...childMeasures.map(cm => cm?.width ?? 0));
            const branchWidth = Math.max((mainMeasure?.width ?? 0), CHILD_H_INDENT + childrenMaxWidth);

            return { branchHeight, branchWidth, mainMeasure, childMeasures };
        });

        const leftNodes: number[] = [];
        const rightNodes: number[] = [];
        mainNodeMeasures.forEach((_, i) => {
            if (leftColumnHeight <= rightColumnHeight) {
                leftColumnHeight += mainNodeMeasures[i].branchHeight + PARENT_V_GAP;
                maxLeftWidth = Math.max(maxLeftWidth, mainNodeMeasures[i].branchWidth);
                leftNodes.push(i);
            } else {
                rightColumnHeight += mainNodeMeasures[i].branchHeight + PARENT_V_GAP;
                maxRightWidth = Math.max(maxRightWidth, mainNodeMeasures[i].branchWidth);
                rightNodes.push(i);
            }
        });
        
        const totalHeight = Math.max(leftColumnHeight, rightColumnHeight, centralMeasure.height) + PADDING * 2;
        const centralX = maxLeftWidth + NODE_H_GAP + PADDING;
        const totalWidth = maxLeftWidth + NODE_H_GAP + centralMeasure.width + NODE_H_GAP + maxRightWidth + PADDING * 2;
        const centralY = totalHeight / 2;

        const finalNodes: (any & { id: string; title: string; x: number; y: number; width: number; height: number; type: string; colorIndex?: number })[] = [];
        const finalLines: { d: string; color: string }[] = [];
        const colors = ['#4f46e5', '#10b981', '#f97316', '#3b82f6', '#8b5cf6', '#ec4899', '#d946ef'];
        
        finalNodes.push({
            id: 'central', title: mindMapData.centralTopic, type: 'central',
            x: centralX, y: centralY - centralMeasure.height / 2,
            width: centralMeasure.width, height: centralMeasure.height
        });

        let currentYLeft = (totalHeight - (leftColumnHeight - PARENT_V_GAP)) / 2;
        leftNodes.forEach(i => {
            const { branchWidth, mainMeasure, childMeasures } = mainNodeMeasures[i];
            const color = colors[i % colors.length];

            const mainX = centralX - NODE_H_GAP - branchWidth;
            const mainY = currentYLeft;
            finalNodes.push({
                id: `main_${i}`, title: mindMapData.mainNodes[i].title, type: 'main', colorIndex: i,
                x: mainX, y: mainY, width: mainMeasure.width, height: mainMeasure.height
            });
            finalLines.push({ d: `M ${mainX + mainMeasure.width} ${mainY + mainMeasure.height / 2} Q ${centralX - NODE_H_GAP / 2} ${mainY + mainMeasure.height / 2}, ${centralX} ${centralY}`, color });

            let childY = mainY + mainMeasure.height + PARENT_V_GAP;
            (mindMapData.mainNodes[i].children || []).forEach((cn, j) => {
                const childMeasure = childMeasures[j];
                const childX = mainX + CHILD_H_INDENT;
                finalNodes.push({
                    id: `child_${i}_${j}`, title: cn.title, type: 'child', colorIndex: i,
                    x: childX, y: childY, width: childMeasure.width, height: childMeasure.height
                });
                 finalLines.push({ 
                    d: `M ${childX + childMeasure.width / 2} ${childY} C ${childX + childMeasure.width / 2} ${mainY + mainMeasure.height}, ${mainX + mainMeasure.width / 2} ${childY}, ${mainX + mainMeasure.width / 2} ${mainY + mainMeasure.height}`, 
                    color 
                });
                childY += childMeasure.height + CHILD_V_GAP;
            });
            currentYLeft += mainNodeMeasures[i].branchHeight + PARENT_V_GAP;
        });
        
        let currentYRight = (totalHeight - (rightColumnHeight - PARENT_V_GAP)) / 2;
        rightNodes.forEach(i => {
            const { mainMeasure, childMeasures } = mainNodeMeasures[i];
            const color = colors[i % colors.length];

            const mainX = centralX + centralMeasure.width + NODE_H_GAP;
            const mainY = currentYRight;
            finalNodes.push({
                id: `main_${i}`, title: mindMapData.mainNodes[i].title, type: 'main', colorIndex: i,
                x: mainX, y: mainY, width: mainMeasure.width, height: mainMeasure.height
            });
            finalLines.push({ d: `M ${mainX} ${mainY + mainMeasure.height / 2} Q ${centralX + centralMeasure.width + NODE_H_GAP / 2} ${mainY + mainMeasure.height / 2}, ${centralX + centralMeasure.width} ${centralY}`, color });
            
            let childY = mainY + mainMeasure.height + PARENT_V_GAP;
            (mindMapData.mainNodes[i].children || []).forEach((cn, j) => {
                const childMeasure = childMeasures[j];
                const childX = mainX + CHILD_H_INDENT;
                finalNodes.push({
                    id: `child_${i}_${j}`, title: cn.title, type: 'child', colorIndex: i,
                    x: childX, y: childY, width: childMeasure.width, height: childMeasure.height
                });
                finalLines.push({ 
                    d: `M ${childX + childMeasure.width / 2} ${childY} C ${childX + childMeasure.width / 2} ${mainY + mainMeasure.height}, ${mainX + mainMeasure.width / 2} ${childY}, ${mainX + mainMeasure.width / 2} ${mainY + mainMeasure.height}`, 
                    color 
                });
                childY += childMeasure.height + CHILD_V_GAP;
            });
            currentYRight += mainNodeMeasures[i].branchHeight + PARENT_V_GAP;
        });

        setLayout({ nodes: finalNodes, lines: finalLines, width: totalWidth, height: totalHeight });

    }, [mindMapData, allNodesForMeasuring]);

    const handleExportMindMap = async () => {
        if (!mindMapContainerRef.current) {
            setError("Le conteneur de la carte mentale n'est pas prêt.");
            return;
        }
        setError(null);
        setIsDownloading(true);
        try {
            // Temporarily remove box-shadow for cleaner export
            const nodesInCanvas = mindMapContainerRef.current.querySelectorAll('div > div');
            nodesInCanvas.forEach((node: any) => node.style.boxShadow = 'none');

            const canvas = await html2canvas(mindMapContainerRef.current, {
                backgroundColor: '#f8fafc',
                scale: 2,
                useCORS: true,
            });

            // Restore box-shadow after capture
            nodesInCanvas.forEach((node: any) => node.style.boxShadow = '');

            const image = canvas.toDataURL('image/png', 1.0);
            const a = document.createElement('a');
            a.href = image;
            a.download = `Carte_Mentale_${mindMapData.centralTopic.split(' ').join('_')}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (err) {
            console.error("Erreur d'exportation de la carte mentale:", err);
            setError("Une erreur est survenue lors de la création de l'image.");
        } finally {
            setIsDownloading(false);
        }
    };
    
    return (
        <div className="p-4 sm:p-6 bg-slate-50 animate__animated animate__fadeIn">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 flex items-center gap-3">
                    <MindMapIcon className="h-8 w-8 text-orange-500"/>Carte Mentale
                </h2>
                <div className="flex gap-2">
                    <button onClick={handleExportMindMap} disabled={isDownloading || !layout} className="flex items-center gap-2 bg-white text-indigo-600 font-semibold py-2 px-4 rounded-lg border border-slate-300 hover:bg-indigo-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        {isDownloading ? 'Exportation...' : <><DownloadIcon className="h-5 w-5"/> Exporter en PNG</>}
                    </button>
                    <button onClick={onExit} className="bg-slate-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-700 transition-colors">Retour</button>
                </div>
            </div>
            {error && <p className="text-red-500 text-center mb-4">{error}</p>}
            
            <div className="relative w-full overflow-auto border border-slate-200 rounded-lg bg-slate-100/50" style={{ minHeight: '60vh' }}>
                <div ref={mindMapContainerRef} style={{ width: layout ? layout.width : '100%', height: layout ? layout.height : '100%' }}>
                     {layout ? (
                        <svg width={layout.width} height={layout.height} className="absolute top-0 left-0">
                            {layout.lines.map((line, i) => (
                                <path key={i} d={line.d} stroke={line.color} strokeWidth="2" fill="none" />
                            ))}
                        </svg>
                     ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Loader text="Construction de la carte mentale..."/>
                        </div>
                     )}
                     <div className="relative">
                        {layout ? layout.nodes.map(node => (
                             <MindMapNodeComponent key={node.id} node={node} />
                        )) : (
                            <div className="opacity-0">
                                {allNodesForMeasuring.map(node => (
                                    <div key={node.id} ref={el => { if (el) nodeRefs.current[node.id] = el; }} className="inline-block">
                                        <MindMapNodeComponent node={node} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const MindMapNodeComponent: React.FC<{ node: any }> = ({ node }) => {
    const colors = [
        { bg: 'bg-indigo-100', border: 'border-indigo-300', text: 'text-indigo-800' },
        { bg: 'bg-emerald-100', border: 'border-emerald-300', text: 'text-emerald-800' },
        { bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-800' },
        { bg: 'bg-sky-100', border: 'border-sky-300', text: 'text-sky-800' },
        { bg: 'bg-fuchsia-100', border: 'border-fuchsia-300', text: 'text-fuchsia-800' },
        { bg: 'bg-rose-100', border: 'border-rose-300', text: 'text-rose-800' },
    ];
    const color = node.type === 'central' ? {bg: 'bg-slate-800', border: 'border-slate-900', text: 'text-white'} : colors[node.colorIndex % colors.length];

    const style: React.CSSProperties = node.x !== undefined ? {
        position: 'absolute',
        top: node.y,
        left: node.x,
        width: node.width,
        height: node.height,
    } : {};
    
    return (
        <div style={style} className="flex items-center justify-center">
             <div className={`p-3 rounded-lg border-2 shadow-md transition-all duration-300 ${color.bg} ${color.border}`}>
                <p className={`text-center font-semibold text-sm ${color.text}`}>{node.title}</p>
            </div>
        </div>
    );
};

// --- Quiz Section ---
interface QuizSectionProps { question: QuizQuestion; questionIndex: number; totalQuestions: number; selectedOption: string | null; onOptionSelect: (option: string) => void; onCheckAnswer: () => void; onNextQuestion: () => void; isAnswerChecked: boolean; onExit: () => void; }
const QuizSection: React.FC<QuizSectionProps> = ({ question, questionIndex, totalQuestions, selectedOption, onOptionSelect, onCheckAnswer, onNextQuestion, isAnswerChecked, onExit }) => {
    const getOptionClass = (option: string) => {
        if (!isAnswerChecked) return selectedOption === option ? 'bg-indigo-200 border-indigo-400' : 'bg-white hover:bg-slate-100';
        if (option === question.correctAnswer) return 'bg-green-100 border-green-400 text-green-800 font-bold';
        if (option === selectedOption) return 'bg-red-100 border-red-400 text-red-800';
        return 'bg-slate-100 opacity-70';
    };
    return (
        <div className="p-6 sm:p-8 animate__animated animate__fadeIn">
             <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2"><ClipboardListIcon className="h-7 w-7 text-indigo-500" />Quiz en cours</h2>
                <button onClick={onExit} className="text-sm text-slate-600 hover:text-slate-900 font-semibold">Quitter</button>
            </div>
            <div className="text-center text-sm font-medium text-slate-500 mb-4">Question {questionIndex + 1} sur {totalQuestions}</div>
            <div className="w-full bg-slate-200 rounded-full h-2.5 mb-6">
                <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${((questionIndex + 1) / totalQuestions) * 100}%` }}></div>
            </div>
            <p className="text-lg sm:text-xl font-semibold text-slate-700 mb-6 text-center">{question.questionText}</p>
            <div className="space-y-3">
                {question.options.map((option, i) => (
                    <button key={i} onClick={() => onOptionSelect(option)} disabled={isAnswerChecked} className={`w-full text-left p-4 border-2 rounded-lg transition-all duration-200 flex items-center gap-4 ${getOptionClass(option)}`}>
                        <span className="font-bold text-slate-500">{String.fromCharCode(65 + i)}</span>
                        <span className="flex-grow">{option}</span>
                         {isAnswerChecked && option === question.correctAnswer && <CheckCircleIcon className="h-6 w-6 text-green-600" />}
                        {isAnswerChecked && option === selectedOption && option !== question.correctAnswer && <XCircleIcon className="h-6 w-6 text-red-600" />}
                    </button>
                ))}
            </div>
            {isAnswerChecked && <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg animate__animated animate__fadeInUp">
                <h4 className="font-bold text-blue-800">Justification</h4>
                <p className="text-blue-700">{question.justification}</p>
            </div>}
            <div className="mt-8 text-center">
                {!isAnswerChecked ?
                    <button onClick={onCheckAnswer} disabled={!selectedOption} className="bg-indigo-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed text-lg">Vérifier</button> :
                    <button onClick={onNextQuestion} className="bg-green-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-green-700 transition-colors text-lg"> {questionIndex === totalQuestions - 1 ? 'Voir les résultats' : 'Question suivante'}</button>
                }
            </div>
        </div>
    );
};

// --- Results Section ---
interface ResultsSectionProps { session: QcmSession; onExit: () => void; onRetakeQuiz: (mode: 'all' | 'incorrect') => void; onStudy: () => void; onExport: () => void; }
const ResultsSection: React.FC<ResultsSectionProps> = ({ session, onExit, onRetakeQuiz, onStudy, onExport }) => {
    const { quizData, userAnswers, score } = session;
    const totalQuestions = quizData.questions.length;
    const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
    const IncorrectIcon = () => <XCircleIcon className="h-5 w-5 text-red-500 flex-shrink-0" />;
    const CorrectIcon = () => <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0" />;
    return (
        <div className="p-6 sm:p-8 animate__animated animate__fadeIn">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-800 dark:text-white">Résultats du Quiz</h2>
                <button onClick={onExit} className="bg-slate-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-700 transition-colors">Retour</button>
            </div>
            <div className="text-center bg-indigo-50 dark:bg-slate-700 border border-indigo-200 dark:border-slate-500 rounded-xl p-6 mb-6">
                <h3 className="text-lg font-medium text-slate-700 dark:text-slate-200">Votre score</h3>
                <p className="text-5xl font-extrabold text-indigo-600 dark:text-indigo-400 my-2">{score}/{totalQuestions}</p>
                <p className="text-2xl font-bold text-indigo-500 dark:text-indigo-300">({percentage}%)</p>
            </div>
                            <div className="flex flex-col sm:flex-row gap-3 mb-4 sm:mb-6">
                <button onClick={() => onRetakeQuiz('all')} className="w-full flex items-center justify-center gap-2 bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 font-semibold py-2 px-4 rounded-lg border border-slate-300 dark:border-slate-500 hover:bg-indigo-50 dark:hover:bg-slate-600 transition-colors"><RotateCwIcon className="h-5 w-5"/> Refaire le quiz</button>
                <button onClick={() => onRetakeQuiz('incorrect')} className="w-full flex items-center justify-center gap-2 bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 font-semibold py-2 px-4 rounded-lg border border-slate-300 dark:border-slate-500 hover:bg-indigo-50 dark:hover:bg-slate-600 transition-colors"><XCircleIcon className="h-5 w-5"/> Refaire les erreurs</button>
                <button onClick={onExport} className="w-full flex items-center justify-center gap-2 bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 font-semibold py-2 px-4 rounded-lg border border-slate-300 dark:border-slate-500 hover:bg-indigo-50 dark:hover:bg-slate-600 transition-colors"><DownloadIcon className="h-5 w-5"/> Exporter</button>
            </div>
            <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Réponses détaillées</h3>
                <ul className="space-y-4">
                    {quizData.questions.map((q, i) => {
                        const userAnswer = userAnswers[i];
                        const isCorrect = userAnswer === q.correctAnswer;
                        return (
                            <li key={i} className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-500 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    {isCorrect ? <CorrectIcon/> : <IncorrectIcon/>}
                                    <div className="flex-grow">
                                        <p className="font-semibold text-slate-700 dark:text-white">{q.questionText}</p>
                                        <p className={`text-sm ${isCorrect ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>Votre réponse: {userAnswer || 'Non répondue'}</p>
                                        {!isCorrect && <p className="text-sm text-green-700 dark:text-green-400">Bonne réponse: {q.correctAnswer}</p>}
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1"><strong>Justification :</strong> {q.justification}</p>
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
};

// --- Flashcard Section ---
interface FlashcardSectionProps { quizData: QuizData; onExit: () => void; }
const FlashcardSection: React.FC<FlashcardSectionProps> = ({ quizData, onExit }) => {
    const flashcards = useMemo(() => quizData.questions.map(q => ({ question: q.questionText, answer: q.correctAnswer, justification: q.justification })), [quizData]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const handleNext = () => { setIsFlipped(false); setTimeout(() => setCurrentIndex(prev => (prev + 1) % flashcards.length), 150); };
    const handlePrev = () => { setIsFlipped(false); setTimeout(() => setCurrentIndex(prev => (prev - 1 + flashcards.length) % flashcards.length), 150); };

    return (
        <div className="p-6 sm:p-8 animate__animated animate__fadeIn">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-800">Flashcards</h2>
                <button onClick={onExit} className="bg-slate-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-700 transition-colors">Retour</button>
            </div>
             <p className="text-center text-slate-500 mb-4">Carte {currentIndex + 1} sur {flashcards.length}</p>
            <div className="perspective-1000">
                <div onClick={() => setIsFlipped(!isFlipped)} className={`relative w-full h-48 sm:h-64 md:h-80 rounded-xl shadow-lg transition-transform duration-500 transform-style-preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                    <div className="absolute w-full h-full bg-indigo-500 text-white p-6 flex items-center justify-center text-center rounded-xl backface-hidden"><p className="text-xl font-semibold">{flashcards[currentIndex].question}</p></div>
                    <div className="absolute w-full h-full bg-green-500 text-white p-6 flex flex-col items-center justify-center text-center rounded-xl backface-hidden rotate-y-180">
                        <p className="text-xl font-bold">{flashcards[currentIndex].answer}</p>
                        <p className="mt-4 text-sm italic">{flashcards[currentIndex].justification}</p>
                    </div>
                </div>
            </div>
            <div className="flex justify-between items-center mt-6">
                <button onClick={handlePrev} className="bg-slate-200 font-bold py-2 px-4 rounded-lg hover:bg-slate-300">Précédent</button>
                <p className="text-sm text-slate-500">Cliquez sur la carte pour la retourner</p>
                <button onClick={handleNext} className="bg-slate-200 font-bold py-2 px-4 rounded-lg hover:bg-slate-300">Suivant</button>
            </div>
        </div>
    );
};

// --- Chat Section ---
interface ChatSectionProps { initialMessages: Message[]; onExit: () => void; onMessagesUpdate: (messages: Message[]) => void; documentText: string; userId: string; }
const ChatSection: React.FC<ChatSectionProps> = ({ initialMessages, onExit, onMessagesUpdate, documentText, userId }) => {
    const [messages, setMessages] = useState<Message[]>(initialMessages);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [useWebSearch, setUseWebSearch] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };
    
    useEffect(scrollToBottom, [messages]);
    useEffect(() => { setMessages(initialMessages); }, [initialMessages]);

    const handleSend = async () => {
        if (input.trim() === '' || isLoading) return;
        
        // Vérifier si l'utilisateur a une clé API configurée
        const hasApiKey = await apiKeyService.hasApiKey(userId);
        if (!hasApiKey) {
            const errorMessage: Message = { 
                role: 'model', 
                text: 'Vous devez configurer votre clé API Gemini pour utiliser le chat. Allez dans Paramètres > Clé API pour la configurer.' 
            };
            setMessages(prev => [...prev, errorMessage]);
            return;
        }
        
        const newUserMessage: Message = { role: 'user', text: input };
        const updatedMessages = [...messages, newUserMessage];
        setMessages(updatedMessages);
        setInput('');
        setIsLoading(true);

        try {
            const response = await continueChat(messages, input, documentText, useWebSearch, userId);
            const modelMessage: Message = { 
                role: 'model',
                text: response.text,
                sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map(chunk => ({
                    uri: chunk.web?.uri ?? '',
                    title: chunk.web?.title ?? 'Source inconnue'
                }))?.filter(source => source.uri)
            };
            const finalMessages = [...updatedMessages, modelMessage];
            setMessages(finalMessages);
            onMessagesUpdate(finalMessages);
        } catch (error: any) {
            console.error("Chat error:", error);
            const errorMessage: Message = { role: 'model', text: `Désolé, une erreur est survenue: ${error.message}` };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };
    
    const SourceLink = ({ source }: { source: GroundingSource }) => (
        <a href={source.uri} target="_blank" rel="noopener noreferrer" className="inline-block bg-sky-100 text-sky-800 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded-full hover:bg-sky-200 transition-colors">
            {source.title || new URL(source.uri).hostname}
        </a>
    );

    return (
        <div className="p-0 sm:p-2 md:p-4 flex flex-col h-[80vh] max-h-[85vh] animate__animated animate__fadeIn">
            <div className="flex justify-between items-center p-4 border-b border-slate-200 flex-shrink-0">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-800 flex items-center gap-2"><MessageSquareIcon className="h-6 w-6 sm:h-7 sm:w-7 text-sky-500" />Chat avec le document</h2>
                <button onClick={onExit} className="text-sm text-slate-600 hover:text-slate-900 font-semibold">Quitter</button>
            </div>
            <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-slate-50">
                {messages.length === 0 && (
                    <div className="text-center text-slate-500 h-full flex flex-col justify-center">
                        <p>Posez une question sur le document pour commencer.</p>
                        <p className="text-xs mt-1">Ex: "Résume-moi le troisième paragraphe."</p>
                    </div>
                )}
                {messages.map((msg, i) => (
                    <div key={i} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                        {msg.role === 'model' && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white"><SparklesIcon className="w-5 h-5"/></div>}
                        <div className={`max-w-xs sm:max-w-md lg:max-w-lg p-3 rounded-2xl ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white text-slate-700 border border-slate-200 rounded-bl-none'}`}>
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                            {msg.sources && msg.sources.length > 0 && (
                                <div className="mt-3 pt-2 border-t border-t-sky-200">
                                    <h4 className="text-xs font-bold text-slate-500 mb-1">Sources Web :</h4>
                                    {msg.sources.map((source, idx) => <SourceLink source={source} />)}
                                </div>
                            )}
                        </div>
                        {msg.role === 'user' && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center"><UserIcon className="w-5 h-5 text-slate-600"/></div>}
                    </div>
                ))}
                {isLoading && <div className="flex items-start gap-3"><div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white"><SparklesIcon className="w-5 h-5 animate-pulse"/></div><div className="p-3 rounded-2xl bg-white border border-slate-200 rounded-bl-none"><p className="text-slate-500 italic">L'IA réfléchit...</p></div></div>}
                <div ref={messagesEndRef} />
            </div>
             <div className="p-4 border-t border-slate-200 flex-shrink-0">
                <div className="flex items-center gap-2 mb-2">
                    <label htmlFor="web-search-toggle" className="flex items-center cursor-pointer text-sm text-slate-600">
                        <GlobeIcon className={`h-4 w-4 mr-1.5 ${useWebSearch ? 'text-blue-500' : 'text-slate-400'}`} />
                        Recherche Web
                    </label>
                    <input id="web-search-toggle" type="checkbox" checked={useWebSearch} onChange={() => setUseWebSearch(!useWebSearch)} className="sr-only" />
                    <div onClick={() => setUseWebSearch(!useWebSearch)} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${useWebSearch ? 'bg-blue-500' : 'bg-slate-300'}`}>
                        <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${useWebSearch ? 'translate-x-6' : 'translate-x-1'}`} />
                    </div>
                </div>
                <div className="relative flex items-center">
                    <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder="Posez votre question..." rows={1} className="w-full p-3 pr-12 border border-slate-300 rounded-xl resize-none focus:ring-2 focus:ring-indigo-500" disabled={isLoading} />
                    <button onClick={handleSend} disabled={isLoading || !input.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"><SendIcon className="h-5 w-5" /></button>
                </div>
            </div>
        </div>
    );
};

// --- Guided Study Section ---
interface GuidedStudySectionProps {
    session: GuidedStudySession;
    onUpdateSession: (updates: Partial<GuidedStudySession>) => void;
    onExit: () => void;
    onUpdateChatMessages: (messages: Message[]) => void;
    onExportRevisionSheet: (sheetData: RevisionSheetData, title: string) => void;
}
const GuidedStudySection: React.FC<GuidedStudySectionProps> = ({ session, onUpdateSession, onExit, onUpdateChatMessages, onExportRevisionSheet }) => {
    const { id, title, revisionSheetData, quizData, userAnswers, score, messages, currentStep, documentText } = session;

    const [localQuizState, setLocalQuizState] = useState({
        activeQuiz: quizData,
        userAnswers: userAnswers,
        score: score,
        currentQuestionIndex: 0,
        selectedOption: null as string | null,
        isAnswerChecked: false,
    });

    const steps = [
        { name: "Fiche de révision", icon: NotebookTextIcon },
        { name: "Flashcards", icon: LayersIcon },
        { name: "Quiz", icon: ClipboardListIcon },
        { name: "Chat", icon: MessageSquareIcon },
    ];

    const setCurrentStep = (step: number) => {
        onUpdateSession({ currentStep: step });
    };

    const handleQuizNext = () => {
        if (localQuizState.currentQuestionIndex < quizData.questions.length - 1) {
            setLocalQuizState(prev => ({
                ...prev,
                currentQuestionIndex: prev.currentQuestionIndex + 1,
                selectedOption: null,
                isAnswerChecked: false,
            }));
        } else {
            // Quiz finished within guided study, maybe just stay on the last question?
            // Or show a mini-result view before moving on.
        }
    };
    
    const handleQuizCheck = () => {
        if (!localQuizState.selectedOption) return;
        const currentQuestion = quizData.questions[localQuizState.currentQuestionIndex];
        const isCorrect = localQuizState.selectedOption === currentQuestion.correctAnswer;
        const newScore = isCorrect ? localQuizState.score + 1 : localQuizState.score;
        const newAnswers = { ...localQuizState.userAnswers, [localQuizState.currentQuestionIndex]: localQuizState.selectedOption };
        
        setLocalQuizState(prev => ({ ...prev, isAnswerChecked: true, score: newScore, userAnswers: newAnswers }));
        onUpdateSession({ score: newScore, userAnswers: newAnswers });
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 0: // Revision Sheet
                return <RevisionSheetDisplaySection revisionSheetData={revisionSheetData} onExit={() => {}} onExport={() => onExportRevisionSheet(revisionSheetData, title)} />;
            case 1: // Flashcards (from revision sheet key concepts)
                const flashcardData = {
                    title: "Flashcards des concepts clés",
                    questions: revisionSheetData.keyConcepts.map(c => ({
                        questionText: c.definition,
                        options: [],
                        correctAnswer: c.term,
                        justification: `Concept clé de la fiche de révision.`
                    }))
                };
                return <FlashcardSection quizData={flashcardData} onExit={() => {}} />;
            case 2: // Quiz
                const { activeQuiz, currentQuestionIndex, selectedOption, isAnswerChecked } = localQuizState;
                return <QuizSection 
                    question={activeQuiz.questions[currentQuestionIndex]}
                    questionIndex={currentQuestionIndex}
                    totalQuestions={activeQuiz.questions.length}
                    selectedOption={selectedOption}
                    onOptionSelect={(opt) => setLocalQuizState(prev => ({...prev, selectedOption: opt}))}
                    onCheckAnswer={handleQuizCheck}
                    onNextQuestion={handleQuizNext}
                    isAnswerChecked={isAnswerChecked}
                    onExit={() => {}} 
                 />;
            case 3: // Chat
                return <ChatSection initialMessages={messages} onExit={() => {}} onMessagesUpdate={onUpdateChatMessages} documentText={documentText} />;
            default: return null;
        }
    };

    return (
        <div className="animate__animated animate__fadeIn flex flex-col h-[85vh]">
            <div className="p-4 sm:p-6 border-b border-slate-200 flex-shrink-0">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <GraduationCapIcon className="h-8 w-8 text-yellow-500" />{title}
                    </h2>
                    <button onClick={onExit} className="bg-slate-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-700 transition-colors">Quitter l'étude</button>
                </div>
                <div className="w-full mt-4">
                    <ol className="flex items-center w-full">
                        {steps.map((step, index) => (
                            <li key={index} className={`flex w-full items-center ${index < steps.length - 1 ? "after:content-[''] after:w-full after:h-1 after:border-b after:border-4 after:inline-block " : ''} ${index <= currentStep ? 'after:border-indigo-600' : 'after:border-slate-200'}`}>
                                <button onClick={() => setCurrentStep(index)} className="flex flex-col items-center justify-center">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${index <= currentStep ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                                        <step.icon className={`w-5 h-5 ${index <= currentStep ? 'text-white' : 'text-slate-600'}`} />
                                    </div>
                                    <span className={`text-xs mt-1 font-semibold ${index === currentStep ? 'text-indigo-600' : 'text-slate-500'}`}>{step.name}</span>
                                </button>
                            </li>
                        ))}
                    </ol>
                </div>
            </div>
            <div className="flex-grow overflow-y-auto bg-slate-50">
                {renderStepContent()}
            </div>
             <div className="p-4 border-t border-slate-200 flex justify-between items-center flex-shrink-0">
                <button onClick={() => setCurrentStep(Math.max(0, currentStep - 1))} disabled={currentStep === 0} className="bg-slate-200 font-bold py-2 px-6 rounded-lg hover:bg-slate-300 disabled:opacity-50">Précédent</button>
                <button onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))} disabled={currentStep === steps.length - 1} className="bg-indigo-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-indigo-700 disabled:opacity-50">Suivant</button>
            </div>
        </div>
    );
};

// --- Notification Bell Component ---
const NotificationBell: React.FC<{
    notifications: Notification[];
    showNotifications: boolean;
    onToggleNotifications: () => void;
    onMarkAsRead: (id: string) => void;
    onRemoveNotification: (id: string) => void;
    onClearAll: () => void;
}> = ({ notifications, showNotifications, onToggleNotifications, onMarkAsRead, onRemoveNotification, onClearAll }) => {
    const unreadCount = notifications.filter(n => !n.read).length;
    const notificationRef = useRef<HTMLDivElement>(null);

    // Fermer les notifications en cliquant à l'extérieur
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (showNotifications && notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                onToggleNotifications();
            }
        };

        if (showNotifications) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showNotifications, onToggleNotifications]);
    
    const getNotificationIcon = (type: Notification['type']) => {
        switch (type) {
            case 'success': return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
            case 'warning': return <AlertTriangleIcon className="h-4 w-4 text-yellow-500" />;
            case 'error': return <XCircleIcon className="h-4 w-4 text-red-500" />;
            default: return <InfoIcon className="h-4 w-4 text-blue-500" />;
        }
    };

    return (
        <div className="relative">
            <button
                onClick={onToggleNotifications}
                className="relative p-2 text-slate-600 hover:text-indigo-600 transition-colors duration-200"
            >
                <BellIcon className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {showNotifications && (
                <div ref={notificationRef} className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-slate-800">Notifications</h3>
                            {notifications.length > 0 && (
                                <button
                                    onClick={onClearAll}
                                    className="text-xs text-slate-500 hover:text-red-500 transition-colors"
                                >
                                    Tout effacer
                                </button>
                            )}
                        </div>
                    </div>
                    
                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-6 text-center text-slate-500">
                                <BellIcon className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                                <p className="text-sm">Aucune notification</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={`p-4 hover:bg-slate-50 transition-colors ${!notification.read ? 'bg-blue-50' : ''}`}
                                    >
                                        <div className="flex items-start gap-3">
                                            {getNotificationIcon(notification.type)}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <h4 className="font-semibold text-slate-800 text-sm">
                                                        {notification.title}
                                                    </h4>
                                                    <button
                                                        onClick={() => onRemoveNotification(notification.id)}
                                                        className="text-slate-400 hover:text-red-500 transition-colors"
                                                    >
                                                        <XIcon className="h-3 w-3" />
                                                    </button>
                                                </div>
                                                <p className="text-xs text-slate-600 mt-1">
                                                    {notification.message}
                                                </p>
                                                <div className="flex justify-between items-center mt-2">
                                                    <span className="text-xs text-slate-400">
                                                        {notification.timestamp.toLocaleTimeString('fr-FR', { 
                                                            hour: '2-digit', 
                                                            minute: '2-digit' 
                                                        })}
                                                    </span>
                                                    {notification.action && (
                                                        <button
                                                            onClick={() => {
                                                                notification.action!.onClick();
                                                                onMarkAsRead(notification.id);
                                                            }}
                                                            className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-md hover:bg-indigo-200 transition-colors"
                                                        >
                                                            {notification.action.label}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Title Input Section Component ---
interface TitleInputSectionProps {
    title: string;
    setTitle: (title: string) => void;
    onConfirm: () => void;
    onCancel: () => void;
    generationType: GenerationInputType;
}

const TitleInputSection: React.FC<TitleInputSectionProps> = ({ 
    title, 
    setTitle, 
    onConfirm, 
    onCancel, 
    generationType 
}) => {
    const formatGenerationType = (type: string) => {
        if (type === 'qcm') {
            return 'QCM';
        }
        return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const getTypeIcon = (type: GenerationInputType) => {
        const icons = {
            'qcm': <ClipboardListIcon className="h-6 w-6 text-indigo-500" />,
            'summary': <BookOpenIcon className="h-6 w-6 text-emerald-500" />,
            'chat': <MessageSquareIcon className="h-6 w-6 text-sky-500" />,
            'revision_sheet': <NotebookTextIcon className="h-6 w-6 text-purple-500" />,
            'mind_map': <MindMapIcon className="h-6 w-6 text-orange-500" />,
            'guided_study': <GraduationCapIcon className="h-6 w-6 text-yellow-500" />,
        };
        return icons[type];
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 border border-slate-200 dark:border-slate-700">
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center">
                            {getTypeIcon(generationType)}
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
                        Nommez votre création
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400">
                        Donnez un nom à votre {formatGenerationType(generationType).toLowerCase()}
                    </p>
                </div>

                <div className="space-y-6">
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Nom de la création
                        </label>
                        <input
                            type="text"
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    onConfirm();
                                } else if (e.key === 'Escape') {
                                    onCancel();
                                }
                            }}
                            className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-700 dark:text-white transition-colors"
                            placeholder="Entrez le nom de votre création..."
                            autoFocus
                        />
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={onCancel}
                            className="flex-1 px-4 py-3 text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl font-medium transition-colors"
                        >
                            Annuler
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={!title.trim()}
                            className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-xl hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            Créer
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Profile Editor Component ---
interface ProfileEditorProps {
    onClose: () => void;
    onSave: (firstName: string) => void;
    currentProfile: {firstName?: string, email?: string} | null;
}

const ProfileEditor: React.FC<ProfileEditorProps> = ({ onClose, onSave, currentProfile }) => {
    const [firstName, setFirstName] = useState(currentProfile?.firstName || '');

    const handleSave = () => {
        if (!firstName.trim()) {
            alert('Veuillez saisir votre prénom');
            return;
        }
        onSave(firstName.trim());
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Modifier le profil</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <XCircleIcon className="h-6 w-6" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Prénom *
                        </label>
                        <input
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Votre prénom"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email
                        </label>
                        <input
                            type="email"
                            value={currentProfile?.email || ''}
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">L'email ne peut pas être modifié</p>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                    >
                        Sauvegarder
                    </button>
                </div>
            </div>
        </div>
    );
};

export default App;