import React from 'react';
import Tooltip, { TooltipPosition } from './Tooltip';

interface FeatureTooltipProps {
    content: string | React.ReactNode;
    children: React.ReactNode;
    position?: TooltipPosition;
    delay?: number;
    maxWidth?: number;
    className?: string;
}

const FeatureTooltip: React.FC<FeatureTooltipProps> = ({
    content,
    children,
    position = 'top',
    delay = 300,
    maxWidth = 280,
    className = ''
}) => {
    return (
        <Tooltip
            content={content}
            type="feature"
            position={position}
            delay={delay}
            maxWidth={maxWidth}
            className={className}
        >
            {children}
        </Tooltip>
    );
};

export default FeatureTooltip; 