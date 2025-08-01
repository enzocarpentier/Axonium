import React, { useState, useCallback, useMemo, useRef, useEffect, useLayoutEffect } from 'react';
import type { QuizData, QuizQuestion, UserAnswers, Session, QcmSession, SummarySession, ChatSession, Message, RevisionSheetData, RevisionSheetSession, GroundingSource, MindMapData, MindMapNode, MindMapSession, GuidedStudySession, Template, GenerationParameters } from './types.ts';
import { generateQuizFromText, generateSummaryFromText, startChatSession, generateRevisionSheetFromText, extractTextFromImage, getChatSystemInstruction, generateMindMapFromText, continueChat } from './services/geminiService.ts';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import Loader from './components/Loader.tsx';
import TemplateSelector from './components/TemplateSelector.tsx';
import CustomTemplateCreator from './components/CustomTemplateCreator.tsx';
import { BrainCircuitIcon, FileTextIcon, CheckCircleIcon, XCircleIcon, SparklesIcon, UploadCloudIcon, BookOpenIcon, ClipboardListIcon, RotateCwIcon, DownloadIcon, LayersIcon, MessageSquareIcon, UserIcon, SendIcon, HistoryIcon, Trash2Icon, NotebookTextIcon, SearchIcon, ImageIcon, GlobeIcon, MindMapIcon, GraduationCapIcon, LogOutIcon, MailIcon, KeyRoundIcon, ChevronDownIcon, SettingsIcon, ArrowLeftIcon, HomeIcon } from './components/icons.tsx';
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
type AppState = 'auth' | 'main' | 'history' | 'input' | 'loading' | 'summary_display' | 'quiz' | 'results' | 'flashcards' | 'chat' | 'revision_sheet_display' | 'mind_map_display' | 'guided_study';
type Difficulty = 'Facile' | 'Moyen' | 'Difficile';

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
    
    const [sessions, setSessions] = useState<Session[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

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
    const [userProfile, setUserProfile] = useState<{firstName?: string, email?: string} | null>(null);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [showProfileEditor, setShowProfileEditor] = useState(false);

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
            setCurrentUser(user);
            setAuthLoading(false);
            if (user) {
                setAppState('loading');
                try {
                    const userSessions = await fetchSessions(user.uid);
                    setSessions(userSessions);
                } catch (error) {
                    console.error("Erreur lors du chargement des sessions:", error);
                }
                setAppState('main'); // Changé pour afficher le menu principal
            } else {
                setSessions([]);
                setAppState('auth');
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
                loadUserTemplates();
                loadCommunityTemplates();
            }
        }, [currentUser, authLoading, appState]);

        const loadUserProfile = async () => {
            if (!currentUser) return;
            
            try {
                const userDoc = await getDoc(doc(db, "users", currentUser.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    setUserProfile({
                        firstName: userData.firstName,
                        email: userData.email
                    });
                    if (userData.favoriteTemplates) {
                        setFavoriteTemplates(userData.favoriteTemplates);
                    }
                } else {
                    // Créer un profil pour les utilisateurs existants
                    await setDoc(doc(db, "users", currentUser.uid), {
                        email: currentUser.email,
                        createdAt: new Date().toISOString(),
                        favoriteTemplates: []
                    });
                    setUserProfile({
                        email: currentUser.email
                    });
                }
            } catch (error) {
                console.error("Erreur lors du chargement du profil:", error);
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

    const fetchSessions = async (userId: string): Promise<Session[]> => {
        try {
            const sessionsCol = collection(db, "sessions");
            const q = query(sessionsCol, where("userId", "==", userId));
            const querySnapshot = await getDocs(q);
            const userSessions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Session));
            // Tri manuel par date de création
            return userSessions.sort((a, b) => 
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
        } catch (error) {
            console.error("Erreur de lecture des sessions Firestore:", error);
            setError("Impossible de charger votre historique.");
            return [];
        }
    };
    
    const handleLogout = async () => {
        try {
            await signOut(auth);
            // Recharger la page pour retourner à la page d'authentification
            window.location.reload();
        } catch (error) {
            console.error("Erreur de déconnexion:", error);
            setError("Erreur lors de la déconnexion.");
        }
    };

    const handleGenerate = useCallback(async () => {
        if (!currentUser) {
            setError("Vous devez être connecté pour générer du contenu.");
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
                title: documentText.split('\n')[0].substring(0, 50) + (documentText.length > 50 ? '...' : '') || "Nouvelle Session",
            };
            
            // Récupérer le prompt spécialisé du template sélectionné
            const templatePrompt = selectedTemplate?.parameters.systemPrompt;

            let newSessionData: Omit<Session, 'id'> | null = null;

            switch (generationType) {
                case 'qcm': {
                    const quizResult = await generateQuizFromText(documentText, numQuestions, difficulty, templatePrompt);
                    const data: Omit<QcmSession, 'id'> = { ...newSessionBase, generationType: 'qcm', quizData: quizResult, userAnswers: {}, score: 0 };
                    newSessionData = data;
                    setQuizData(quizResult); setActiveQuiz(quizResult); resetQuizState(); setFlashcardSource('input');
                    setAppState('quiz');
                    break;
                }
                case 'summary': {
                    const summaryResult = await generateSummaryFromText(documentText, templatePrompt);
                    const data: Omit<SummarySession, 'id'> = { ...newSessionBase, generationType: 'summary', summary: summaryResult };
                    newSessionData = data;
                    setSummary(summaryResult);
                    setAppState('summary_display');
                    break;
                }
                case 'chat': {
                    const data: Omit<ChatSession, 'id'> = { ...newSessionBase, generationType: 'chat', messages: [] };
                    newSessionData = data;
                    setChatMessages([]);
                    setAppState('chat');
                    break;
                }
                case 'revision_sheet': {
                    const sheetResult = await generateRevisionSheetFromText(documentText, templatePrompt);
                    const data: Omit<RevisionSheetSession, 'id'> = { ...newSessionBase, generationType: 'revision_sheet', revisionSheetData: sheetResult };
                    newSessionData = data;
                    setRevisionSheetData(sheetResult);
                    setAppState('revision_sheet_display');
                    break;
                }
                case 'mind_map': {
                    const mindMapResult = await generateMindMapFromText(documentText);
                    const data: Omit<MindMapSession, 'id'> = { ...newSessionBase, generationType: 'mind_map', mindMapData: mindMapResult };
                    newSessionData = data;
                    setMindMapData(mindMapResult);
                    setAppState('mind_map_display');
                    break;
                }
                case 'guided_study': {
                    setProcessingMessage("Création de votre parcours d'étude guidé...");
                    const [sheetResult, quizResult] = await Promise.all([
                        generateRevisionSheetFromText(documentText, templatePrompt),
                        generateQuizFromText(documentText, numQuestions, difficulty, templatePrompt)
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
            
            if (newSessionData) {
                const docRef = await addDoc(collection(db, "sessions"), newSessionData);
                const finalSession = { id: docRef.id, ...newSessionData } as Session;
                setSessions(prev => [finalSession, ...prev]);
                setActiveSessionId(finalSession.id);
                
                // Nettoyer le brouillon après la génération réussie
                await clearDraft();
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
                        const extractedText = await extractTextFromImage(base64String, file.type);
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

    const handleBackToHistory = () => {
        setAppState('history');
        setActiveSessionId(null);
        resetAllContent();
    };

    const handleCreateNew = () => {
        setAppState('input');
        setActiveSessionId(null);
        resetAllContent();
    };

    const handleBackToMain = () => {
        setAppState('main');
    };
    
    const handleOpenSession = (session: Session) => {
        setActiveSessionId(session.id);
        setDocumentText(session.documentText);
        switch (session.generationType) {
            case 'qcm':
                setQuizData(session.quizData);
                setActiveQuiz(session.quizData);
                setUserAnswers(session.userAnswers);
                setScore(session.score);
                setCurrentQuestionIndex(0);
                setIsAnswerChecked(false);
                setSelectedOption(null);
                setAppState('results');
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
                await deleteDoc(doc(db, "sessions", sessionId));
                setSessions(prev => prev.filter(s => s.id !== sessionId));
            } catch (error) {
                console.error("Erreur de suppression:", error);
                setError("Impossible de supprimer la session.");
            }
        }
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
            return <AuthSection setGlobalError={setError} />;
        }

        switch (appState) {
            case 'main':
                return <MainMenuSection sessions={sessions} onNewGeneration={handleCreateNew} onOpenSession={handleOpenSession} onDeleteSession={handleDeleteSession} onLogout={handleLogout} currentUser={currentUser} userProfile={userProfile} />;
            case 'history':
                return <HistorySection sessions={filteredSessions} onNewSession={handleCreateNew} onOpenSession={handleOpenSession} onDeleteSession={handleDeleteSession} searchTerm={historySearchTerm} onSearchChange={setHistorySearchTerm} />;
            case 'input':
                return <DocumentInputSection 
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
                />;
            case 'loading':
                return <Loader text={processingMessage || "Analyse du document et génération de votre contenu..."} />;
            case 'summary_display':
                return summary && <SummaryDisplaySection summary={summary} onExit={handleBackToMain} />;
            case 'revision_sheet_display': {
                const activeSheetSession = sessions.find(s => s.id === activeSessionId && s.generationType === 'revision_sheet') as RevisionSheetSession | undefined;
                return revisionSheetData && activeSheetSession && <RevisionSheetDisplaySection revisionSheetData={revisionSheetData} onExit={handleBackToMain} onExport={() => handleExportRevisionSheet(revisionSheetData, activeSheetSession.title)} />;
            }
            case 'mind_map_display': {
                return mindMapData && <MindMapDisplaySection mindMapData={mindMapData} onExit={handleBackToMain} />;
            }
            case 'quiz':
                return activeQuiz && <QuizSection question={activeQuiz.questions[currentQuestionIndex]} questionIndex={currentQuestionIndex} totalQuestions={activeQuiz.questions.length} selectedOption={selectedOption} onOptionSelect={handleOptionSelect} onCheckAnswer={handleCheckAnswer} onNextQuestion={handleNextQuestion} isAnswerChecked={isAnswerChecked} onExit={handleBackToMain} />;
            case 'results': {
                 const activeQcmSession = sessions.find(s => s.id === activeSessionId && s.generationType === 'qcm') as QcmSession | undefined;
                 return activeQcmSession && <ResultsSection session={activeQcmSession} onExit={handleBackToMain} onRetakeQuiz={handleRetakeQuiz} onStudy={handleStartFlashcardsFromResults} onExport={handleExportResults} />;
            }
            case 'flashcards':
                 const onExitFlashcards = flashcardSource === 'results' ? () => setAppState('results') : handleBackToMain;
                return quizData && <FlashcardSection quizData={quizData} onExit={onExitFlashcards} />;
            case 'chat': {
                 const activeChatSession = sessions.find(s => s.id === activeSessionId && (s.generationType === 'chat' || s.generationType === 'guided_study')) as ChatSession | GuidedStudySession | undefined;
                return activeChatSession && <ChatSection initialMessages={activeChatSession.messages} onExit={handleBackToMain} onMessagesUpdate={handleUpdateChatSession} documentText={activeChatSession.documentText} />;
            }
            case 'guided_study': {
                const activeGuidedSession = sessions.find(s => s.id === activeSessionId && s.generationType === 'guided_study') as GuidedStudySession | undefined;
                return activeGuidedSession && <GuidedStudySection session={activeGuidedSession} onUpdateSession={handleUpdateGuidedStudySession} onExit={handleBackToMain} onUpdateChatMessages={handleUpdateChatSession} onExportRevisionSheet={handleExportRevisionSheet} />;
            }
            default:
                return <Loader text="Chargement..."/>;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <header className="w-full bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo et titre */}
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                                <BrainCircuitIcon className="h-6 w-6 text-white" />
                        </div>
                            <div className="flex flex-col">
                                <h1 className="text-xl font-bold text-slate-900">Axonium</h1>
                                <p className="text-xs text-slate-500 hidden sm:block">Assistant d'étude IA</p>
                            </div>
                        </div>

                        {/* Navigation centrale */}
                        <nav className="hidden md:flex items-center gap-8">
                            <button 
                                onClick={() => setAppState('main')}
                                className={`text-sm font-medium transition-colors duration-200 ${
                                    appState === 'main' 
                                        ? 'text-indigo-600 border-b-2 border-indigo-600' 
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                Accueil
                                        </button>
                            <button 
                                onClick={() => setAppState('history')}
                                className={`text-sm font-medium transition-colors duration-200 ${
                                    appState === 'history' 
                                        ? 'text-indigo-600 border-b-2 border-indigo-600' 
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                Historique
                            </button>
                            <button 
                                onClick={handleCreateNew}
                                className={`text-sm font-medium transition-colors duration-200 ${
                                    appState === 'input' 
                                        ? 'text-indigo-600 border-b-2 border-indigo-600' 
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                Nouvelle Génération
                            </button>
                        </nav>

                        {/* Menu utilisateur */}
                         {currentUser && (
                            <div className="flex items-center gap-4">
                                {/* Notifications */}
                                <button className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors duration-200">
                                    <div className="w-2 h-2 bg-red-500 rounded-full absolute top-1 right-1"></div>
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.5 10.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v1.5A2.25 2.25 0 004.5 10.5z" />
                                    </svg>
                                </button>

                                {/* Menu profil */}
                                <div className="relative profile-menu">
                                    <button 
                                        onClick={() => setShowProfileMenu(!showProfileMenu)}
                                        className="flex items-center gap-3 bg-white text-slate-700 font-medium py-2 px-4 rounded-lg border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 shadow-sm"
                                    >
                                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                                            <span className="text-white text-sm font-semibold">
                                                {userProfile?.firstName ? userProfile.firstName.charAt(0).toUpperCase() : 'U'}
                                            </span>
                                        </div>
                                        <div className="hidden sm:block text-left">
                                            <div className="text-sm font-semibold text-slate-900">
                                                {userProfile?.firstName || 'Utilisateur'}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {userProfile?.email}
                                            </div>
                                        </div>
                                        <ChevronDownIcon className="h-4 w-4 text-slate-500" />
                                    </button>
                                    
                                    {showProfileMenu && (
                                        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200 z-50 overflow-hidden">
                                            <div className="p-4 border-b border-slate-100">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                                                        <span className="text-white text-sm font-semibold">
                                                            {userProfile?.firstName ? userProfile.firstName.charAt(0).toUpperCase() : 'U'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-slate-900">
                                                            {userProfile?.firstName || 'Utilisateur'}
                                                        </div>
                                                        <div className="text-sm text-slate-500">
                                                    {userProfile?.email}
                                                </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="py-2">
                                                <button 
                                                    onClick={() => {
                                                        setShowProfileMenu(false);
                                                        setShowProfileEditor(true);
                                                    }}
                                                    className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors duration-200"
                                                >
                                                    <SettingsIcon className="h-4 w-4" />
                                                    Modifier le profil
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        setShowProfileMenu(false);
                                                        setAppState('history');
                                                    }}
                                                    className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors duration-200"
                                                >
                                                    <HistoryIcon className="h-4 w-4" />
                                                    Mon historique
                                                </button>
                                                <div className="border-t border-slate-100 my-2"></div>
                                                <button 
                                                    onClick={handleLogout}
                                                    className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors duration-200"
                                                >
                                                    <LogOutIcon className="h-4 w-4" />
                                                    Déconnexion
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                         )}
                    </div>
                </div>
                    </header>
            <main className="flex-1 p-4 sm:p-6 lg:p-8">
                <div className={`mx-auto bg-white rounded-2xl shadow-lg border border-slate-200 transition-all duration-500 ease-in-out ${appState === 'mind_map_display' ? 'max-w-screen-xl' : 'max-w-7xl'}`}>
                        {showTemplateSelector ? (
                            <div className="p-6">
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
                            renderContent()
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
                </div>
                    </main>
                    <footer className="text-center mt-8 text-sm text-slate-500"><p>Propulsé par l'API Gemini de Google.</p></footer>
                </div>
    );
};

// --- Sections and Components ---

// --- Auth Section ---
const AuthSection: React.FC<{ setGlobalError: (error: string | null) => void }> = ({ setGlobalError }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAuthAction = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setGlobalError(null);

        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth!, email, password);
            } else {
                const userCredential = await createUserWithEmailAndPassword(auth!, email, password);
                // Sauvegarder les informations du profil utilisateur
                if (userCredential.user) {
                    await setDoc(doc(db, "users", userCredential.user.uid), {
                        email: email,
                        firstName: firstName,
                        createdAt: new Date().toISOString(),
                        favoriteTemplates: []
                    });
                }
            }
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
                case 'auth/email-already-in-use':
                    setError("Cette adresse e-mail est déjà utilisée.");
                    break;
                case 'auth/weak-password':
                    setError("Le mot de passe doit comporter au moins 6 caractères.");
                    break;
                default:
                    setError("Une erreur est survenue. Veuillez réessayer.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-md mx-auto animate__animated animate__fadeIn">
            <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">{isLogin ? "Connexion" : "Créer un compte"}</h2>
            <p className="text-center text-slate-500 mb-6">Accédez à votre espace d'étude personnel.</p>
            <form onSubmit={handleAuthAction} className="space-y-4">
                {!isLogin && (
                    <div className="relative">
                        <UserIcon className="h-5 w-5 text-slate-400 absolute top-1/2 left-3 -translate-y-1/2" />
                        <input 
                            type="text" 
                            placeholder="Prénom" 
                            value={firstName} 
                            onChange={(e) => setFirstName(e.target.value)} 
                            required={!isLogin}
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500" 
                        />
                    </div>
                )}
                <div className="relative">
                    <MailIcon className="h-5 w-5 text-slate-400 absolute top-1/2 left-3 -translate-y-1/2" />
                    <input type="email" placeholder="Adresse e-mail" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="relative">
                    <KeyRoundIcon className="h-5 w-5 text-slate-400 absolute top-1/2 left-3 -translate-y-1/2" />
                    <input type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                </div>
                {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-3 bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-indigo-700 transition-all disabled:bg-slate-400">
                    {loading ? <><svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Chargement...</> : (isLogin ? "Se connecter" : "S'inscrire")}
                </button>
            </form>
            <p className="text-center text-sm text-slate-500 mt-6">
                {isLogin ? "Vous n'avez pas de compte ?" : "Vous avez déjà un compte ?"}
                <button onClick={() => {setIsLogin(!isLogin); setError('')}} className="font-semibold text-indigo-600 hover:underline ml-1">
                    {isLogin ? "Inscrivez-vous" : "Connectez-vous"}
                </button>
            </p>
        </div>
    );
};

// --- Main Menu Section ---
interface MainMenuSectionProps {
    sessions: Session[];
    onNewGeneration: () => void;
    onOpenSession: (session: Session) => void;
    onDeleteSession: (sessionId: string) => void;
    onLogout: () => void;
    currentUser: User;
    userProfile: {firstName?: string, email?: string} | null;
}

const MainMenuSection: React.FC<MainMenuSectionProps> = ({ 
    sessions, 
    onNewGeneration, 
    onOpenSession, 
    onDeleteSession, 
    onLogout, 
    currentUser,
    userProfile
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [showAllHistory, setShowAllHistory] = useState(false);

    // Fonction helper pour formater le type de génération
    const formatGenerationType = (type: string) => {
        return type.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const filteredSessions = sessions.filter(session =>
        session.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.documentText.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const recentSessions = sessions.slice(0, 3);
    const displaySessions = showAllHistory ? filteredSessions : recentSessions;

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
        <div className="p-6 sm:p-8 animate__animated animate__fadeIn">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                    {/* Section Génération */}
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl shadow-lg p-6 border border-indigo-200 min-h-[650px]">
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold text-slate-800 mb-4">Génération de Contenu</h2>
                            <button
                                onClick={onNewGeneration}
                                className="inline-flex items-center gap-3 bg-indigo-600 text-white font-bold py-4 px-8 rounded-xl hover:bg-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                            >
                                <SparklesIcon className="h-8 w-8" />
                                Générer du contenu
                            </button>
                            <p className="mt-3 text-slate-600">Créez des QCM, résumés, fiches et plus encore</p>
                        </div>

                        {/* Options de personnalisation rapide */}
                        <div className="space-y-4">
                            <div className="bg-white rounded-xl p-4 border border-indigo-100">
                                <h3 className="font-semibold text-slate-800 mb-3">Options rapides</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <button 
                                        onClick={onNewGeneration}
                                        className="text-left p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors hover:shadow-md"
                                    >
                                        <div className="font-medium text-slate-800 flex items-center gap-2">
                                            <ClipboardListIcon className="h-4 w-4 text-indigo-500" />
                                            QCM
                                        </div>
                                        <div className="text-sm text-slate-500">Questions à choix multiples</div>
                                    </button>
                                    <button 
                                        onClick={onNewGeneration}
                                        className="text-left p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors hover:shadow-md"
                                    >
                                        <div className="font-medium text-slate-800 flex items-center gap-2">
                                            <BookOpenIcon className="h-4 w-4 text-emerald-500" />
                                            Résumé
                                        </div>
                                        <div className="text-sm text-slate-500">Synthèse du contenu</div>
                                    </button>
                                    <button 
                                        onClick={onNewGeneration}
                                        className="text-left p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors hover:shadow-md"
                                    >
                                        <div className="font-medium text-slate-800 flex items-center gap-2">
                                            <NotebookTextIcon className="h-4 w-4 text-purple-500" />
                                            Fiche
                                        </div>
                                        <div className="text-sm text-slate-500">Fiche de révision</div>
                                    </button>
                                    <button 
                                        onClick={onNewGeneration}
                                        className="text-left p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors hover:shadow-md"
                                    >
                                        <div className="font-medium text-slate-800 flex items-center gap-2">
                                            <MessageSquareIcon className="h-4 w-4 text-sky-500" />
                                            Chat
                                        </div>
                                        <div className="text-sm text-slate-500">Discussion IA</div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section Historique */}
                    <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200 min-h-[650px]">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <HistoryIcon className="h-6 w-6 text-indigo-500" />
                                <h2 className="text-xl font-bold text-slate-800">Votre historique</h2>
                            </div>
                            {sessions.length > 3 && (
                                <button
                                    onClick={() => setShowAllHistory(!showAllHistory)}
                                    className="text-indigo-600 hover:text-indigo-700 font-medium"
                                >
                                    {showAllHistory ? 'Voir moins' : `Voir tout (${sessions.length})`}
                                </button>
                            )}
                        </div>

                        {/* Search */}
                        {sessions.length > 0 && (
                            <div className="relative mb-6">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                    <SearchIcon className="h-5 w-5 text-slate-400" />
                                </span>
                                <input
                                    type="search"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Rechercher dans votre historique..."
                                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow duration-200"
                                />
                            </div>
                        )}

                        {/* Sessions List */}
                        {sessions.length > 0 ? (
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                {displaySessions.map(session => (
                                    <div
                                        key={session.id}
                                        onClick={() => onOpenSession(session)}
                                        className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl hover:shadow-md hover:border-indigo-300 cursor-pointer transition-all"
                                    >
                                        <SessionIcon type={session.generationType} />
                                        <div className="flex-grow">
                                            <h3 className="font-bold text-slate-800 leading-tight">{session.title}</h3>
                                            <p className="text-sm text-slate-500">
                                                {new Date(session.createdAt).toLocaleDateString('fr-FR', { 
                                                    day: 'numeric', 
                                                    month: 'long',
                                                    year: 'numeric'
                                                })} - {formatGenerationType(session.generationType)}
                                            </p>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDeleteSession(session.id);
                                            }}
                                            className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-100 rounded-full transition-colors duration-200"
                                            aria-label="Supprimer la session"
                                        >
                                            <Trash2Icon className="h-5 w-5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg">
                                <LayersIcon className="mx-auto h-12 w-12 text-slate-400" />
                                <h3 className="mt-2 text-lg font-medium text-slate-800">Aucune session trouvée</h3>
                                <p className="mt-1 text-sm text-slate-500">Commencez par générer votre premier contenu</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- History Section ---
interface HistorySectionProps { sessions: Session[]; onNewSession: () => void; onOpenSession: (session: Session) => void; onDeleteSession: (sessionId: string) => void; searchTerm: string; onSearchChange: (term: string) => void; }
const HistorySection: React.FC<HistorySectionProps> = ({ sessions, onNewSession, onOpenSession, onDeleteSession, searchTerm, onSearchChange }) => {
    // Fonction helper pour formater le type de génération
    const formatGenerationType = (type: string) => {
        return type.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
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
        <div className="p-6 sm:p-8 animate__animated animate__fadeIn">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex items-center gap-3">
                    <HistoryIcon className="h-8 w-8 text-indigo-500" />
                    <h2 className="text-2xl sm:text-3xl font-bold text-slate-800">Historique</h2>
                </div>
                <button onClick={onNewSession} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-all duration-300 shadow-sm hover:shadow-md">
                    <SparklesIcon className="h-5 w-5" />Nouvelle Génération
                </button>
            </div>
             <div className="relative mb-6">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3"><SearchIcon className="h-5 w-5 text-slate-400" /></span>
                <input type="search" value={searchTerm} onChange={(e) => onSearchChange(e.target.value)} placeholder="Rechercher par titre ou contenu..." className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow duration-200" aria-label="Rechercher une session"/>
            </div>
            {sessions.length > 0 ? (
                <ul className="space-y-3">
                    {sessions.map(session => (
                        <li key={session.id} onClick={() => onOpenSession(session)} className="bg-slate-50 border border-slate-200 rounded-xl p-4 transition-all hover:shadow-md hover:border-indigo-300 cursor-pointer">
                            <div className="flex items-center gap-4">
                                <SessionIcon type={session.generationType} />
                                <div className="flex-grow">
                                    <h3 className="font-bold text-slate-800 leading-tight">{session.title}</h3>
                                    <p className="text-sm text-slate-500">
                                        {new Date(session.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} - {formatGenerationType(session.generationType)}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <button onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id); }} aria-label="Supprimer la session" className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-100 rounded-full transition-colors duration-200">
                                        <Trash2Icon className="h-5 w-5" />
                                    </button>
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
}
const DocumentInputSection: React.FC<DocumentInputSectionProps> = ({ text, setText, onGenerate, onPdfChange, onImageChange, isProcessing, processingMessage, error, setError, numQuestions, setNumQuestions, difficulty, setDifficulty, generationType, setGenerationType, onBack, onBackToMain, selectedTemplate, onTemplateSelect, onShowTemplateSelector }) => {
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
        <div className="p-6 sm:p-8 animate__animated animate__fadeIn">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-800">Générer du contenu</h2>
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
            
            {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-4" role="alert">
                <span className="block sm:inline">{error}</span>
                <span className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setError(null)}>
                    <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
                </span>
            </div>}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-3 w-full bg-white border-2 border-dashed border-slate-300 rounded-lg p-6 text-slate-600 hover:border-indigo-500 hover:text-indigo-600 transition-colors duration-200">
                    <UploadCloudIcon className="h-8 w-8"/> <div><h3 className="font-bold">Importer un PDF</h3><p className="text-sm">Extraction de texte automatique</p></div> <input type="file" ref={fileInputRef} onChange={onPdfChange} accept="application/pdf" className="hidden"/>
                </button>
                 <button onClick={() => imageInputRef.current?.click()} className="flex items-center justify-center gap-3 w-full bg-white border-2 border-dashed border-slate-300 rounded-lg p-6 text-slate-600 hover:border-indigo-500 hover:text-indigo-600 transition-colors duration-200">
                    <ImageIcon className="h-8 w-8"/> <div><h3 className="font-bold">Importer une Image</h3><p className="text-sm">Extrait le texte d'une photo</p></div> <input type="file" ref={imageInputRef} onChange={onImageChange} accept="image/png, image/jpeg, image/webp" className="hidden"/>
                </button>
            </div>

            <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Ou collez votre texte ici... (minimum 100 caractères)" className="w-full h-48 p-4 border border-slate-300 rounded-lg mb-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow duration-200" minLength={100} required disabled={isProcessing} aria-label="Zone de saisie de texte"></textarea>

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
                
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                {isProcessing ? <><svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> {processingMessage || 'Génération...'}</> : <><SparklesIcon className="h-6 w-6" />Générer</>}
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
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 flex items-center gap-3"><BookOpenIcon className="h-8 w-8 text-emerald-500"/>Résumé du document</h2>
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
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-800">Résultats du Quiz</h2>
                <button onClick={onExit} className="bg-slate-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-700 transition-colors">Retour</button>
            </div>
            <div className="text-center bg-indigo-50 border border-indigo-200 rounded-xl p-6 mb-6">
                <h3 className="text-lg font-medium text-slate-700">Votre score</h3>
                <p className="text-5xl font-extrabold text-indigo-600 my-2">{score}/{totalQuestions}</p>
                <p className="text-2xl font-bold text-indigo-500">({percentage}%)</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <button onClick={() => onRetakeQuiz('all')} className="w-full flex items-center justify-center gap-2 bg-white text-indigo-600 font-semibold py-2 px-4 rounded-lg border border-slate-300 hover:bg-indigo-50 transition-colors"><RotateCwIcon className="h-5 w-5"/> Refaire le quiz</button>
                <button onClick={() => onRetakeQuiz('incorrect')} className="w-full flex items-center justify-center gap-2 bg-white text-indigo-600 font-semibold py-2 px-4 rounded-lg border border-slate-300 hover:bg-indigo-50 transition-colors"><XCircleIcon className="h-5 w-5"/> Refaire les erreurs</button>
                <button onClick={onExport} className="w-full flex items-center justify-center gap-2 bg-white text-indigo-600 font-semibold py-2 px-4 rounded-lg border border-slate-300 hover:bg-indigo-50 transition-colors"><DownloadIcon className="h-5 w-5"/> Exporter</button>
            </div>
            <div>
                <h3 className="text-xl font-bold text-slate-800 mb-4">Réponses détaillées</h3>
                <ul className="space-y-4">
                    {quizData.questions.map((q, i) => {
                        const userAnswer = userAnswers[i];
                        const isCorrect = userAnswer === q.correctAnswer;
                        return (
                            <li key={i} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    {isCorrect ? <CorrectIcon/> : <IncorrectIcon/>}
                                    <div className="flex-grow">
                                        <p className="font-semibold text-slate-700">{q.questionText}</p>
                                        <p className={`text-sm ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>Votre réponse: {userAnswer || 'Non répondue'}</p>
                                        {!isCorrect && <p className="text-sm text-green-700">Bonne réponse: {q.correctAnswer}</p>}
                                        <p className="text-sm text-slate-500 mt-1"><strong>Justification :</strong> {q.justification}</p>
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
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-800">Flashcards</h2>
                <button onClick={onExit} className="bg-slate-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-700 transition-colors">Retour</button>
            </div>
             <p className="text-center text-slate-500 mb-4">Carte {currentIndex + 1} sur {flashcards.length}</p>
            <div className="perspective-1000">
                <div onClick={() => setIsFlipped(!isFlipped)} className={`relative w-full h-64 sm:h-80 rounded-xl shadow-lg transition-transform duration-500 transform-style-preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
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
interface ChatSectionProps { initialMessages: Message[]; onExit: () => void; onMessagesUpdate: (messages: Message[]) => void; documentText: string; }
const ChatSection: React.FC<ChatSectionProps> = ({ initialMessages, onExit, onMessagesUpdate, documentText }) => {
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
        const newUserMessage: Message = { role: 'user', text: input };
        const updatedMessages = [...messages, newUserMessage];
        setMessages(updatedMessages);
        setInput('');
        setIsLoading(true);

        try {
            const response = await continueChat(messages, input, documentText, useWebSearch);
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
                <h2 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2"><MessageSquareIcon className="h-7 w-7 text-sky-500" />Chat avec le document</h2>
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
                        <div className={`max-w-md lg:max-w-lg p-3 rounded-2xl ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white text-slate-700 border border-slate-200 rounded-bl-none'}`}>
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                            {msg.sources && msg.sources.length > 0 && (
                                <div className="mt-3 pt-2 border-t border-t-sky-200">
                                    <h4 className="text-xs font-bold text-slate-500 mb-1">Sources Web :</h4>
                                    {msg.sources.map((source, idx) => <SourceLink key={idx} source={source} />)}
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
                <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-3">
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