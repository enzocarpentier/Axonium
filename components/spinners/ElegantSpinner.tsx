import React from 'react';

export type SpinnerType = 'dots' | 'bars' | 'circles' | 'pulse' | 'ripple' | 'wave' | 'orbit' | 'cube';

interface ElegantSpinnerProps {
    type?: SpinnerType;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    color?: 'primary' | 'secondary' | 'white' | 'indigo' | 'emerald' | 'amber';
    className?: string;
}

const ElegantSpinner: React.FC<ElegantSpinnerProps> = ({
    type = 'dots',
    size = 'md',
    color = 'primary',
    className = ''
}) => {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-8 h-8',
        lg: 'w-12 h-12',
        xl: 'w-16 h-16'
    };

    const colorClasses = {
        primary: 'text-indigo-600 dark:text-indigo-400',
        secondary: 'text-slate-600 dark:text-slate-400',
        white: 'text-white',
        indigo: 'text-indigo-500',
        emerald: 'text-emerald-500',
        amber: 'text-amber-500'
    };

    const renderSpinner = () => {
        const baseClasses = `${sizeClasses[size]} ${colorClasses[color]} ${className}`;

        switch (type) {
            case 'dots':
                return (
                    <div className={`flex space-x-1 ${baseClasses}`}>
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                );

            case 'bars':
                return (
                    <div className={`flex space-x-1 ${baseClasses}`}>
                        <div className="w-1 bg-current animate-pulse" style={{ animationDelay: '0ms', height: '100%' }}></div>
                        <div className="w-1 bg-current animate-pulse" style={{ animationDelay: '150ms', height: '100%' }}></div>
                        <div className="w-1 bg-current animate-pulse" style={{ animationDelay: '300ms', height: '100%' }}></div>
                        <div className="w-1 bg-current animate-pulse" style={{ animationDelay: '450ms', height: '100%' }}></div>
                    </div>
                );

            case 'circles':
                return (
                    <div className={`relative ${baseClasses}`}>
                        <div className="absolute inset-0 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                        <div className="absolute inset-2 border-2 border-current border-t-transparent rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                    </div>
                );

            case 'pulse':
                return (
                    <div className={`${baseClasses} bg-current rounded-full animate-pulse`}></div>
                );

            case 'ripple':
                return (
                    <div className={`relative ${baseClasses}`}>
                        <div className="absolute inset-0 border-2 border-current rounded-full animate-ping opacity-75"></div>
                        <div className="absolute inset-2 border-2 border-current rounded-full animate-ping opacity-50" style={{ animationDelay: '0.5s' }}></div>
                        <div className="absolute inset-4 border-2 border-current rounded-full animate-ping opacity-25" style={{ animationDelay: '1s' }}></div>
                    </div>
                );

            case 'wave':
                return (
                    <div className={`flex space-x-1 ${baseClasses}`}>
                        <div className="w-1 bg-current animate-wave" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-1 bg-current animate-wave" style={{ animationDelay: '100ms' }}></div>
                        <div className="w-1 bg-current animate-wave" style={{ animationDelay: '200ms' }}></div>
                        <div className="w-1 bg-current animate-wave" style={{ animationDelay: '300ms' }}></div>
                        <div className="w-1 bg-current animate-wave" style={{ animationDelay: '400ms' }}></div>
                    </div>
                );

            case 'orbit':
                return (
                    <div className={`relative ${baseClasses}`}>
                        <div className="absolute inset-0 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                        <div className="absolute top-0 left-1/2 w-2 h-2 bg-current rounded-full transform -translate-x-1/2 animate-orbit"></div>
                    </div>
                );

            case 'cube':
                return (
                    <div className={`relative ${baseClasses} animate-cube`}>
                        <div className="absolute inset-0 bg-current transform rotate-45"></div>
                        <div className="absolute inset-0 bg-current transform -rotate-45"></div>
                    </div>
                );

            default:
                return (
                    <div className={`${baseClasses} border-2 border-current border-t-transparent rounded-full animate-spin`}></div>
                );
        }
    };

    return renderSpinner();
};

export default ElegantSpinner; 