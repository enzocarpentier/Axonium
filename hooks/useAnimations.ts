import { useState, useEffect, useCallback } from 'react';

interface AnimationConfig {
    duration?: number;
    delay?: number;
    easing?: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'cubic-bezier(0.4, 0, 0.2, 1)';
}

interface UseAnimationsReturn {
    isAnimating: boolean;
    startAnimation: () => void;
    stopAnimation: () => void;
    animationClass: string;
    prefersReducedMotion: boolean;
}

export const useAnimations = (config: AnimationConfig = {}): UseAnimationsReturn => {
    const [isAnimating, setIsAnimating] = useState(false);
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

    const {
        duration = 300,
        delay = 0,
        easing = 'cubic-bezier(0.4, 0, 0.2, 1)'
    } = config;

    // Détecter la préférence de réduction de mouvement
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        setPrefersReducedMotion(mediaQuery.matches);

        const handleChange = (e: MediaQueryListEvent) => {
            setPrefersReducedMotion(e.matches);
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    const startAnimation = useCallback(() => {
        if (!prefersReducedMotion) {
            setIsAnimating(true);
            setTimeout(() => setIsAnimating(false), duration + delay);
        }
    }, [duration, delay, prefersReducedMotion]);

    const stopAnimation = useCallback(() => {
        setIsAnimating(false);
    }, []);

    const animationClass = prefersReducedMotion 
        ? 'transition-none' 
        : `transition-all duration-${duration} ease-in-out`;

    return {
        isAnimating,
        startAnimation,
        stopAnimation,
        animationClass,
        prefersReducedMotion
    };
};

// Hook pour les animations de page
export const usePageTransition = (isVisible: boolean, direction: 'left' | 'right' | 'up' | 'down' = 'up') => {
    const [shouldRender, setShouldRender] = useState(isVisible);
    const [isTransitioning, setIsTransitioning] = useState(false);

    useEffect(() => {
        if (isVisible) {
            setShouldRender(true);
            setIsTransitioning(true);
            setTimeout(() => setIsTransitioning(false), 300);
        } else {
            setIsTransitioning(true);
            setTimeout(() => setShouldRender(false), 300);
        }
    }, [isVisible]);

    const getTransitionClass = () => {
        if (prefersReducedMotion) return '';
        
        const baseClass = 'transition-all duration-300 ease-in-out';
        const transformMap = {
            left: isVisible ? 'translate-x-0' : '-translate-x-full',
            right: isVisible ? 'translate-x-0' : 'translate-x-full',
            up: isVisible ? 'translate-y-0' : '-translate-y-full',
            down: isVisible ? 'translate-y-0' : 'translate-y-full'
        };
        
        return `${baseClass} ${transformMap[direction]} ${isVisible ? 'opacity-100' : 'opacity-0'}`;
    };

    return {
        shouldRender,
        isTransitioning,
        transitionClass: getTransitionClass()
    };
};

// Hook pour les animations de liste
export const useListAnimation = (items: any[], staggerDelay: number = 100) => {
    const [animatedItems, setAnimatedItems] = useState<any[]>([]);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (items.length > 0) {
            setIsAnimating(true);
            setAnimatedItems([]);

            items.forEach((item, index) => {
                setTimeout(() => {
                    setAnimatedItems(prev => [...prev, item]);
                }, index * staggerDelay);
            });

            const totalDuration = items.length * staggerDelay + 300;
            setTimeout(() => setIsAnimating(false), totalDuration);
        }
    }, [items, staggerDelay]);

    return {
        animatedItems,
        isAnimating
    };
};

// Variable globale pour les préférences de mouvement
let prefersReducedMotion = false;

if (typeof window !== 'undefined') {
    prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
} 