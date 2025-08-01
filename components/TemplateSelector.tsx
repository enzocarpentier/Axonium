import React, { useState } from 'react';
import type { Template, GenerationParameters } from '../types';
import { PREDEFINED_TEMPLATES, getTemplatesByCategory } from '../templates';
import { 
  SparklesIcon, 
  AcademicCapIcon, 
  BriefcaseIcon, 
  UserIcon, 
  PlusIcon,
  StarIcon,
  TagIcon,
  BookOpenIcon,
  ClipboardListIcon,
  BrainCircuitIcon,
  GraduationCapIcon,
  LayersIcon,
  HeartIcon,
  HeartFilledIcon,
  TrashIcon,
  UsersIcon
} from './icons';

interface TemplateSelectorProps {
  onTemplateSelect: (template: Template) => void;
  onCustomTemplateCreate: () => void;
  selectedTemplate?: Template;
  onToggleFavorite?: (templateId: string) => void;
  favoriteTemplates?: string[];
  userTemplates?: Template[];
  communityTemplates?: Template[];
  onDeleteTemplate?: (templateId: string) => void;
}

const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  onTemplateSelect,
  onCustomTemplateCreate,
  selectedTemplate,
  onToggleFavorite,
  favoriteTemplates = [],
  userTemplates = [],
  communityTemplates = [],
  onDeleteTemplate
}) => {
  const [selectedCategory, setSelectedCategory] = useState<Template['category']>('academic');
  const [searchTerm, setSearchTerm] = useState('');

  const categories = [
    { id: 'favorites', name: 'Favoris', icon: HeartFilledIcon, color: 'bg-red-500' },
    { id: 'academic', name: 'Académique', icon: AcademicCapIcon, color: 'bg-blue-500' },
    { id: 'professional', name: 'Professionnel', icon: BriefcaseIcon, color: 'bg-green-500' },
    { id: 'personal', name: 'Personnel', icon: UserIcon, color: 'bg-purple-500' },
    { id: 'community', name: 'Communautaire', icon: UsersIcon, color: 'bg-orange-500' }
  ] as const;

  const getTemplateIcon = (generationType: string) => {
    switch (generationType) {
      case 'summary': return BookOpenIcon;
      case 'qcm': return ClipboardListIcon;
      case 'revision_sheet': return LayersIcon;
      case 'mind_map': return BrainCircuitIcon;
      case 'guided_study': return GraduationCapIcon;
      default: return SparklesIcon;
    }
  };

  const getGenerationTypeLabel = (generationType: string) => {
    switch (generationType) {
      case 'summary': return 'Résumé';
      case 'qcm': return 'QCM';
      case 'revision_sheet': return 'Fiche de révision';
      case 'mind_map': return 'Carte mentale';
      case 'guided_study': return 'Étude guidée';
      case 'chat': return 'Chat interactif';
      default: return generationType;
    }
  };

  const getTemplatesForCategory = () => {
    let templates: Template[];
    
    if (selectedCategory === 'favorites') {
      // Inclure les templates prédéfinis, personnalisés ET communautaires dans les favoris
      const allTemplates = [...PREDEFINED_TEMPLATES, ...userTemplates, ...communityTemplates];
      templates = allTemplates.filter(template => 
        favoriteTemplates.includes(template.id)
      );
    } else if (selectedCategory === 'community') {
      // Pour la catégorie communautaire, afficher les templates partagés par d'autres utilisateurs
      templates = communityTemplates;
    } else {
      // Pour les autres catégories, afficher les templates prédéfinis ET les templates personnalisés NON partagés de cette catégorie
      const predefinedTemplates = getTemplatesByCategory(selectedCategory);
      const userTemplatesInCategory = userTemplates.filter(template => 
        template.category === selectedCategory && !template.isPublic
      );
      templates = [...predefinedTemplates, ...userTemplatesInCategory];
    }
    
    if (searchTerm) {
      return templates.filter(template => 
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    return templates;
  };

  const templates = getTemplatesForCategory();

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          Choisissez un Template
        </h2>
        <p className="text-slate-600">
          Sélectionnez un modèle prédéfini ou créez votre propre template
        </p>
      </div>

      {/* Barre de recherche */}
      <div className="relative">
        <input
          type="text"
          placeholder="Rechercher des templates..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 pl-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
        <SparklesIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
      </div>

      {/* Catégories */}
      <div className="flex space-x-2 overflow-x-auto pb-2">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                selectedCategory === category.id
                  ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-300'
                  : 'bg-white text-slate-600 border-2 border-slate-200 hover:border-slate-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="font-medium">{category.name}</span>
            </button>
          );
        })}
      </div>

      {/* Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template, index) => {
          const TemplateIcon = getTemplateIcon(template.parameters.generationType);
          const isSelected = selectedTemplate?.id === template.id;
          
          // Générer une clé unique en utilisant l'ID du template ou l'index
          const uniqueKey = template.id || `template-${index}-${template.name}`;
          
          return (
            <div
              key={uniqueKey}
              onClick={() => onTemplateSelect(template)}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-50 shadow-md'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
                              <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className={`p-2 rounded-lg ${isSelected ? 'bg-indigo-100' : 'bg-slate-100'}`}>
                      <TemplateIcon className={`h-5 w-5 ${isSelected ? 'text-indigo-600' : 'text-slate-600'}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">{template.name}</h3>
                      <p className="text-sm text-slate-500">{getGenerationTypeLabel(template.parameters.generationType)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    {onToggleFavorite && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(template.id);
                        }}
                        className="p-1 hover:bg-red-100 rounded-full transition-colors"
                      >
                        {favoriteTemplates.includes(template.id) ? (
                          <HeartFilledIcon className="h-4 w-4 text-red-500" />
                        ) : (
                          <HeartIcon className="h-4 w-4 text-slate-400 hover:text-red-500" />
                        )}
                      </button>
                    )}
                    {/* Bouton de suppression pour les templates personnalisés */}
                    {onDeleteTemplate && userTemplates.some(ut => ut.id === template.id) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Êtes-vous sûr de vouloir supprimer le template "${template.name}" ?`)) {
                            onDeleteTemplate(template.id);
                          }
                        }}
                        className="p-1 hover:bg-red-100 rounded-full transition-colors"
                        title="Supprimer le template"
                      >
                        <TrashIcon className="h-4 w-4 text-red-500 hover:text-red-700" />
                      </button>
                    )}
                  </div>
                </div>
              
              <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                {template.description}
              </p>
              
              <div className="flex flex-wrap gap-1 mb-3">
                {template.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-slate-100 text-slate-600"
                  >
                    <TagIcon className="h-3 w-3 mr-1" />
                    {tag}
                  </span>
                ))}
                {template.tags.length > 3 && (
                  <span className="text-xs text-slate-400">+{template.tags.length - 3}</span>
                )}
              </div>
              

            </div>
          );
        })}
      </div>

      {/* Bouton créer un template personnalisé */}
      <div className="text-center pt-4">
        <button
          onClick={onCustomTemplateCreate}
          className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Créer un Template Personnalisé</span>
        </button>
      </div>

      {templates.length === 0 && (
        <div className="text-center py-8">
          <SparklesIcon className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">
            {searchTerm ? 'Aucun template trouvé pour cette recherche.' : 'Aucun template disponible dans cette catégorie.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default TemplateSelector; 