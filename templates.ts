import type { Template, GenerationParameters } from './types';

// Templates prédéfinis du système
export const PREDEFINED_TEMPLATES: Template[] = [
  {
    id: 'academic-summary',
    userId: 'system',
    name: 'Résumé Universitaire',
    description: 'Résumé structuré adapté aux études universitaires avec concepts clés et réflexions',
    category: 'academic',
    parameters: {
      generationType: 'summary',
      targetAudience: 'Étudiants universitaires',
      customInstructions: 'Crée un résumé académique structuré avec introduction, développement par points clés, et conclusion. Inclus les concepts fondamentaux et les liens entre les idées.',
      focus: 'Clarté et structure académique',
      systemPrompt: `Tu es un expert en pédagogie universitaire. Analyse le document fourni et crée un résumé académique structuré qui :

1. Identifie les concepts clés et les thèmes principaux
2. Organise l'information de manière logique avec introduction, développement et conclusion
3. Met en évidence les liens entre les idées et les arguments
4. Utilise un langage académique approprié
5. Inclus des points de réflexion pour approfondir la compréhension

Base-toi uniquement sur le contenu du document fourni.`
    },
    isPublic: true,
    createdAt: new Date().toISOString(),
    usageCount: 0,
    tags: ['université', 'académique', 'résumé', 'étude']
  },
  {
    id: 'revision-qcm',
    userId: 'system',
    name: 'QCM de Révision',
    description: 'Questions à choix multiples pour tester la compréhension et préparer les examens',
    category: 'academic',
    parameters: {
      generationType: 'qcm',
      numQuestions: 10,
      difficulty: 'Moyen',
      targetAudience: 'Étudiants en révision',
      customInstructions: 'Génère des questions variées qui testent la compréhension, l\'application et l\'analyse. Inclus des justifications détaillées pour chaque réponse.',
      focus: 'Évaluation et révision',
      systemPrompt: `Tu es un expert en évaluation pédagogique. Analyse le document fourni et crée un QCM de révision qui :

1. Teste la compréhension des concepts clés du document
2. Inclut des questions de différents niveaux (connaissance, compréhension, application, analyse)
3. Propose 4 options de réponse pour chaque question
4. Fournit une justification détaillée pour la bonne réponse
5. Explique pourquoi les autres options sont incorrectes

Base-toi uniquement sur le contenu du document fourni.`
    },
    isPublic: true,
    createdAt: new Date().toISOString(),
    usageCount: 0,
    tags: ['révision', 'examen', 'QCM', 'évaluation']
  },
  {
    id: 'course-sheet',
    userId: 'system',
    name: 'Fiche de Cours',
    description: 'Fiche de révision complète avec concepts clés, définitions et questions de réflexion',
    category: 'academic',
    parameters: {
      generationType: 'revision_sheet',
      complexity: 'Basique',
      targetAudience: 'Étudiants',
      customInstructions: 'Crée une fiche de cours structurée avec : 1) Résumé concis, 2) Concepts clés avec définitions, 3) Idées principales, 4) Questions de réflexion pour approfondir.',
      focus: 'Organisation et mémorisation'
    },
    isPublic: true,
    createdAt: new Date().toISOString(),
    usageCount: 0,
    tags: ['fiche', 'cours', 'révision', 'mémorisation']
  },
  {
    id: 'professional-summary',
    userId: 'system',
    name: 'Résumé Professionnel',
    description: 'Résumé adapté au monde professionnel avec points d\'action et recommandations',
    category: 'professional',
    parameters: {
      generationType: 'summary',
      complexity: 'Avancé',
      targetAudience: 'Professionnels',
      customInstructions: 'Crée un résumé professionnel avec : 1) Points clés, 2) Implications pratiques, 3) Recommandations d\'action, 4) Prochaines étapes.',
      focus: 'Action et application pratique'
    },
    isPublic: true,
    createdAt: new Date().toISOString(),
    usageCount: 0,
    tags: ['professionnel', 'business', 'action', 'pratique']
  },
  {
    id: 'business-analysis',
    userId: 'system',
    name: 'Analyse Business',
    description: 'Analyse approfondie avec SWOT, opportunités et risques',
    category: 'professional',
    parameters: {
      generationType: 'revision_sheet',
      targetAudience: 'Professionnels du business',
      customInstructions: 'Crée une analyse business structurée avec : 1) Analyse SWOT, 2) Opportunités de marché, 3) Risques identifiés, 4) Recommandations stratégiques.',
      focus: 'Analyse stratégique et décisionnelle',
      systemPrompt: `Tu es un expert en stratégie business et analyse de marché. Analyse le document fourni (qui peut contenir des informations sur une entreprise, un marché, un projet, etc.) et crée une analyse business complète qui :

1. Identifie les forces, faiblesses, opportunités et menaces (SWOT)
2. Analyse le contexte concurrentiel et les tendances du marché
3. Évalue les risques et opportunités identifiés dans le document
4. Propose des recommandations stratégiques basées sur l'analyse
5. Inclus des métriques et KPIs pertinents si mentionnés

Base-toi sur le contenu du document pour fournir une analyse personnalisée et actionable.`
    },
    isPublic: true,
    createdAt: new Date().toISOString(),
    usageCount: 0,
    tags: ['business', 'analyse', 'stratégie', 'SWOT']
  },
  {
    id: 'meeting-notes',
    userId: 'system',
    name: 'Compte-Rendu de Réunion',
    description: 'Structure pour organiser et résumer les réunions',
    category: 'professional',
    parameters: {
      generationType: 'summary',
      complexity: 'Intermédiaire',
      targetAudience: 'Professionnels',
      customInstructions: 'Crée un compte-rendu de réunion avec : 1) Participants et ordre du jour, 2) Points discutés, 3) Décisions prises, 4) Actions à suivre avec responsables.',
      focus: 'Organisation et suivi des actions'
    },
    isPublic: true,
    createdAt: new Date().toISOString(),
    usageCount: 0,
    tags: ['réunion', 'compte-rendu', 'organisation', 'suivi']
  },
  {
    id: 'project-planning',
    userId: 'system',
    name: 'Planification de Projet',
    description: 'Template pour organiser et planifier un projet',
    category: 'professional',
    parameters: {
      generationType: 'mind_map',
      complexity: 'Intermédiaire',
      targetAudience: 'Chefs de projet',
      customInstructions: 'Crée une carte mentale de planification avec : 1) Objectifs du projet, 2) Étapes principales, 3) Ressources nécessaires, 4) Échéances clés.',
      focus: 'Organisation et planification'
    },
    isPublic: true,
    createdAt: new Date().toISOString(),
    usageCount: 0,
    tags: ['projet', 'planification', 'organisation', 'gestion']
  },
  {
    id: 'mind-mapping',
    userId: 'system',
    name: 'Carte Mentale',
    description: 'Organisation visuelle des concepts en carte mentale pour une meilleure compréhension',
    category: 'academic',
    parameters: {
      generationType: 'mind_map',
      complexity: 'Intermédiaire',
      targetAudience: 'Apprenants visuels',
      customInstructions: 'Crée une carte mentale avec un concept central et des branches principales organisées logiquement. Chaque nœud doit être concis et clair.',
      focus: 'Organisation visuelle et logique'
    },
    isPublic: true,
    createdAt: new Date().toISOString(),
    usageCount: 0,
    tags: ['carte mentale', 'visuel', 'organisation', 'logique']
  },
  {
    id: 'guided-study',
    userId: 'system',
    name: 'Étude Guidée',
    description: 'Parcours d\'apprentissage complet avec résumé, QCM et chat interactif',
    category: 'academic',
    parameters: {
      generationType: 'guided_study',
      numQuestions: 5,
      difficulty: 'Moyen',
      complexity: 'Intermédiaire',
      targetAudience: 'Étudiants autonomes',
      customInstructions: 'Crée un parcours d\'étude guidé avec : 1) Résumé structuré, 2) QCM de vérification, 3) Chat pour approfondir les points difficiles.',
      focus: 'Apprentissage progressif et interactif'
    },
    isPublic: true,
    createdAt: new Date().toISOString(),
    usageCount: 0,
    tags: ['étude guidée', 'interactif', 'progression', 'apprentissage']
  },
  {
    id: 'personal-goals',
    userId: 'system',
    name: 'Objectifs Personnels',
    description: 'Template pour organiser et planifier ses objectifs personnels',
    category: 'personal',
    parameters: {
      generationType: 'mind_map',
      targetAudience: 'Développement personnel',
      customInstructions: 'Crée une carte mentale d\'objectifs personnels avec : 1) Objectifs principaux, 2) Sous-objectifs, 3) Actions concrètes, 4) Échéances.',
      focus: 'Organisation et motivation personnelle',
      systemPrompt: `Tu es un coach en développement personnel. Analyse le document fourni (qui peut contenir des réflexions personnelles, des aspirations, des défis, etc.) et crée une carte mentale d'objectifs personnels qui :

1. Identifie les objectifs principaux mentionnés dans le document
2. Décompose chaque objectif en sous-objectifs réalisables
3. Propose des actions concrètes et mesurables
4. Définit des échéances réalistes pour chaque étape
5. Inclus des indicateurs de progression et de motivation

Base-toi sur le contenu du document pour créer un plan d'action personnalisé et motivant.`
    },
    isPublic: true,
    createdAt: new Date().toISOString(),
    usageCount: 0,
    tags: ['objectifs', 'personnel', 'motivation', 'organisation']
  },
  {
    id: 'learning-notes',
    userId: 'system',
    name: 'Notes d\'Apprentissage',
    description: 'Structure pour organiser ses notes d\'apprentissage personnel',
    category: 'personal',
    parameters: {
      generationType: 'revision_sheet',
      targetAudience: 'Apprenants autonomes',
      customInstructions: 'Crée des notes d\'apprentissage structurées avec : 1) Concepts principaux, 2) Exemples pratiques, 3) Questions pour approfondir, 4) Applications personnelles.',
      focus: 'Compréhension et application personnelle'
    },
    isPublic: true,
    createdAt: new Date().toISOString(),
    usageCount: 0,
    tags: ['apprentissage', 'notes', 'personnel', 'compréhension']
  },
  {
    id: 'habit-tracker',
    userId: 'system',
    name: 'Suivi d\'Habitudes',
    description: 'Template pour organiser et suivre ses habitudes personnelles',
    category: 'personal',
    parameters: {
      generationType: 'summary',
      targetAudience: 'Développement personnel',
      customInstructions: 'Crée un système de suivi d\'habitudes avec : 1) Habitudes à développer, 2) Actions quotidiennes, 3) Mesures de progression, 4) Récompenses.',
      focus: 'Motivation et suivi personnel'
    },
    isPublic: true,
    createdAt: new Date().toISOString(),
    usageCount: 0,
    tags: ['habitudes', 'suivi', 'motivation', 'personnel']
  },
  {
    id: 'creative-writing',
    userId: 'system',
    name: 'Écriture Créative',
    description: 'Template pour organiser ses idées créatives et projets d\'écriture',
    category: 'personal',
    parameters: {
      generationType: 'mind_map',
      targetAudience: 'Créateurs et écrivains',
      customInstructions: 'Crée une carte mentale créative avec : 1) Idées principales, 2) Personnages/concepts, 3) Développements possibles, 4) Inspirations.',
      focus: 'Organisation créative et inspiration'
    },
    isPublic: true,
    createdAt: new Date().toISOString(),
    usageCount: 0,
    tags: ['créativité', 'écriture', 'inspiration', 'organisation']
  },
  {
    id: 'travel-planning',
    userId: 'system',
    name: 'Planification de Voyage',
    description: 'Template pour organiser et planifier un voyage personnel',
    category: 'personal',
    parameters: {
      generationType: 'revision_sheet',
      targetAudience: 'Voyageurs',
      customInstructions: 'Crée un plan de voyage structuré avec : 1) Destinations principales, 2) Activités prévues, 3) Logistique (transport, hébergement), 4) Budget estimé.',
      focus: 'Organisation et préparation de voyage',
      systemPrompt: `Tu es un expert en organisation de voyage. Analyse le document fourni (qui peut contenir des informations sur des destinations, un budget, des préférences, etc.) et crée un guide de voyage personnalisé qui :

1. Identifie les destinations et lieux d'intérêt mentionnés dans le document
2. Déduit le budget disponible et les préférences de l'utilisateur
3. Propose un itinéraire détaillé avec :
   - Destinations principales et secondaires
   - Activités recommandées selon les goûts identifiés
   - Logistique (transport, hébergement, restauration)
   - Budget estimé et conseils d'économie
4. Inclus des conseils pratiques et des recommandations personnalisées
5. Pose des questions pour clarifier les préférences si nécessaire

Base-toi sur le contenu du document pour personnaliser complètement le guide.`
    },
    isPublic: true,
    createdAt: new Date().toISOString(),
    usageCount: 0,
    tags: ['voyage', 'planification', 'organisation', 'découverte']
  }
];

// Fonction pour obtenir un template par ID
export const getTemplateById = (id: string): Template | undefined => {
  return PREDEFINED_TEMPLATES.find(template => template.id === id);
};

// Fonction pour obtenir tous les templates d'une catégorie
export const getTemplatesByCategory = (category: Template['category']): Template[] => {
  return PREDEFINED_TEMPLATES.filter(template => template.category === category);
};

// Fonction pour rechercher des templates par tags
export const searchTemplatesByTags = (tags: string[]): Template[] => {
  return PREDEFINED_TEMPLATES.filter(template => 
    tags.some(tag => template.tags.includes(tag))
  );
}; 