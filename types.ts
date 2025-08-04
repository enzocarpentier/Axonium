
export interface QuizQuestion {
  questionText: string;
  options: string[];
  correctAnswer: string;
  justification: string;
}

export interface QuizData {
  title: string;
  questions: QuizQuestion[];
}

export type UserAnswers = {
  [questionIndex: number]: string;
};

export interface GroundingSource {
  uri: string;
  title: string;
}

export interface Message {
  role: 'user' | 'model';
  text: string;
  sources?: GroundingSource[];
}

export interface RevisionSheetData {
  summary: string;
  keyConcepts: { term: string; definition: string }[];
  mainIdeas: string[];
  reflectionQuestions: string[];
}

export interface MindMapNode {
  title: string;
  children?: MindMapNode[];
}

export interface MindMapData {
  centralTopic: string;
  mainNodes: MindMapNode[];
}

export type GenerationType = 'qcm' | 'summary' | 'chat' | 'revision_sheet' | 'mind_map' | 'guided_study';

// Types pour les templates
export interface GenerationParameters {
  generationType: GenerationType;
  numQuestions?: number;
  difficulty?: 'Facile' | 'Moyen' | 'Difficile';
  customInstructions?: string;
  targetAudience?: string;
  focus?: string;
  systemPrompt?: string; // Prompt spécialisé pour le template
}

export interface Template {
  id: string;
  userId: string; // 'system' pour les templates prédéfinis
  name: string;
  description: string;
  category: 'academic' | 'professional' | 'personal' | 'custom';
  parameters: GenerationParameters;
  isPublic: boolean;
  createdAt: string;
  usageCount: number;
  tags: string[];
  isFavorite?: boolean;
}

export interface SessionBase {
  id: string;
  userId: string; // Ajout pour lier la session à un utilisateur
  title: string;
  documentText: string;
  createdAt: string; // ISO string
}

export interface QcmSession extends SessionBase {
  generationType: 'qcm';
  quizData: QuizData;
  userAnswers: UserAnswers;
  score: number;
}

export interface SummarySession extends SessionBase {
  generationType: 'summary';
  summary: string;
}

export interface ChatSession extends SessionBase {
  generationType: 'chat';
  messages: Message[];
}

export interface RevisionSheetSession extends SessionBase {
  generationType: 'revision_sheet';
  revisionSheetData: RevisionSheetData;
}

export interface MindMapSession extends SessionBase {
  generationType: 'mind_map';
  mindMapData: MindMapData;
}

export interface GuidedStudySession extends SessionBase {
    generationType: 'guided_study';
    revisionSheetData: RevisionSheetData;
    quizData: QuizData;
    userAnswers: UserAnswers;
    score: number;
    messages: Message[];
    currentStep: number; // 0: summary, 1: flashcards, 2: quiz, 3: chat
}

export type Session = QcmSession | SummarySession | ChatSession | RevisionSheetSession | MindMapSession | GuidedStudySession;

// Types pour les paramètres utilisateur
export interface UserPreferences {
  // Préférences de génération
  defaultGenerationType: GenerationType;
  defaultNumQuestions: number;
  defaultDifficulty: 'Facile' | 'Moyen' | 'Difficile';
  defaultLanguage: 'fr' | 'en';
  
  // Préférences d'affichage
  theme: 'light' | 'dark' | 'auto';
  fontSize: 'small' | 'medium' | 'large';
  compactMode: boolean;
  
  // Préférences de notifications
  emailNotifications: boolean;
  pushNotifications: boolean;
  notificationSound: boolean;
  
  // Préférences de contenu
  autoSave: boolean;
  autoSaveInterval: number; // en minutes
  exportFormat: 'pdf' | 'txt' | 'docx';
  
  // Préférences avancées
  aiModel: 'gemini' | 'gpt';
  maxTokens: number;
  temperature: number;
}

export interface UserSettings {
  id: string;
  userId: string;
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

// Types pour le système de partage
export interface SharePermission {
  id: string;
  sessionId: string;
  sharedByUserId: string;
  sharedWithUserId: string;
  permission: 'read' | 'write' | 'admin';
  createdAt: string;
  expiresAt?: string; // Optionnel pour les partages temporaires
}

export interface PublicShare {
  id: string;
  sessionId: string;
  sharedByUserId: string;
  publicLink: string;
  isActive: boolean;
  createdAt: string;
  expiresAt?: string;
  accessCount: number;
}

export interface ShareInvitation {
  id: string;
  sessionId: string;
  sharedByUserId: string;
  sharedWithEmail: string;
  permission: 'read' | 'write' | 'admin';
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  expiresAt: string; // 7 jours par défaut
}

// Extension des sessions pour inclure les informations de partage
export interface SessionWithSharing extends Session {
  isShared?: boolean;
  sharedBy?: string;
  sharePermissions?: SharePermission[];
  publicShare?: PublicShare;
}

// Types pour le système de demandes d'inscription

// Types pour la bibliothèque de documents centralisée
export interface Document {
  id: string;
  userId: string;
  name: string;
  type: 'pdf' | 'image' | 'text' | 'other';
  size: number; // en bytes
  firebaseStorageUrl: string;
  firebaseStorageRef: string;
  uploadedAt: string;
  lastUsedAt: string;
  usageCount: number;
  isProcessed: boolean;
  processingStatus: 'pending' | 'processing' | 'completed' | 'error';
  processedText?: string;
  processingError?: string;
  tags: string[];
  description: string;
  isPublic: boolean;
}

export interface DocumentUploadProgress {
  file: File;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
}

export interface DocumentProcessingResult {
  text: string;
  confidence: number;
  processingTime: number;
}

export interface DocumentLibrary {
  totalDocuments: number;
  totalSize: number; // en bytes
  documentsByType: Record<string, number>;
  recentDocuments: Document[];
  mostUsedDocuments: Document[];
}

// Types pour les sessions avec documents
export interface SessionWithDocument extends Session {
  sourceDocument?: {
    documentId: string;
    documentName: string;
    pageRange?: string; // ex: "1-5" ou "all"
  };
}

// Types pour les préférences de documents
export interface DocumentPreferences {
  autoProcessDocuments: boolean;
  defaultDocumentTags: string[];
  maxFileSize: number; // en MB
  allowedFileTypes: string[];
  autoGenerateThumbnails: boolean;
  keepOriginalFiles: boolean;
}
