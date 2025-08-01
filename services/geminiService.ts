
import { GoogleGenAI, Type, GenerateContentResponse, Chat, Content } from "@google/genai";
import type { QuizData, RevisionSheetData, Message, MindMapData } from '../types.ts';

if (!process.env.API_KEY) {
    throw new Error("La variable d'environnement API_KEY n'est pas définie.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const quizSchema = {
    type: Type.OBJECT,
    properties: {
        title: {
            type: Type.STRING,
            description: "Un titre court et pertinent pour le QCM basé sur le contenu du document, rédigé en français."
        },
        questions: {
            type: Type.ARRAY,
            description: "La liste des questions du QCM, rédigées en français.",
            items: {
                type: Type.OBJECT,
                properties: {
                    questionText: {
                        type: Type.STRING,
                        description: "Le texte de la question, formulé de manière claire et en français."
                    },
                    options: {
                        type: Type.ARRAY,
                        description: "Une liste de 4 réponses possibles (une correcte, trois incorrectes), rédigées en français.",
                        items: { type: Type.STRING }
                    },
                    correctAnswer: {
                        type: Type.STRING,
                        description: "Le texte exact de la bonne réponse parmi les options fournies, en français."
                    },
                    justification: {
                        type: Type.STRING,
                        description: "Une brève explication en français de la raison pour laquelle la réponse est correcte, basée sur le texte fourni."
                    }
                },
                required: ["questionText", "options", "correctAnswer", "justification"]
            }
        }
    },
    required: ["title", "questions"]
};

const revisionSheetSchema = {
    type: Type.OBJECT,
    properties: {
        summary: {
            type: Type.STRING,
            description: "Un résumé approfondi et structuré du document, en plusieurs paragraphes, rédigé en français."
        },
        keyConcepts: {
            type: Type.ARRAY,
            description: "Une liste des termes et concepts clés du document, rédigés en français.",
            items: {
                type: Type.OBJECT,
                properties: {
                    term: {
                        type: Type.STRING,
                        description: "Le concept ou terme clé."
                    },
                    definition: {
                        type: Type.STRING,
                        description: "Une définition claire et concise du terme, basée sur le document."
                    }
                },
                required: ["term", "definition"]
            }
        },
        mainIdeas: {
            type: Type.ARRAY,
            description: "Une liste des idées principales et des thématiques centrales du document, rédigées en français.",
            items: { type: Type.STRING }
        },
        reflectionQuestions: {
            type: Type.ARRAY,
            description: "Une liste de 3 à 5 questions ouvertes conçues pour encourager la réflexion critique sur le contenu du document, rédigées en français.",
            items: { type: Type.STRING }
        }
    },
    required: ["summary", "keyConcepts", "mainIdeas", "reflectionQuestions"]
};

// Schéma pour les nœuds de deuxième niveau (concepts clés)
const mindMapChildNodeSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, description: "Un concept, un détail ou un exemple clé lié à l'idée principale. Sois concis." }
    },
    required: ['title'],
};

// Schéma pour les nœuds de premier niveau (idées principales)
const mindMapMainNodeSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, description: "Une des 3 à 5 idées principales ou chapitres majeurs du document." },
        children: {
            type: Type.ARRAY,
            description: "Une liste de quelques concepts clés (2 à 5) pour cette idée principale.",
            items: mindMapChildNodeSchema
        }
    },
    required: ['title', 'children'],
};

// Schéma principal pour la carte mentale
const mindMapSchema = {
    type: Type.OBJECT,
    properties: {
        centralTopic: {
            type: Type.STRING,
            description: "Le sujet ou thème central du document, en une phrase très concise (max 5-7 mots), rédigé en français."
        },
        mainNodes: {
            type: Type.ARRAY,
            description: "La liste des 3 à 5 idées principales qui partent du sujet central, rédigées en français.",
            items: mindMapMainNodeSchema
        }
    },
    required: ["centralTopic", "mainNodes"]
};


/**
 * Mélange un tableau en utilisant l'algorithme de Fisher-Yates.
 * @param array Le tableau à mélanger.
 * @returns Le tableau mélangé.
 */
const shuffleArray = <T>(array: T[]): T[] => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // Échange d'éléments
    }
    return array;
};


export const generateQuizFromText = async (documentText: string, numQuestions: number, difficulty: string, customPrompt?: string): Promise<QuizData> => {
    try {
        const prompt = customPrompt || `À partir du texte suivant, génère un questionnaire à choix multiples (QCM) de ${numQuestions} questions avec un niveau de difficulté '${difficulty}'. Le QCM doit évaluer la compréhension des concepts clés du texte. Assure-toi que les questions correspondent bien au niveau de difficulté demandé. IMPORTANT : L'intégralité du QCM (titre, questions, options, justifications) DOIT être rédigée exclusivement en français, quelle que soit la langue du texte source. Voici le texte : \n\n---DEBUT DU TEXTE---\n${documentText}\n---FIN DU TEXTE---`;

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: quizSchema,
                systemInstruction: customPrompt ? customPrompt : `Tu es un expert dans la création de matériel pédagogique. Ta tâche est de générer un QCM de haute qualité à partir du texte fourni. La sortie doit être entièrement et uniquement en français. Respecte précisément le nombre de questions (${numQuestions}) et le niveau de difficulté (${difficulty}) demandés. Pour chaque question, fournis également une brève justification pour la bonne réponse, en te basant sur le texte.`,
            },
        });
        
        const jsonText = response.text.trim();
        const quizData: QuizData = JSON.parse(jsonText);

        if (!quizData.questions || quizData.questions.length === 0) {
            throw new Error("L'IA n'a pas pu générer de questions. Veuillez essayer avec un texte plus long ou différent.");
        }
        
        // Validation et mélange des options
        quizData.questions.forEach(q => {
            if(!q.options.includes(q.correctAnswer)){
                console.warn("Réponse correcte non trouvée dans les options pour la question :", q.questionText);
                // On peut décider de corriger ou de jeter la question ici
            }
            // Mélanger les options pour que la bonne réponse ne soit pas toujours au même endroit
            shuffleArray(q.options);
        });

        return quizData;
    } catch (error) {
        console.error("Erreur lors de la génération du QCM:", error);
        if (error instanceof SyntaxError) {
             throw new Error("L'IA a renvoyé une réponse malformée. Veuillez réessayer.");
        }
        throw new Error("Impossible de générer le QCM. Veuillez vérifier votre texte et réessayer.");
    }
};

export const generateSummaryFromText = async (documentText: string, customPrompt?: string): Promise<string> => {
    try {
        const prompt = customPrompt || `À partir du texte suivant, rédige un résumé concis en 3 à 5 points clés, sous forme de liste à puces. Chaque point doit mettre en évidence une idée ou un concept majeur du document. Le résumé doit être entièrement en français, même si le texte source est dans une autre langue. Voici le texte : \n\n---DEBUT DU TEXTE---\n${documentText}\n---FIN DU TEXTE---`;

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                 systemInstruction: customPrompt ? customPrompt : `Tu es un assistant expert en synthèse de documents. Ta tâche est de créer un résumé clair et concis des points essentiels du texte fourni. La sortie doit être uniquement en français.`,
            }
        });

        const summaryText = response.text.trim();
        if (!summaryText) {
             throw new Error("L'IA n'a pas pu générer de résumé.");
        }

        return summaryText;

    } catch (error) {
        console.error("Erreur lors de la génération du résumé:", error);
        throw new Error("Impossible de générer le résumé du document.");
    }
};

export const generateRevisionSheetFromText = async (documentText: string, customPrompt?: string): Promise<RevisionSheetData> => {
    try {
        const prompt = customPrompt || `À partir du texte suivant, génère une fiche de révision complète et structurée. La fiche doit être entièrement en français. Voici le texte : \n\n---DEBUT DU TEXTE---\n${documentText}\n---FIN DU TEXTE---`;

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: revisionSheetSchema,
                systemInstruction: customPrompt ? customPrompt : "Tu es un assistant pédagogique expert. Ta mission est de transformer un document brut en une fiche de révision intelligente et bien organisée. Tu dois créer quatre sections distinctes : 1. Un résumé approfondi. 2. Une liste de concepts clés avec leurs définitions. 3. Les grandes idées et thématiques. 4. Des questions de réflexion pour approfondir la compréhension. La sortie doit être entièrement et uniquement en français.",
            },
        });
        
        const jsonText = response.text.trim();
        const revisionSheetData: RevisionSheetData = JSON.parse(jsonText);

        if (!revisionSheetData.summary || !revisionSheetData.keyConcepts || !revisionSheetData.mainIdeas || !revisionSheetData.reflectionQuestions) {
            throw new Error("L'IA n'a pas pu générer tous les éléments de la fiche de révision.");
        }

        return revisionSheetData;
    } catch (error) {
        console.error("Erreur lors de la génération de la fiche de révision:", error);
        if (error instanceof SyntaxError) {
             throw new Error("L'IA a renvoyé une réponse malformée. Veuillez réessayer.");
        }
        throw new Error("Impossible de générer la fiche de révision. Veuillez vérifier votre texte et réessayer.");
    }
};

export const generateMindMapFromText = async (documentText: string): Promise<MindMapData> => {
    try {
        const prompt = `À partir du texte suivant, génère les données pour une carte mentale (mind map) concise qui ne contient que les informations les plus importantes. Identifie un sujet central, 3 à 5 grandes idées, et pour chaque grande idée, quelques concepts clés associés. La structure doit être hiérarchique mais strictement limitée à deux niveaux de profondeur sous le sujet central (Sujet -> Idée Principale -> Concept Clé). La carte mentale doit être entièrement en français. Voici le texte : \n\n---DEBUT DU TEXTE---\n${documentText}\n---FIN DU TEXTE---`;

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: mindMapSchema,
                systemInstruction: "Tu es un expert en synthèse et visualisation de l'information. Ta mission est de transformer un document textuel en une carte mentale concise et pertinente au format JSON. Identifie un sujet central très court. Ensuite, extrais 3 à 5 idées principales. Pour chaque idée principale, ajoute seulement les 2 à 5 concepts clés les plus importants. Ne crée pas de sous-niveaux supplémentaires. La structure doit être simple : un centre, des branches principales, et des branches secondaires, c'est tout. La sortie doit être entièrement et uniquement en français.",
            },
        });
        
        const jsonText = response.text.trim();
        const mindMapData: MindMapData = JSON.parse(jsonText);

        if (!mindMapData.centralTopic || !mindMapData.mainNodes || mindMapData.mainNodes.length === 0) {
            throw new Error("L'IA n'a pas pu générer une carte mentale. Veuillez essayer avec un texte différent.");
        }

        return mindMapData;
    } catch (error) {
        console.error("Erreur lors de la génération de la carte mentale:", error);
        if (error instanceof SyntaxError) {
             throw new Error("L'IA a renvoyé une réponse malformée. Veuillez réessayer.");
        }
        throw new Error("Impossible de générer la carte mentale. Veuillez vérifier votre texte et réessayer.");
    }
};

export const extractTextFromImage = async (base64Data: string, mimeType: string): Promise<string> => {
    try {
        const imagePart = {
            inlineData: {
                data: base64Data,
                mimeType,
            },
        };

        const textPart = {
            text: "Extrais tout le texte visible dans cette image. Réponds uniquement avec le texte extrait, sans aucun commentaire, formatage, ou texte d'introduction comme 'Voici le texte extrait :'. Le résultat doit être le texte brut lui-même.",
        };

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
        });

        const extractedText = response.text.trim();
        if (!extractedText) {
            throw new Error("L'IA n'a pas pu extraire de texte de l'image. L'image est peut-être vide ou le texte n'est pas lisible.");
        }
        
        return extractedText;

    } catch (error) {
        console.error("Erreur lors de l'extraction du texte de l'image:", error);
        throw new Error("Impossible d'analyser l'image. Veuillez réessayer avec une image plus claire.");
    }
};

export const continueChat = async (
    history: Message[], 
    newMessage: string, 
    documentText: string, 
    useWebSearch: boolean
): Promise<GenerateContentResponse> => {
    const apiHistory: Content[] = history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
    }));

    const contents: Content[] = [...apiHistory, { role: 'user', parts: [{ text: newMessage }] }];

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents,
        config: {
            systemInstruction: getChatSystemInstruction(documentText, useWebSearch),
            tools: useWebSearch ? [{ googleSearch: {} }] : [],
        }
    });
    return response;
}

export const getChatSystemInstruction = (documentText: string, useWebSearch: boolean = false): string => {
    let instructionPrefix: string;

    if (useWebSearch) {
        instructionPrefix = `Tu es un assistant expert spécialisé dans l'analyse de documents et la recherche web. Ta mission est de répondre aux questions en te basant sur le document fourni. Si le document ne contient pas la réponse, ou pour obtenir des informations à jour, utilise la recherche web. Lorsque tu utilises des informations provenant du web, indique-le clairement.`;
    } else {
        instructionPrefix = `Tu es un assistant expert spécialisé dans l'analyse de documents. Ta seule et unique mission est de répondre aux questions en te basant *exclusivement* sur le texte qui t'a été fourni. Si une information n'est pas présente dans le texte, tu dois l'indiquer clairement en disant quelque chose comme "L'information n'a pas été trouvée dans le document fourni.". Ne fais aucune supposition et n'utilise pas de connaissances externes.`;
    }
    
    return `${instructionPrefix} Tes réponses doivent être entièrement en français. Voici le document de référence : \n\n---DEBUT DU DOCUMENT---\n${documentText}\n---FIN DU DOCUMENT---`;
};

export const startChatSession = (documentText: string, history: Message[] = []): Chat => {
    const apiHistory: Content[] = history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
    }));
    
    const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        history: apiHistory,
    });
    return chat;
};
