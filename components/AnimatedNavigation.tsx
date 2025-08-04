import React from 'react';

interface AnimatedNavigationProps {
    children: React.ReactNode;
    isActive: boolean;
    onClick: () => void;
    className?: string;
}

const AnimatedNavigation: React.FC<AnimatedNavigationProps> = ({
    children,
    isActive,
    onClick,
    className = ''
}) => {
    return (
        <button
            onClick={onClick}
            className={`text-sm font-medium transition-all duration-300 ease-in-out button-animate ${className} ${
                isActive 
                    ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 scale-105' 
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:scale-105'
            }`}
        >
            {children}
        </button>
    );
};

export default AnimatedNavigation; 