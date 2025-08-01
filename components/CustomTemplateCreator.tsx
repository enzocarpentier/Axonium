import React, { useState } from 'react';
import { Template, GenerationParameters, GenerationType } from '../types';
import { XCircleIcon, PlusIcon, FileTextIcon } from './icons';

interface CustomTemplateCreatorProps {
    onClose: () => void;
    onSave: (template: Template) => void;
    currentUser: any;
}

const CustomTemplateCreator: React.FC<CustomTemplateCreatorProps> = ({ onClose, onSave, currentUser }) => {
    const [templateName, setTemplateName] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<'academic' | 'professional' | 'personal'>('personal');
    const [generationType, setGenerationType] = useState<GenerationType>('summary');
    const [numQuestions, setNumQuestions] = useState(10);
    const [difficulty, setDifficulty] = useState<'Facile' | 'Moyen' | 'Difficile'>('Moyen');
    const [isPublic, setIsPublic] = useState(false);

    const [targetAudience, setTargetAudience] = useState('');
    const [customInstructions, setCustomInstructions] = useState('');
    const [focus, setFocus] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [newTag, setNewTag] = useState('');

    const generationTypes = [
        { value: 'summary', label: 'Résumé' },
        { value: 'qcm', label: 'QCM' },
        { value: 'revision_sheet', label: 'Fiche de Révision' },
        { value: 'mind_map', label: 'Carte Mentale' },
        { value: 'chat', label: 'Chat' },
        { value: 'guided_study', label: 'Étude Guidée' }
    ];

    const categories = [
        { value: 'academic', label: 'Académique', color: 'bg-blue-100 text-blue-800' },
        { value: 'professional', label: 'Professionnel', color: 'bg-green-100 text-green-800' },
        { value: 'personal', label: 'Personnel', color: 'bg-purple-100 text-purple-800' }
    ];

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

    const handleSave = () => {
        console.log('handleSave appelé');
        
        if (!currentUser) {
            alert('Vous devez être connecté pour créer un template');
            return;
        }
        
        if (!templateName.trim()) {
            alert('Veuillez donner un nom à votre template');
            return;
        }

        // Créer les paramètres en supprimant les valeurs undefined
        const parameters: GenerationParameters = {
            generationType,
            ...(generationType === 'qcm' && { numQuestions }),
            ...(generationType === 'qcm' && { difficulty }),
            ...(targetAudience && { targetAudience }),
            ...(customInstructions && { customInstructions }),
            ...(focus && { focus }),
            systemPrompt: generateSystemPrompt({
                generationType,
                numQuestions,
                difficulty,
                targetAudience,
                customInstructions,
                focus
            })
        };

        const newTemplate: Template = {
            id: '', // L'ID sera généré par Firebase
            userId: currentUser.uid,
            name: templateName,
            description,
            category,
            parameters,
            isPublic: isPublic,
            createdAt: new Date().toISOString(),
            usageCount: 0,
            tags
        };

        console.log('Template créé:', newTemplate);
        console.log('Appel de onSave...');
        
        onSave(newTemplate);
        onClose();
    };

    const addTag = () => {
        if (newTag.trim() && !tags.includes(newTag.trim())) {
            setTags([...tags, newTag.trim()]);
            setNewTag('');
        }
    };

    const removeTag = (tagToRemove: string) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Créer un Template Personnalisé</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <XCircleIcon className="h-6 w-6" />
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Colonne gauche - Informations de base */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Nom du Template *
                            </label>
                            <input
                                type="text"
                                value={templateName}
                                onChange={(e) => setTemplateName(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Ex: Analyse Marketing"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Description
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                rows={3}
                                placeholder="Description de votre template..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Catégorie
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {categories.map((cat) => (
                                    <button
                                        key={cat.value}
                                        onClick={() => setCategory(cat.value as any)}
                                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                            category === cat.value
                                                ? cat.color
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    >
                                        {cat.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Type de Génération
                            </label>
                            <select
                                value={generationType}
                                onChange={(e) => setGenerationType(e.target.value as GenerationType)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {generationTypes.map((type) => (
                                    <option key={type.value} value={type.value}>
                                        {type.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {generationType === 'qcm' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Nombre de Questions
                                    </label>
                                    <input
                                        type="number"
                                        value={numQuestions}
                                        onChange={(e) => setNumQuestions(parseInt(e.target.value))}
                                        min="1"
                                        max="50"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Difficulté
                                    </label>
                                    <select
                                        value={difficulty}
                                        onChange={(e) => setDifficulty(e.target.value as any)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="Facile">Facile</option>
                                        <option value="Moyen">Moyen</option>
                                        <option value="Difficile">Difficile</option>
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Colonne droite - Paramètres avancés */}
                    <div className="space-y-4">


                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Public Cible
                            </label>
                            <input
                                type="text"
                                value={targetAudience}
                                onChange={(e) => setTargetAudience(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Ex: Étudiants en marketing"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Focus Principal
                            </label>
                            <input
                                type="text"
                                value={focus}
                                onChange={(e) => setFocus(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Ex: Analyse stratégique"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Instructions Personnalisées
                            </label>
                            <textarea
                                value={customInstructions}
                                onChange={(e) => setCustomInstructions(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                rows={4}
                                placeholder="Instructions spécifiques pour l'IA..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Tags
                            </label>
                            <div className="flex gap-2 mb-2">
                                <input
                                    type="text"
                                    value={newTag}
                                    onChange={(e) => setNewTag(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && addTag()}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Ajouter un tag..."
                                />
                                <button
                                    onClick={addTag}
                                    className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                                >
                                    <PlusIcon className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                    >
                                        {tag}
                                        <button
                                            onClick={() => removeTag(tag)}
                                            className="ml-1 text-blue-600 hover:text-blue-800"
                                        >
                                            <XCircleIcon className="h-3 w-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Aperçu du prompt généré */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Aperçu du Prompt IA Généré :</h3>
                    <div className="text-sm text-gray-600 bg-white p-3 rounded border">
                        <pre className="whitespace-pre-wrap text-xs">
                            {generateSystemPrompt({
                                generationType,
                                numQuestions,
                                difficulty,
                                targetAudience,
                                customInstructions,
                                focus
                            })}
                        </pre>
                    </div>
                </div>

                {/* Option de partage communautaire */}
                <div className="mt-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-medium text-orange-800 mb-1">Partage Communautaire</h3>
                            <p className="text-xs text-orange-600">
                                Rendre ce template visible par tous les utilisateurs de la communauté
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isPublic}
                                onChange={(e) => setIsPublic(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                        </label>
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
                        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center gap-2"
                    >
                        <FileTextIcon className="h-4 w-4" />
                        Créer le Template
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CustomTemplateCreator; 