import { v4 as uuidv4 } from 'uuid';
import type { NeuralNetwork, ActivationFunction, Neuron } from '../types';

// Activation functions
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
const relu = (x: number) => Math.max(0, x);
const tanh = (x: number) => Math.tanh(x);

const activationFunctions: Record<ActivationFunction, (x: number) => number> = {
    sigmoid,
    relu,
    tanh,
};

// Derivatives of activation functions
const sigmoidDerivative = (y: number) => y * (1 - y);
const reluDerivative = (y: number) => (y > 0 ? 1 : 0);
const tanhDerivative = (y: number) => 1 - y * y;

const activationDerivatives: Record<ActivationFunction, (y: number) => number> = {
    sigmoid: sigmoidDerivative,
    relu: reluDerivative,
    tanh: tanhDerivative,
};


export const getInitialNetwork = (): NeuralNetwork => {
    const inputNeuron1: Neuron = { id: uuidv4(), layerIndex: 0, neuronIndex: 0, x: 100, y: 150, bias: 0, activation: 1 };
    const inputNeuron2: Neuron = { id: uuidv4(), layerIndex: 0, neuronIndex: 1, x: 100, y: 250, bias: 0, activation: 0 };
    
    const hiddenNeuron1: Neuron = { id: uuidv4(), layerIndex: 1, neuronIndex: 0, x: 250, y: 150, bias: 0, activation: 0 };
    const hiddenNeuron2: Neuron = { id: uuidv4(), layerIndex: 1, neuronIndex: 1, x: 250, y: 250, bias: 0, activation: 0 };

    const outputNeuron: Neuron = { id: uuidv4(), layerIndex: 2, neuronIndex: 0, x: 400, y: 200, bias: 0, activation: 0, target: 1 };

    return {
        layers: [
            { id: 'layer-0', neurons: [inputNeuron1, inputNeuron2] },
            { id: 'layer-1', neurons: [hiddenNeuron1, hiddenNeuron2] },
            { id: 'layer-2', neurons: [outputNeuron] }
        ],
        connections: [
            // Input to Hidden
            { id: uuidv4(), fromNeuronId: inputNeuron1.id, toNeuronId: hiddenNeuron1.id, weight: 0.5 },
            { id: uuidv4(), fromNeuronId: inputNeuron1.id, toNeuronId: hiddenNeuron2.id, weight: -0.3 },
            { id: uuidv4(), fromNeuronId: inputNeuron2.id, toNeuronId: hiddenNeuron1.id, weight: 0.8 },
            { id: uuidv4(), fromNeuronId: inputNeuron2.id, toNeuronId: hiddenNeuron2.id, weight: 0.2 },
            // Hidden to Output
            { id: uuidv4(), fromNeuronId: hiddenNeuron1.id, toNeuronId: outputNeuron.id, weight: 0.7 },
            { id: uuidv4(), fromNeuronId: hiddenNeuron2.id, toNeuronId: outputNeuron.id, weight: -0.4 },
        ],
        activationFunction: 'sigmoid',
    };
};

export const runForwardPropagation = (network: NeuralNetwork, untilLayer?: number): NeuralNetwork => {
    const newNetwork = JSON.parse(JSON.stringify(network)) as NeuralNetwork;
    const activationFunc = activationFunctions[newNetwork.activationFunction];
    const maxLayer = untilLayer !== undefined ? untilLayer : newNetwork.layers.length - 1;

    for (let i = 1; i <= maxLayer; i++) {
        const currentLayer = newNetwork.layers[i];
        
        currentLayer.neurons.forEach(neuron => {
            const incomingConnections = newNetwork.connections.filter(c => c.toNeuronId === neuron.id);
            
            const weightedSum = incomingConnections.reduce((sum, conn) => {
                const fromNeuron = newNetwork.layers[i-1].neurons.find(n => n.id === conn.fromNeuronId);
                if (fromNeuron) {
                    return sum + fromNeuron.activation * conn.weight;
                }
                return sum;
            }, 0);

            neuron.activation = activationFunc(weightedSum + neuron.bias);
        });
    }

    return newNetwork;
};


export const runTrainingStep = (network: NeuralNetwork, learningRate: number): { updatedNetwork: NeuralNetwork; finalLoss: number } => {
    // 1. Forward Pass
    const propagatedNetwork = runForwardPropagation(network);
    const activationDerivative = activationDerivatives[propagatedNetwork.activationFunction];

    // 2. Calculate Output Error and Deltas
    let finalLoss = 0;
    const outputLayer = propagatedNetwork.layers[propagatedNetwork.layers.length - 1];
    outputLayer.neurons.forEach(neuron => {
        const target = neuron.target ?? 0;
        const error = target - neuron.activation;
        neuron.error = error;
        neuron.delta = error * activationDerivative(neuron.activation);
        finalLoss += Math.pow(error, 2);
    });
    finalLoss /= outputLayer.neurons.length;

    // 3. Backpropagate Deltas
    for (let i = propagatedNetwork.layers.length - 2; i >= 1; i--) {
        const currentLayer = propagatedNetwork.layers[i];
        const nextLayer = propagatedNetwork.layers[i + 1];

        currentLayer.neurons.forEach(neuron => {
            let error = 0;
            const outgoingConnections = propagatedNetwork.connections.filter(c => c.fromNeuronId === neuron.id);
            outgoingConnections.forEach(conn => {
                const nextNeuron = nextLayer.neurons.find(n => n.id === conn.toNeuronId);
                if (nextNeuron && nextNeuron.delta) {
                    error += conn.weight * nextNeuron.delta;
                }
            });
            neuron.delta = error * activationDerivative(neuron.activation);
        });
    }

    // 4. Update Weights and Biases
    propagatedNetwork.connections.forEach(conn => {
        const fromNeuron = propagatedNetwork.layers.flatMap(l=>l.neurons).find(n => n.id === conn.fromNeuronId);
        const toNeuron = propagatedNetwork.layers.flatMap(l=>l.neurons).find(n => n.id === conn.toNeuronId);
        if (fromNeuron && toNeuron && toNeuron.delta) {
            const gradient = fromNeuron.activation * toNeuron.delta;
            conn.gradient = gradient; // Store for visualization
            conn.weight += learningRate * gradient;
        }
    });

    for (let i = 1; i < propagatedNetwork.layers.length; i++) {
        propagatedNetwork.layers[i].neurons.forEach(neuron => {
            if (neuron.delta) {
                neuron.bias += learningRate * neuron.delta;
            }
        });
    }

    return { updatedNetwork: propagatedNetwork, finalLoss };
};