import React, { useState, useRef, useEffect } from 'react';
import { InfoIcon, HelpCircleIcon, LightbulbIcon, AlertCircleIcon } from './icons';

export type TooltipType = 'info' | 'help' | 'feature' | 'warning';
export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
    content: string | React.ReactNode;
    children: React.ReactNode;
    type?: TooltipType;
    position?: TooltipPosition;
    delay?: number;
    maxWidth?: number;
    className?: string;
    showArrow?: boolean;
    persistent?: boolean;
}

const Tooltip: React.FC<TooltipProps> = ({
    content,
    children,
    type = 'info',
    position = 'top',
    delay = 300,
    maxWidth = 250,
    className = '',
    showArrow = true,
    persistent = false
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout>();
    const tooltipRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLDivElement>(null);

    const getTypeStyles = () => {
        switch (type) {
            case 'info':
                return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-200';
            case 'help':
                return 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700 text-purple-800 dark:text-purple-200';
            case 'feature':
                return 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200';
            case 'warning':
                return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-200';
            default:
                return 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200';
        }
    };

    const getTypeIcon = () => {
        switch (type) {
            case 'info':
                return <InfoIcon className="h-4 w-4" />;
            case 'help':
                return <HelpCircleIcon className="h-4 w-4" />;
            case 'feature':
                return <LightbulbIcon className="h-4 w-4" />;
            case 'warning':
                return <AlertCircleIcon className="h-4 w-4" />;
            default:
                return <InfoIcon className="h-4 w-4" />;
        }
    };

    const getPositionStyles = () => {
        const baseStyles = 'absolute z-50 px-3 py-2 rounded-lg border shadow-lg text-sm font-medium';
        
        switch (position) {
            case 'top':
                return `${baseStyles} bottom-full left-1/2 transform -translate-x-1/2 mb-2`;
            case 'bottom':
                return `${baseStyles} top-full left-1/2 transform -translate-x-1/2 mt-2`;
            case 'left':
                return `${baseStyles} right-full top-1/2 transform -translate-y-1/2 mr-2`;
            case 'right':
                return `${baseStyles} left-full top-1/2 transform -translate-y-1/2 ml-2`;
            default:
                return `${baseStyles} bottom-full left-1/2 transform -translate-x-1/2 mb-2`;
        }
    };

    const getArrowStyles = () => {
        if (!showArrow) return '';
        
        const baseArrow = 'absolute w-2 h-2 transform rotate-45';
        
        switch (position) {
            case 'top':
                return `${baseArrow} top-full left-1/2 transform -translate-x-1/2 border-t border-l`;
            case 'bottom':
                return `${baseArrow} bottom-full left-1/2 transform -translate-x-1/2 border-b border-r`;
            case 'left':
                return `${baseArrow} left-full top-1/2 transform -translate-y-1/2 border-l border-b`;
            case 'right':
                return `${baseArrow} right-full top-1/2 transform -translate-y-1/2 border-r border-t`;
            default:
                return `${baseArrow} top-full left-1/2 transform -translate-x-1/2 border-t border-l`;
        }
    };

    const handleMouseEnter = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
            setIsVisible(true);
            setIsMounted(true);
        }, delay);
    };

    const handleMouseLeave = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        if (!persistent) {
            setIsVisible(false);
            setTimeout(() => setIsMounted(false), 200);
        }
    };

    const handleClick = () => {
        if (persistent) {
            setIsVisible(!isVisible);
            setIsMounted(!isMounted);
        }
    };

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return (
        <div 
            className={`relative inline-block ${className}`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
            ref={triggerRef}
        >
            {children}
            
            {isMounted && (
                <div
                    ref={tooltipRef}
                    className={`${getPositionStyles()} ${getTypeStyles()} transition-all duration-200 ${
                        isVisible 
                            ? 'opacity-100 scale-100' 
                            : 'opacity-0 scale-95 pointer-events-none'
                    }`}
                    style={{ maxWidth: `${maxWidth}px` }}
                >
                    <div className="flex items-start gap-2">
                        {getTypeIcon()}
                        <div className="flex-1">
                            {typeof content === 'string' ? (
                                <span>{content}</span>
                            ) : (
                                content
                            )}
                        </div>
                    </div>
                    
                    {showArrow && (
                        <div className={`${getArrowStyles()} ${getTypeStyles().split(' ')[0]}`} />
                    )}
                </div>
            )}
        </div>
    );
};

export default Tooltip; 