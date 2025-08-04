import React, { useEffect, useState } from 'react';

interface AnimatedContentProps {
    children: React.ReactNode;
    className?: string;
    animationType?: 'fade' | 'slide' | 'scale' | 'bounce';
    delay?: number;
    duration?: number;
}

const AnimatedContent: React.FC<AnimatedContentProps> = ({
    children,
    className = '',
    animationType = 'fade',
    delay = 0,
    duration = 300
}) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(true);
        }, delay);

        return () => clearTimeout(timer);
    }, [delay]);

    const getAnimationClass = () => {
        const baseClass = 'transition-all duration-300 ease-out';
        
        if (!isVisible) {
            switch (animationType) {
                case 'fade':
                    return `${baseClass} opacity-0`;
                case 'slide':
                    return `${baseClass} opacity-0 transform translate-y-4`;
                case 'scale':
                    return `${baseClass} opacity-0 transform scale-95`;
                case 'bounce':
                    return `${baseClass} opacity-0 transform scale-90`;
                default:
                    return `${baseClass} opacity-0`;
            }
        }

        return `${baseClass} opacity-100`;
    };

    return (
        <div 
            className={`${getAnimationClass()} ${className}`}
            style={{ transitionDuration: `${duration}ms` }}
        >
            {children}
        </div>
    );
};

export default AnimatedContent; 