import React from 'react';
import type { Neuron } from '../types';

interface NeuronProps {
    neuron: Neuron;
    isSelected: boolean;
    onMouseDown: (e: React.MouseEvent) => void;
    onMouseUp: (e: React.MouseEvent) => void;
    onDoubleClick: (e: React.MouseEvent) => void;
    isSimulating: boolean;
}

export const NeuronComponent: React.FC<NeuronProps> = ({ neuron, isSelected, onMouseDown, onMouseUp, onDoubleClick, isSimulating }) => {
    const radius = 30;
    const activationOpacity = Math.min(1, Math.abs(neuron.activation));
    const activationColor = neuron.activation >= 0 ? 'rgba(52, 211, 153,' : 'rgba(251, 113, 133,'; // emerald-400 for positive, rose-400 for negative
    
    return (
        <g 
            transform={`translate(${neuron.x}, ${neuron.y})`} 
            onMouseDown={onMouseDown} 
            onMouseUp={onMouseUp} 
            onDoubleClick={onDoubleClick}
            className="cursor-pointer group"
            style={{ filter: isSelected ? 'url(#glow)' : 'none' }}
        >
            <circle
                cx="0"
                cy="0"
                r={radius}
                className={`
                    stroke-2 transition-all duration-300
                    ${isSelected ? 'stroke-blue-500' : 'stroke-gray-600 dark:stroke-gray-300 group-hover:stroke-blue-400'}
                    ${isSimulating ? 'animate-pulse' : ''}
                `}
                fill={`${activationColor}${activationOpacity})`}
            />
             <circle
                cx="0"
                cy="0"
                r={radius}
                fill="transparent"
             />
            <text
                x="0"
                y="0"
                textAnchor="middle"
                dy=".3em"
                className="fill-current text-gray-900 dark:text-gray-50 font-mono text-sm font-medium pointer-events-none select-none"
                style={{ userSelect: 'none' }}
            >
                {neuron.activation.toFixed(2)}
            </text>
        </g>
    );
};