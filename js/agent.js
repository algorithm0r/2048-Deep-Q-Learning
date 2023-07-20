class Agent {

    constructor(gameManager) {
        this.convolutional = false;
        
        this.gameManager = gameManager;
        this.model = tf.sequential();

        if (this.convolutional) {
            // Add the first convolutional layer
            this.model.add(tf.layers.conv2d({
                filters: 32,
                kernelSize: 3,
                activation: 'relu',
                inputShape: [4, 4, 1] // Assuming input shape of 4x4 with a single channel
            }));

            // Add the second convolutional layer
            this.model.add(tf.layers.conv2d({
                filters: 64,
                kernelSize: 3,
                activation: 'relu'
            }));
            // Flatten the output of the convolutional layers
            this.model.add(tf.layers.flatten());
        }

      
        // Add a fully connected layer with 32 units and specify the input shape
        if(this.convolutional) this.model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
        else this.model.add(tf.layers.dense({ units: 32, inputShape: [16], activation: 'relu' }));
        
        // Add another fully connected layer with 32 units
        this.model.add(tf.layers.dense({ units: 32, activation: 'relu' }));

        // Add the final output layer with 4 units
        this.model.add(tf.layers.dense({ units: 4, activation: 'linear' }));

        this.learningRate = 0.001;
        const optimizer = tf.train.adam(this.learningRate);
        this.model.compile({ optimizer, loss: 'meanSquaredError' });
        this.replayMemory = [];

        this.discountFactor = 0.9;
        this.epsilon = 1;
        this.epoch = 0;
    }

    flatten2d(list) {
        return [].concat(...list);
    };

    // Perform a Q-learning update
    qLearningUpdate(state, action, reward, nextState) {
        // Calculate the target Q-value
        const nextQValues = this.model.predict(tf.tensor2d([nextState])).dataSync();
        const maxNextQ = Math.max(...nextQValues);
        const targetQ = reward + this.discountFactor * maxNextQ;

        // Obtain the predicted Q-values for the current state
        const currentQValues = this.model.predict(tf.tensor2d([state])).dataSync();

        // Update the Q-value for the selected action
        currentQValues[action] = targetQ;

        return [state, currentQValues];
    }

    getBestAction(state, moves) {
        let actions = this.model.predict(tf.tensor2d([state])).dataSync();

        actions = actions.map((action, index) => moves.includes(index) ? action : -Infinity);

        return actions.indexOf(Math.max(...actions));
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    sampleMinibatch() {
        return this.replayMemory.filter(_ => Math.random() < 0.5);
    }

    async train(callback) {
        // process game ending
        const brain = new AgentBrain(this.gameManager);
        const state = this.retrieveState();

        let pair = this.qLearningUpdate(this.lastState, this.lastAction, -1024, state);
        this.replayMemory.push(pair);

        // begin training
        this.training = true;
        const batchSize = 20;
        let total = 0;
        for (let i = 0; i < batchSize; i++) {
            // Sample a minibatch from replay memory
            const minibatch = this.sampleMinibatch();
            total += minibatch.length;

            const transformedPair = minibatch.reduce((acc, pair) => {
                acc[0].push(pair[0]);
                acc[1].push(pair[1]);
                return acc;
            }, [[], []]);

            const [states, targets] = transformedPair;

            const xs = tf.tensor2d(states);
            const ys = tf.tensor2d(targets);

            // Perform model training with a single batch
            await this.model.fit(xs, ys, { verbose: 1, shuffle: true });

            // Clean up tensors
            tf.dispose(xs);
            tf.dispose(ys);
        }
        console.log(`Epoch ${++this.epoch}: Trained ${batchSize} minibatches of total size ${total}.`);

        // Update exploration rate, replay memory, or other parameters
        this.replayMemory = [];
        this.epsilon = Math.max(0, this.epsilon - 0.01);
        this.training = false;
        callback();
    }

    getLegalMoves() {
        const moves = [];
        for (let i = 0; i < 4; i++) {
            const brain = new AgentBrain(this.gameManager);
            if(brain.move(i)) moves.push(i); 
        }
        return moves;
    }

    retrieveState(){
        const state = this.gameManager.grid.cells.map(row => row.map(tile => tile !== null ? tile.value : 0));
        if(this.convolutional)
            return state;
        else return this.flatten2d(state);
    }

    selectMove() {
        const state = this.retrieveState();
        const reward = this.gameManager.score - this.lastScore; // compute the reward of this state

        const moves = this.getLegalMoves(this.gameManager);
        
        let action;
        if (Math.random() < this.epsilon) {
            action = moves[randomInt(moves.length)]; // Exploration
        } else {
            action = this.getBestAction(state, moves); // Exploitation
        }

        if (this.lastState) {
            let pair = this.qLearningUpdate(this.lastState, this.lastAction, reward, state);
            this.replayMemory.push(pair);
        }
        this.lastState = state;
        this.lastAction = action;
        this.lastScore = this.gameManager.score;

        return action;
    };
}