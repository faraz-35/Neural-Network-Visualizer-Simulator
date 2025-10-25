export type ActivationFunction = 'sigmoid' | 'relu' | 'tanh';

export interface Neuron {
    id: string;
    layerIndex: number;
    neuronIndex: number;
    x: number;
    y: number;
    bias: number;
    activation: number;
    // For training
    target?: number;
    // For backpropagation visualization (optional)
    error?: number;
    delta?: number;
}

export interface Connection {
    id: string;
    fromNeuronId: string;
    toNeuronId: string;
    weight: number;
    // For backpropagation visualization (optional)
    gradient?: number;
}

export interface Layer {
    id: string;
    neurons: Neuron[];
}

export interface NeuralNetwork {
    layers: Layer[];
    connections: Connection[];
    activationFunction: ActivationFunction;
}

export type SelectedElement = 
    | { type: 'neuron'; id: string; }
    | { type: 'connection'; id: string; };