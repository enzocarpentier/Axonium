
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