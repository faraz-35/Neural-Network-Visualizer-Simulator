import React, { useState, useCallback, useRef } from 'react';
import type { NeuralNetwork, Neuron, Connection, SelectedElement } from '../types';
import { NeuronComponent } from './Neuron';
import { ConnectionComponent } from './Connection';
import { usePanAndZoom } from '../hooks/usePanAndZoom';

interface CanvasProps {
    network: NeuralNetwork;
    updateNeuronPosition: (neuronId: string, x: number, y: number) => void;
    selectedElement: SelectedElement | null;
    setSelectedElement: (element: SelectedElement | null) => void;
    createConnection: (fromNeuronId: string, toNeuronId: string) => void;
    isSimulating: boolean;
    simulationLayer: number | null;
}

export const Canvas: React.FC<CanvasProps> = ({
    network,
    updateNeuronPosition,
    selectedElement,
    setSelectedElement,
    createConnection,
    isSimulating,
    simulationLayer,
}) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const { transform, pan, zoom } = usePanAndZoom(svgRef);

    const [stickyDraggingNeuron, setStickyDraggingNeuron] = useState<string | null>(null);
    const [connectionStart, setConnectionStart] = useState<string | null>(null);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
        if (stickyDraggingNeuron) {
            setStickyDraggingNeuron(null); // Drop the neuron
            return;
        }

        if (e.target === svgRef.current) {
            pan.start(e.clientX, e.clientY);
            setSelectedElement(null);
            setConnectionStart(null);
        }
    }, [pan, setSelectedElement, stickyDraggingNeuron]);

    const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
        if (!svgRef.current) return;
        
        const CTM = svgRef.current.getScreenCTM();
        if (!CTM) return;
        
        const transformedPoint = {
            x: (e.clientX - CTM.e) / CTM.a,
            y: (e.clientY - CTM.f) / CTM.d,
        };

        setMousePosition({ x: e.clientX, y: e.clientY });

        if (stickyDraggingNeuron) {
            updateNeuronPosition(stickyDraggingNeuron, transformedPoint.x, transformedPoint.y);
        } else {
            pan.move(e.clientX, e.clientY);
        }
    }, [pan, stickyDraggingNeuron, updateNeuronPosition]);

    const handleMouseUp = useCallback(() => {
        pan.end();
    }, [pan]);

    const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
        zoom(e.deltaY, e.clientX, e.clientY);
    }, [zoom]);

    const handleNeuronMouseDown = useCallback((neuronId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        
        if (stickyDraggingNeuron) {
            setStickyDraggingNeuron(null); // Drop the neuron
            if (stickyDraggingNeuron !== neuronId) {
                setSelectedElement({ type: 'neuron', id: neuronId }); // Select the new one if different
            }
            return;
        }

        if (e.ctrlKey || e.metaKey) {
            setConnectionStart(neuronId);
        } else {
            setSelectedElement({ type: 'neuron', id: neuronId });
        }
    }, [setSelectedElement, stickyDraggingNeuron]);

    const handleNeuronMouseUp = useCallback((neuronId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (connectionStart && connectionStart !== neuronId) {
            createConnection(connectionStart, neuronId);
        }
        setConnectionStart(null);
    }, [connectionStart, createConnection]);

    const handleNeuronDoubleClick = useCallback((neuronId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!stickyDraggingNeuron) {
            setStickyDraggingNeuron(neuronId);
            setSelectedElement({ type: 'neuron', id: neuronId });
            setConnectionStart(null);
        }
    }, [stickyDraggingNeuron, setSelectedElement]);

    const allNeurons = network.layers.flatMap(layer => layer.neurons);
    const startNeuronPos = connectionStart ? allNeurons.find(n => n.id === connectionStart) : null;
    
    const CTM = svgRef.current?.getScreenCTM();
    const endPoint = CTM ? {
        x: (mousePosition.x - CTM.e) / CTM.a,
        y: (mousePosition.y - CTM.f) / CTM.d
    } : { x: 0, y: 0 };

    return (
        <main className="flex-1 bg-gray-200 dark:bg-gray-800 relative cursor-grab" style={{ userSelect: 'none', cursor: stickyDraggingNeuron ? 'move' : 'grab' }}>
            <svg
                ref={svgRef}
                className="w-full h-full"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
            >
                <defs>
                    <pattern id="dot-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                        <circle cx="1" cy="1" r="1" className="fill-current text-gray-300 dark:text-gray-700" />
                    </pattern>
                    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                <rect width="100%" height="100%" fill="url(#dot-grid)" />

                <g transform={transform}>
                    {network.connections.map(conn => {
                        const fromNeuron = allNeurons.find(n => n.id === conn.fromNeuronId);
                        const toNeuron = allNeurons.find(n => n.id === conn.toNeuronId);
                        if (!fromNeuron || !toNeuron) return null;

                        return (
                            <ConnectionComponent
                                key={conn.id}
                                connection={conn}
                                fromNeuron={fromNeuron}
                                toNeuron={toNeuron}
                                isSelected={selectedElement?.id === conn.id}
                                onClick={() => setSelectedElement({ type: 'connection', id: conn.id })}
                                isSimulating={isSimulating && toNeuron.layerIndex === simulationLayer}
                            />
                        );
                    })}
                     {connectionStart && startNeuronPos && (
                        <line
                            x1={startNeuronPos.x}
                            y1={startNeuronPos.y}
                            x2={endPoint.x}
                            y2={endPoint.y}
                            className="stroke-current text-blue-500"
                            strokeWidth="2"
                            strokeDasharray="5,5"
                        />
                    )}
                    {allNeurons.map(neuron => (
                        <NeuronComponent
                            key={neuron.id}
                            neuron={neuron}
                            isSelected={selectedElement?.id === neuron.id || stickyDraggingNeuron === neuron.id}
                            onMouseDown={(e) => handleNeuronMouseDown(neuron.id, e)}
                            onMouseUp={(e) => handleNeuronMouseUp(neuron.id, e)}
                            onDoubleClick={(e) => handleNeuronDoubleClick(neuron.id, e)}
                            isSimulating={isSimulating && neuron.layerIndex === simulationLayer}
                        />
                    ))}
                </g>
            </svg>
            <div className="absolute bottom-4 right-4 bg-gray-900/50 dark:bg-black/50 text-white p-3 rounded-lg text-xs backdrop-blur-sm shadow-lg space-y-1">
                <p><strong className="font-bold">Pan:</strong> Click & Drag BG</p>
                <p><strong className="font-bold">Zoom:</strong> Scroll</p>
                <p><strong className="font-bold">Move:</strong> Dbl-Click Neuron</p>
                <p><strong className="font-bold">Drop:</strong> Click anywhere</p>
                <p><strong className="font-bold">Connect:</strong> Ctrl/Cmd + Drag</p>
            </div>
        </main>
    );
};