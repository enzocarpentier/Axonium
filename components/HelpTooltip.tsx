import React from 'react';
import Tooltip, { TooltipPosition } from './Tooltip';

interface HelpTooltipProps {
    content: string | React.ReactNode;
    children: React.ReactNode;
    position?: TooltipPosition;
    delay?: number;
    maxWidth?: number;
    className?: string;
    persistent?: boolean;
}

const HelpTooltip: React.FC<HelpTooltipProps> = ({
    content,
    children,
    position = 'top',
    delay = 300,
    maxWidth = 300,
    className = '',
    persistent = false
}) => {
    return (
        <Tooltip
            content={content}
            type="help"
            position={position}
            delay={delay}
            maxWidth={maxWidth}
            className={className}
            persistent={persistent}
        >
            {children}
        </Tooltip>
    );
};

export default HelpTooltip; 