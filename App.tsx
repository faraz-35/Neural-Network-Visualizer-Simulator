import React, { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Canvas } from './components/Canvas';
import { Sidebar } from './components/Sidebar';
import { getInitialNetwork, runForwardPropagation, runTrainingStep } from './utils/network';
import type { NeuralNetwork, Neuron, Connection, SelectedElement, ActivationFunction, Layer } from './types';

const App: React.FC = () => {
    const [network, setNetwork] = useState<NeuralNetwork>(getInitialNetwork());
    const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');
    const [isSimulating, setIsSimulating] = useState(false);
    const [simulationLayer, setSimulationLayer] = useState<number | null>(null);
    const [learningRate, setLearningRate] = useState(0.1);
    const [loss, setLoss] = useState<number | null>(null);

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [theme]);
    
    const toggleTheme = useCallback(() => {
        setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
    }, []);

    const updateNeuronPosition = useCallback((neuronId: string, x: number, y: number) => {
        setNetwork(prev => {
            const newLayers = prev.layers.map(layer => ({
                ...layer,
                neurons: layer.neurons.map(n => n.id === neuronId ? { ...n, x, y } : n)
            }));
            return { ...prev, layers: newLayers };
        });
    }, []);

    const addLayer = useCallback(() => {
        setNetwork(prev => {
            if (prev.layers.length >= 10) return prev; // Safety cap

            const insertionIndex = prev.layers.length - 1; // Insert before the output layer
            const lastHiddenLayer = prev.layers[insertionIndex - 1];
            const outputLayer = prev.layers[insertionIndex];

            // 1. Define the new layer, matching the neuron count of the previous layer.
            const newLayerId = `layer-${uuidv4()}`;
            const newLayerX = (lastHiddenLayer.neurons[0]?.x || 100) + 150;
            const numNeurons = lastHiddenLayer.neurons.length;
            
            const newNeurons: Neuron[] = [];
            // Attempt to center the new neurons vertically relative to the canvas's typical center
            const totalHeight = (numNeurons - 1) * 100;
            const startY = 200 - totalHeight / 2;

            for (let i = 0; i < numNeurons; i++) {
                newNeurons.push({
                    id: uuidv4(),
                    layerIndex: insertionIndex,
                    neuronIndex: i,
                    x: newLayerX,
                    y: startY + i * 100, // Stagger Y position
                    bias: 0,
                    activation: 0,
                });
            }
            const newLayer: Layer = { id: newLayerId, neurons: newNeurons };

            // 2. Shift the output layer to make space visually.
            const updatedOutputLayer: Layer = {
                ...outputLayer,
                neurons: outputLayer.neurons.map(n => ({
                    ...n,
                    x: n.x + 150
                }))
            };
            
            // 3. Reconstruct the layers array.
            const newLayers = [
                ...prev.layers.slice(0, insertionIndex),
                newLayer,
                updatedOutputLayer
            ];
            // Re-index all neurons to ensure their layerIndex is correct.
            newLayers.forEach((layer, lIndex) => {
                layer.neurons.forEach(neuron => neuron.layerIndex = lIndex);
            });
            
            // 4. Rewire the connections.
            // Remove connections that now "jump" over the new layer (from lastHiddenLayer to outputLayer).
            const lastHiddenNeuronIds = new Set(lastHiddenLayer.neurons.map(n => n.id));
            const outputNeuronIds = new Set(outputLayer.neurons.map(n => n.id));

            const connectionsToKeep = prev.connections.filter(c => 
                !(lastHiddenNeuronIds.has(c.fromNeuronId) && outputNeuronIds.has(c.toNeuronId))
            );

            let newConnections = [...connectionsToKeep];
            
            // Connect last hidden layer to the new layer (fully connected).
            for (const prevNeuron of lastHiddenLayer.neurons) {
                for (const newNeuron of newLayer.neurons) {
                    newConnections.push({
                        id: uuidv4(),
                        fromNeuronId: prevNeuron.id,
                        toNeuronId: newNeuron.id,
                        weight: Math.random() * 2 - 1,
                    });
                }
            }

            // Connect the new layer to the output layer (fully connected).
            for (const newNeuron of newLayer.neurons) {
                for (const outNeuron of updatedOutputLayer.neurons) {
                    newConnections.push({
                        id: uuidv4(),
                        fromNeuronId: newNeuron.id,
                        toNeuronId: outNeuron.id,
                        weight: Math.random() * 2 - 1,
                    });
                }
            }

            return { ...prev, layers: newLayers, connections: newConnections };
        });
        setSelectedElement(null);
    }, []);


    const removeLayer = useCallback(() => {
        setNetwork(prev => {
            if (prev.layers.length <= 2) return prev; // Keep input and output layers

            const lastHiddenLayerIndex = prev.layers.length - 2;
            const layerToRemove = prev.layers[lastHiddenLayerIndex];
            const layerBefore = prev.layers[lastHiddenLayerIndex - 1];
            const outputLayer = prev.layers[prev.layers.length - 1];
            
            // Remove the layer
            const newLayers = prev.layers.filter(l => l.id !== layerToRemove.id);

            // Re-index layers and shift output layer back
            newLayers.forEach((layer, index) => {
                layer.neurons.forEach(neuron => {
                    neuron.layerIndex = index;
                    if (index === newLayers.length - 1) { // If it's the new output layer
                        neuron.x -= 150;
                    }
                });
            });

            // --- Connection Management ---
            const neuronIdsToRemove = new Set(layerToRemove.neurons.map(n => n.id));
            const connectionsToKeep = prev.connections.filter(c => 
                !neuronIdsToRemove.has(c.fromNeuronId) && !neuronIdsToRemove.has(c.toNeuronId)
            );
            const newConnections = [...connectionsToKeep];

            // Reconnect the gap: layerBefore <-> outputLayer
            layerBefore.neurons.forEach(prevNeuron => {
                outputLayer.neurons.forEach(outNeuron => {
                    newConnections.push({
                        id: uuidv4(),
                        fromNeuronId: prevNeuron.id,
                        toNeuronId: outNeuron.id,
                        weight: Math.random() * 2 - 1,
                    });
                });
            });
            
            return { ...prev, layers: newLayers, connections: newConnections };
        });
        setSelectedElement(null);
    }, []);
    
    const addNeuronToLayer = useCallback((layerIndex: number) => {
        setNetwork(prev => {
            const layer = prev.layers[layerIndex];
            if (!layer) return prev;

            const newNeuronIndex = layer.neurons.length;
            const newNeuron: Neuron = {
                id: uuidv4(),
                layerIndex: layerIndex,
                neuronIndex: newNeuronIndex,
                x: layer.neurons[0]?.x || 150 * layerIndex + 100,
                y: 200 + newNeuronIndex * 100,
                bias: 0,
                activation: 0
            };

            const newLayers = [...prev.layers];
            newLayers[layerIndex] = { ...layer, neurons: [...layer.neurons, newNeuron] };
            
            const newConnections = [...prev.connections];

            // Connect from previous layer to new neuron
            if (layerIndex > 0) {
                const previousLayer = prev.layers[layerIndex - 1];
                previousLayer.neurons.forEach(prevNeuron => {
                    newConnections.push({
                        id: uuidv4(),
                        fromNeuronId: prevNeuron.id,
                        toNeuronId: newNeuron.id,
                        weight: Math.random() * 2 - 1
                    });
                });
            }

            // Connect from new neuron to next layer
            if (layerIndex < prev.layers.length - 1) {
                const nextLayer = prev.layers[layerIndex + 1];
                nextLayer.neurons.forEach(nextNeuron => {
                    newConnections.push({
                        id: uuidv4(),
                        fromNeuronId: newNeuron.id,
                        toNeuronId: nextNeuron.id,
                        weight: Math.random() * 2 - 1
                    });
                });
            }

            return { ...prev, layers: newLayers, connections: newConnections };
        });
    }, []);

    const removeNeuron = useCallback((neuronId: string) => {
       setNetwork(prev => {
            let layerIndexToRemoveFrom: number | null = null;
            const newLayers = prev.layers.map((layer, lIndex) => {
                const neuronExists = layer.neurons.some(n => n.id === neuronId);
                if (!neuronExists) return layer;
                
                // Prevent removing the last neuron from any layer
                if (layer.neurons.length === 1) return layer;

                layerIndexToRemoveFrom = lIndex;
                const newNeurons = layer.neurons.filter(n => n.id !== neuronId).map((n, nIndex) => ({...n, neuronIndex: nIndex}));
                return {...layer, neurons: newNeurons};
            });

            const newConnections = prev.connections.filter(c => c.fromNeuronId !== neuronId && c.toNeuronId !== neuronId);
            return {...prev, layers: newLayers, connections: newConnections };
        });
        setSelectedElement(null);
    }, []);

    const createConnection = useCallback((fromNeuronId: string, toNeuronId: string) => {
        setNetwork(prev => {
            const fromNeuron = prev.layers.flatMap(l => l.neurons).find(n => n.id === fromNeuronId);
            const toNeuron = prev.layers.flatMap(l => l.neurons).find(n => n.id === toNeuronId);

            if (!fromNeuron || !toNeuron || fromNeuron.layerIndex >= toNeuron.layerIndex) {
                return prev; // No backward connections
            }

            const existingConnection = prev.connections.find(c => c.fromNeuronId === fromNeuronId && c.toNeuronId === toNeuronId);
            if (existingConnection) return prev;
            
            const newConnection = {
                id: uuidv4(),
                fromNeuronId,
                toNeuronId,
                weight: Math.random() * 2 - 1 // Random weight between -1 and 1
            };
            return { ...prev, connections: [...prev.connections, newConnection] };
        });
    }, []);
    
    const deleteConnection = useCallback((connectionId: string) => {
        setNetwork(prev => ({
            ...prev,
            connections: prev.connections.filter(c => c.id !== connectionId)
        }));
        setSelectedElement(null);
    }, []);

    const updateSelectedValue = useCallback((key: 'weight' | 'bias' | 'activation' | 'target', value: number) => {
        if (!selectedElement) return;

        if (selectedElement.type === 'neuron') {
            setNetwork(prev => ({
                ...prev,
                layers: prev.layers.map(l => ({
                    ...l,
                    neurons: l.neurons.map(n => n.id === selectedElement.id ? { ...n, [key]: value } : n)
                }))
            }));
        } else if (selectedElement.type === 'connection' && key === 'weight') {
            setNetwork(prev => ({
                ...prev,
                connections: prev.connections.map(c => c.id === selectedElement.id ? { ...c, weight: value } : c)
            }));
        }
    }, [selectedElement]);
    
    const setActivationFunction = useCallback((func: ActivationFunction) => {
        setNetwork(prev => ({ ...prev, activationFunction: func }));
    }, []);

    const handleRunSimulation = useCallback(() => {
        if (isSimulating) return;
        setIsSimulating(true);

        const layerCount = network.layers.length;
        let currentLayer = 0;

        const animateLayer = () => {
            if (currentLayer < layerCount) {
                setSimulationLayer(currentLayer);
                const propagatedNetwork = runForwardPropagation(network, currentLayer);
                setNetwork(propagatedNetwork);
                // Calculate loss at the end
                if (currentLayer === layerCount - 1) {
                    const outputLayer = propagatedNetwork.layers[propagatedNetwork.layers.length - 1];
                    let currentLoss = 0;
                    let targetsFound = 0;
                    outputLayer.neurons.forEach(n => {
                        if(n.target !== undefined) {
                            currentLoss += Math.pow(n.target - n.activation, 2);
                            targetsFound++;
                        }
                    });
                     setLoss(targetsFound > 0 ? currentLoss / targetsFound : null);
                }
                currentLayer++;
                setTimeout(animateLayer, 500);
            } else {
                setIsSimulating(false);
                setSimulationLayer(null);
            }
        };

        animateLayer();
    }, [isSimulating, network]);

    const handleTrainingStep = useCallback(() => {
        const { updatedNetwork, finalLoss } = runTrainingStep(network, learningRate);
        setNetwork(updatedNetwork);
        setLoss(finalLoss);
    }, [network, learningRate]);

    const handleResetSimulation = useCallback(() => {
        setNetwork(prev => {
            const newNetwork = JSON.parse(JSON.stringify(prev)) as NeuralNetwork;
            // Reset activations for all non-input layers
            for (let i = 1; i < newNetwork.layers.length; i++) {
                newNetwork.layers[i].neurons.forEach(n => {
                    n.activation = 0;
                });
            }
            return newNetwork;
        });
        setLoss(null);
        setIsSimulating(false);
        setSimulationLayer(null);
    }, []);
    
    const loadNetwork = (newNetwork: NeuralNetwork) => {
        setNetwork(newNetwork);
        setSelectedElement(null);
        setLoss(null);
    };

    return (
        <div className="flex h-screen w-screen font-sans text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-900 overflow-hidden">
            <Sidebar
                network={network}
                selectedElement={selectedElement}
                setSelectedElement={setSelectedElement}
                addLayer={addLayer}
                removeLayer={removeLayer}
                addNeuronToLayer={addNeuronToLayer}
                removeNeuron={removeNeuron}
                deleteConnection={deleteConnection}
                updateSelectedValue={updateSelectedValue}
                runSimulation={handleRunSimulation}
                resetSimulation={handleResetSimulation}
                isSimulating={isSimulating}
                setActivationFunction={setActivationFunction}
                loadNetwork={loadNetwork}
                theme={theme}
                toggleTheme={toggleTheme}
                handleTrainingStep={handleTrainingStep}
                learningRate={learningRate}
                setLearningRate={setLearningRate}
                loss={loss}
            />
            <Canvas
                network={network}
                updateNeuronPosition={updateNeuronPosition}
                selectedElement={selectedElement}
                setSelectedElement={setSelectedElement}
                createConnection={createConnection}
                isSimulating={isSimulating}
                simulationLayer={simulationLayer}
            />
        </div>
    );
};

export default App;