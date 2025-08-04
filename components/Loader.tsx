
import React from 'react';
import ElegantSpinner from './spinners/ElegantSpinner';
import LoadingContext from './LoadingContext';

interface LoaderProps {
  text?: string;
  type?: 'simple' | 'contextual';
  context?: 'generation' | 'export' | 'sessions' | 'files' | 'auth' | 'general';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  spinnerType?: 'dots' | 'bars' | 'circles' | 'pulse' | 'ripple' | 'wave' | 'orbit' | 'cube';
  className?: string;
}

const Loader: React.FC<LoaderProps> = ({ 
  text = "Analyse du document et création de votre matériel d'étude...",
  type = 'contextual',
  context = 'generation',
  size = 'lg',
  spinnerType = 'orbit',
  className = ''
}) => {
  // Si type est contextual, utiliser le composant contextuel
  if (type === 'contextual') {
    return (
      <LoadingContext
        context={context}
        text={text}
        size={size}
        className={className}
      />
    );
  }

  // Sinon, utiliser le spinner simple élégant
  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 ${className}`}>
      {/* Spinner élégant */}
      <div className="mb-6">
        <ElegantSpinner
          type={spinnerType}
          size={size}
          color="primary"
        />
      </div>
      
      <p className="mt-4 text-lg font-medium text-slate-700 dark:text-slate-300">{text}</p>
      <p className="text-sm text-slate-500 dark:text-slate-400">Cela peut prendre quelques secondes.</p>
    </div>
  );
};

export default Loader;
