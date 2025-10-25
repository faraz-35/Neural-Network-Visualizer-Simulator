import React from 'react';
import type { Connection, Neuron } from '../types';

interface ConnectionProps {
    connection: Connection;
    fromNeuron: Neuron;
    toNeuron: Neuron;
    isSelected: boolean;
    onClick: () => void;
    isSimulating: boolean;
}

export const ConnectionComponent: React.FC<ConnectionProps> = ({
    connection, fromNeuron, toNeuron, isSelected, onClick, isSimulating
}) => {
    const midX = (fromNeuron.x + toNeuron.x) / 2;
    const midY = (fromNeuron.y + toNeuron.y) / 2;
    
    const strokeWidth = Math.max(0.5, Math.min(5, Math.abs(connection.weight) * 2.5));
    const strokeColor = connection.weight > 0 ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400';

    return (
        <g onClick={onClick} className="cursor-pointer group">
            <line
                x1={fromNeuron.x}
                y1={fromNeuron.y}
                x2={toNeuron.x}
                y2={toNeuron.y}
                className={`
                    stroke-current transition-all duration-300
                    ${isSimulating ? 'animate-pulse' : ''}
                    ${isSelected ? 'text-blue-500' : `${strokeColor} opacity-50 group-hover:opacity-100`}
                `}
                strokeWidth={isSelected ? strokeWidth + 1 : strokeWidth}
                style={{ filter: isSelected ? 'url(#glow)' : 'none' }}
            />
            <rect 
                x={midX - 22}
                y={midY - 12}
                width="44"
                height="24"
                rx="12"
                className="fill-gray-100 dark:fill-gray-800 opacity-0 group-hover:opacity-90 transition-opacity"
            />
            <text
                x={midX}
                y={midY}
                textAnchor="middle"
                dy=".3em"
                className={`fill-current text-gray-900 dark:text-gray-50 text-xs font-mono font-medium transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                style={{ userSelect: 'none' }}
            >
                {connection.weight.toFixed(2)}
            </text>
        </g>
    );
};
