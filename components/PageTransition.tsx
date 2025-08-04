import React, { useEffect, useState } from 'react';

interface PageTransitionProps {
    children: React.ReactNode;
    isVisible: boolean;
    direction?: 'left' | 'right' | 'up' | 'down';
    duration?: number;
    className?: string;
}

const PageTransition: React.FC<PageTransitionProps> = ({
    children,
    isVisible,
    direction = 'up',
    duration = 300,
    className = ''
}) => {
    const [shouldRender, setShouldRender] = useState(isVisible);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (isVisible) {
            setShouldRender(true);
            setIsAnimating(true);
            const timer = setTimeout(() => setIsAnimating(false), duration);
            return () => clearTimeout(timer);
        } else {
            setIsAnimating(true);
            const timer = setTimeout(() => setShouldRender(false), duration);
            return () => clearTimeout(timer);
        }
    }, [isVisible, duration]);

    if (!shouldRender) return null;

    const getTransformClass = () => {
        const baseClass = 'transform transition-all duration-300 ease-in-out';
        const transformMap = {
            left: isVisible ? 'translate-x-0' : '-translate-x-full',
            right: isVisible ? 'translate-x-0' : 'translate-x-full',
            up: isVisible ? 'translate-y-0' : '-translate-y-full',
            down: isVisible ? 'translate-y-0' : 'translate-y-full'
        };
        return `${baseClass} ${transformMap[direction]}`;
    };

    const getOpacityClass = () => {
        return isVisible ? 'opacity-100' : 'opacity-0';
    };

    return (
        <div 
            className={`${getTransformClass()} ${getOpacityClass()} ${className}`}
            style={{ transitionDuration: `${duration}ms` }}
        >
            {children}
        </div>
    );
};

export default PageTransition; 