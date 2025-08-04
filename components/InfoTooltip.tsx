import React from 'react';
import Tooltip, { TooltipPosition } from './Tooltip';

interface InfoTooltipProps {
    content: string | React.ReactNode;
    children: React.ReactNode;
    position?: TooltipPosition;
    delay?: number;
    maxWidth?: number;
    className?: string;
}

const InfoTooltip: React.FC<InfoTooltipProps> = ({
    content,
    children,
    position = 'top',
    delay = 300,
    maxWidth = 250,
    className = ''
}) => {
    return (
        <Tooltip
            content={content}
            type="info"
            position={position}
            delay={delay}
            maxWidth={maxWidth}
            className={className}
        >
            {children}
        </Tooltip>
    );
};

export default InfoTooltip; 