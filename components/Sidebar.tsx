import React, { useMemo } from 'react';
import type { NeuralNetwork, SelectedElement, ActivationFunction } from '../types';
import { ThemeToggle } from './ThemeToggle';
import { PlusIcon } from './icons/PlusIcon';
import { MinusIcon } from './icons/MinusIcon';
import { PlayIcon } from './icons/PlayIcon';
import { SaveIcon } from './icons/SaveIcon';
import { LoadIcon } from './icons/LoadIcon';
import { ResetIcon } from './icons/ResetIcon';

interface SidebarProps {
    network: NeuralNetwork;
    selectedElement: SelectedElement | null;
    setSelectedElement: (element: SelectedElement | null) => void;
    addLayer: () => void;
    removeLayer: () => void;
    addNeuronToLayer: (layerIndex: number) => void;
    removeNeuron: (neuronId: string) => void;
    deleteConnection: (connectionId: string) => void;
    updateSelectedValue: (key: 'weight' | 'bias' | 'activation' | 'target', value: number) => void;
    runSimulation: () => void;
    resetSimulation: () => void;
    isSimulating: boolean;
    setActivationFunction: (func: ActivationFunction) => void;
    loadNetwork: (network: NeuralNetwork) => void;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
    handleTrainingStep: () => void;
    learningRate: number;
    setLearningRate: (rate: number) => void;
    loss: number | null;
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="border-b border-gray-200 dark:border-gray-800 pb-4 mb-4">
        <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">{title}</h3>
        {children}
    </div>
);

const IconButton: React.FC<{ onClick: () => void; children: React.ReactNode; tooltip: string, disabled?: boolean }> = ({ onClick, children, tooltip, disabled }) => (
    <button onClick={onClick} disabled={disabled} className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed group relative transition-colors">
        {children}
        <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-transform bg-gray-800 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap">{tooltip}</span>
    </button>
);

const SliderInput: React.FC<{ label: string, value: number, onChange: (value: number) => void, min?: number, max?: number, step?: number }> = ({ label, value, onChange, min = -2, max = 2, step = 0.01 }) => (
    <div>
        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">{label}</label>
        <div className="flex items-center gap-3 mt-1">
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
            <input
                type="number"
                step={step}
                value={value.toFixed(2)}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="w-24 p-2 text-center bg-gray-200 dark:bg-gray-700 rounded-md border-transparent focus:border-blue-500 focus:ring-blue-500"
            />
        </div>
    </div>
);


export const Sidebar: React.FC<SidebarProps> = ({
    network, selectedElement, addLayer, removeLayer, addNeuronToLayer, removeNeuron, deleteConnection, updateSelectedValue, runSimulation, resetSimulation, isSimulating, setActivationFunction, loadNetwork, theme, toggleTheme, handleTrainingStep, learningRate, setLearningRate, loss
}) => {
    
    const { element, data } = useMemo(() => {
        if (!selectedElement) return { element: null, data: null };
        if (selectedElement.type === 'neuron') {
            const neuron = network.layers.flatMap(l => l.neurons).find(n => n.id === selectedElement.id);
            return { element: selectedElement, data: neuron };
        }
        if (selectedElement.type === 'connection') {
            const connection = network.connections.find(c => c.id === selectedElement.id);
            return { element: selectedElement, data: connection };
        }
        return { element: null, data: null };
    }, [selectedElement, network]);

    const handleSave = () => {
        const dataStr = JSON.stringify(network, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const exportFileDefaultName = 'network.json';
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    };

    const handleLoad = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const content = e.target?.result;
                    if (typeof content === 'string') {
                        const parsedNetwork = JSON.parse(content);
                        loadNetwork(parsedNetwork);
                    }
                } catch (error) {
                    console.error("Failed to load or parse network file:", error);
                    alert("Invalid network file.");
                }
            };
            reader.readAsText(file);
            event.target.value = ''; // Reset file input
        }
    };
    
    const isOutputLayerSelected = data && 'layerIndex' in data && data.layerIndex === network.layers.length - 1;

    return (
        <aside className="w-96 h-full bg-white dark:bg-gray-900 p-4 overflow-y-auto shadow-2xl flex flex-col border-r border-gray-200 dark:border-gray-800">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200 dark:border-gray-800">
                <h2 className="text-2xl font-bold text-blue-600 dark:text-blue-400">Perceptron Builder</h2>
                <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
            </div>
            
            <div className="flex-grow">
                <Section title="Training & Simulation">
                     <div className="grid grid-cols-2 gap-2 mb-4">
                         <button onClick={runSimulation} disabled={isSimulating} className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-wait transition-all shadow-md hover:shadow-lg">
                            <PlayIcon />
                            <span>{isSimulating ? 'Running...' : 'Forward Pass'}</span>
                        </button>
                        <button onClick={handleTrainingStep} disabled={isSimulating} className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg">
                            <span>Train Step</span>
                        </button>
                    </div>
                     <div className="mb-4">
                        <button onClick={resetSimulation} disabled={isSimulating} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg">
                             <ResetIcon />
                             <span>Reset</span>
                         </button>
                    </div>
                    <SliderInput label="Learning Rate" value={learningRate} onChange={setLearningRate} min={0.01} max={1} step={0.01} />
                    <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Mean Squared Error</label>
                        <div className="w-full mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded-md text-center font-mono">{loss !== null ? loss.toFixed(6) : 'N/A'}</div>
                    </div>
                </Section>
                
                <Section title="Network Structure">
                     <div className="flex gap-2 mb-2">
                        <select value={network.activationFunction} onChange={(e) => setActivationFunction(e.target.value as ActivationFunction)} className="w-full bg-gray-200 dark:bg-gray-700 rounded-md p-2 border-transparent focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition">
                            <option value="sigmoid">Sigmoid</option>
                            <option value="relu">ReLU</option>
                            <option value="tanh">Tanh</option>
                        </select>
                    </div>
                    <div className="flex gap-2 mb-4">
                         <IconButton onClick={addLayer} tooltip="Add Hidden Layer"><PlusIcon /></IconButton>
                         <IconButton onClick={removeLayer} tooltip="Remove Last Layer" disabled={network.layers.length <= 2}><MinusIcon /></IconButton>
                    </div>
                    <div className="space-y-2">
                        {network.layers.map((layer, index) => (
                             <div key={layer.id} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg flex justify-between items-center">
                                <span className="font-medium text-sm">
                                    {index === 0 ? 'Input' : index === network.layers.length - 1 ? 'Output' : `Hidden ${index}`}
                                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">({layer.neurons.length} neurons)</span>
                                </span>
                                <div className="flex gap-1">
                                    <IconButton onClick={() => addNeuronToLayer(index)} tooltip="Add Neuron"><PlusIcon size={16} /></IconButton>
                                </div>
                            </div>
                        ))}
                    </div>
                </Section>
                
                <Section title="Selected Element">
                    {!element && (
                        <div className="text-center text-gray-500 dark:text-gray-400 text-sm py-4">
                            <p>Select a neuron or connection</p>
                            <p className="mt-1">to view its properties.</p>
                        </div>
                    )}
                    {element?.type === 'neuron' && data && (
                        <div className="space-y-4">
                            <h4 className="font-bold text-md text-gray-700 dark:text-gray-300">Neuron Properties</h4>
                            {data.layerIndex === 0 ? (
                                <SliderInput label="Input Value" value={data.activation} onChange={(v) => updateSelectedValue('activation', v)} min={-1} max={1} step={0.01} />
                            ) : (
                                <SliderInput label="Bias" value={data.bias} onChange={(v) => updateSelectedValue('bias', v)} />
                            )}
                            {isOutputLayerSelected && (
                                <SliderInput label="Target Value" value={data.target ?? 0} onChange={(v) => updateSelectedValue('target', v)} min={-1} max={1} step={0.01} />
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Activation</label>
                                <input type="text" readOnly value={data.activation.toFixed(4)} className="w-full mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded-md border-transparent focus:outline-none cursor-default" />
                            </div>
                            <button onClick={() => removeNeuron(data.id)} className="w-full px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors text-sm shadow-md hover:shadow-lg">Delete Neuron</button>
                        </div>
                    )}
                    {element?.type === 'connection' && data && (
                        <div className="space-y-4">
                            <h4 className="font-bold text-md text-gray-700 dark:text-gray-300">Connection Properties</h4>
                            <SliderInput label="Weight" value={data.weight} onChange={(v) => updateSelectedValue('weight', v)} />
                            <button onClick={() => deleteConnection(data.id)} className="w-full px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors text-sm shadow-md hover:shadow-lg">Delete Connection</button>
                        </div>
                    )}
                </Section>
            </div>
            
            <div className="flex-shrink-0 pt-4 border-t border-gray-200 dark:border-gray-800">
                <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">File</h3>
                <div className="flex gap-2">
                    <button onClick={handleSave} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium">
                        <SaveIcon /> Save
                    </button>
                    <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors cursor-pointer text-sm font-medium">
                        <LoadIcon /> Load
                        <input type="file" accept=".json" className="hidden" onChange={handleLoad} />
                    </label>
                </div>
            </div>
        </aside>
    );
};