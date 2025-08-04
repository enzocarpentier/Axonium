import React, { useEffect, useState } from 'react';

interface AnimatedListProps {
    children: React.ReactNode;
    className?: string;
    staggerDelay?: number;
    animationDuration?: number;
    animationType?: 'fade' | 'slide' | 'scale';
}

const AnimatedList: React.FC<AnimatedListProps> = ({
    children,
    className = '',
    staggerDelay = 100,
    animationDuration = 300,
    animationType = 'fade'
}) => {
    const [animatedItems, setAnimatedItems] = useState<React.ReactNode[]>([]);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (React.Children.count(children) > 0) {
            setIsAnimating(true);
            
            // Convertir les enfants en tableau
            const childrenArray = React.Children.toArray(children);
            
            // Animer chaque élément avec un délai
            childrenArray.forEach((child, index) => {
                setTimeout(() => {
                    setAnimatedItems(prev => {
                        const newItems = [...prev];
                        newItems[index] = child;
                        return newItems;
                    });
                }, index * staggerDelay);
            });

            // Fin de l'animation
            const totalDuration = childrenArray.length * staggerDelay + animationDuration;
            setTimeout(() => setIsAnimating(false), totalDuration);
        }
    }, [children, staggerDelay, animationDuration]);

    const getAnimationClass = (index: number) => {
        const baseClass = 'transition-all duration-300 ease-out';
        const delay = index * staggerDelay;
        
        switch (animationType) {
            case 'fade':
                return `${baseClass} opacity-0 animate-fade-in`;
            case 'slide':
                return `${baseClass} transform translate-y-4 opacity-0 animate-slide-in`;
            case 'scale':
                return `${baseClass} transform scale-95 opacity-0 animate-scale-in`;
            default:
                return `${baseClass} opacity-0 animate-fade-in`;
        }
    };

    return (
        <div className={className}>
            {animatedItems.map((item, index) => (
                <div
                    key={index}
                    className={getAnimationClass(index)}
                    style={{
                        animationDelay: `${index * staggerDelay}ms`,
                        animationDuration: `${animationDuration}ms`,
                        animationFillMode: 'forwards'
                    }}
                >
                    {item}
                </div>
            ))}
        </div>
    );
};

export default AnimatedList; 