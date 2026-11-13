// Deep Q-Learning agent for 2048.
//
// Standard DQN: transitions (state, action, reward, nextState, done) go into a replay buffer
// that persists across games; after each game the network trains on random minibatches whose
// targets are computed at training time from a periodically-synced target network.
class Agent {

    constructor(gameManager) {
        this.convolutional = false;

        this.gameManager = gameManager;
        this.model = this.buildModel();
        this.targetModel = this.buildModel();
        this.syncTargetModel();

        this.discountFactor = 0.9;
        this.epsilon = 1;          // exploration rate
        this.epsilonMin = 0.05;
        this.epsilonDecay = 0.01;  // per game

        this.replayMemory = [];
        this.replayCapacity = 50000;
        this.batchSize = 64;
        this.batchesPerGame = 20;
        this.targetSyncEvery = 5;  // games between target-network syncs
        this.epoch = 0;

        this.lastState = null;
        this.lastAction = null;
        this.lastScore = 0;
    }

    buildModel() {
        const model = tf.sequential();

        if (this.convolutional) {
            // The state arrives flat (16 values); view it as a 4x4 single-channel image.
            model.add(tf.layers.reshape({ targetShape: [4, 4, 1], inputShape: [16] }));
            model.add(tf.layers.conv2d({ filters: 32, kernelSize: 2, padding: 'same', activation: 'relu' }));
            model.add(tf.layers.conv2d({ filters: 64, kernelSize: 2, padding: 'same', activation: 'relu' }));
            model.add(tf.layers.flatten());
            model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
        } else {
            model.add(tf.layers.dense({ units: 32, inputShape: [16], activation: 'relu' }));
        }
        model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
        model.add(tf.layers.dense({ units: 4, activation: 'linear' }));

        model.compile({ optimizer: tf.train.adam(0.001), loss: 'meanSquaredError' });
        return model;
    }

    syncTargetModel() {
        this.targetModel.setWeights(this.model.getWeights());
    }

    // Board as 16 numbers: log2(tile) / 16, so a 2 is 0.0625, a 2048 is 0.6875 and empty is 0.
    // Raw tile values (up to thousands) saturate the network.
    retrieveState() {
        const cells = this.gameManager.grid.cells;
        const state = [];
        for (let x = 0; x < 4; x++)
            for (let y = 0; y < 4; y++)
                state.push(cells[x][y] ? Math.log2(cells[x][y].value) / 16 : 0);
        return state;
    }

    // Reward for a move: the points it scored, log-scaled so a 2048 merge doesn't swamp the loss.
    scaleReward(points) {
        return points > 0 ? Math.log2(points) / 16 : 0;
    }

    getLegalMoves() {
        const moves = [];
        for (let i = 0; i < 4; i++) {
            const brain = new AgentBrain(this.gameManager);
            if (brain.move(i)) moves.push(i);
        }
        return moves;
    }

    getBestAction(state, moves) {
        const q = tf.tidy(() => this.model.predict(tf.tensor2d([state])).dataSync());
        let best = moves[0], bestQ = -Infinity;
        for (const m of moves) {
            if (q[m] > bestQ) { bestQ = q[m]; best = m; }  // NaN never wins, so best stays legal
        }
        return best;
    }

    remember(state, action, reward, nextState, done) {
        this.replayMemory.push({ state, action, reward, nextState, done });
        if (this.replayMemory.length > this.replayCapacity) this.replayMemory.shift();
    }

    selectMove() {
        const state = this.retrieveState();
        const moves = this.getLegalMoves();

        if (this.lastState) {
            const reward = this.scaleReward(this.gameManager.score - this.lastScore);
            this.remember(this.lastState, this.lastAction, reward, state, false);
        }

        const action = Math.random() < this.epsilon
            ? moves[randomInt(moves.length)]      // explore
            : this.getBestAction(state, moves);   // exploit

        this.lastState = state;
        this.lastAction = action;
        this.lastScore = this.gameManager.score;
        return action;
    }

    sampleMinibatch() {
        const batch = [];
        const n = this.replayMemory.length;
        for (let i = 0; i < Math.min(this.batchSize, n); i++) batch.push(this.replayMemory[randomInt(n)]);
        return batch;
    }

    // Called once when a game ends: record the terminal transition, train, then start the next game.
    async train(callback) {
        if (this.lastState) {
            const reward = this.scaleReward(this.gameManager.score - this.lastScore) - 1;  // losing costs 1
            this.remember(this.lastState, this.lastAction, reward, this.retrieveState(), true);
        }
        this.lastState = null;   // the next game starts fresh: no transition across games
        this.lastAction = null;
        this.lastScore = 0;

        this.training = true;
        let loss = 0;
        for (let i = 0; i < this.batchesPerGame; i++) {
            const batch = this.sampleMinibatch();
            const { xs, ys } = tf.tidy(() => {
                const states = tf.tensor2d(batch.map(t => t.state));
                const next = tf.tensor2d(batch.map(t => t.nextState));
                const q = this.model.predict(states).arraySync();
                const nextQ = this.targetModel.predict(next).arraySync();
                batch.forEach((t, j) => {
                    // Terminal transitions don't bootstrap from the (meaningless) next state.
                    q[j][t.action] = t.done ? t.reward : t.reward + this.discountFactor * Math.max(...nextQ[j]);
                });
                return { xs: tf.keep(states), ys: tf.tensor2d(q) };
            });
            const h = await this.model.fit(xs, ys, { epochs: 1, batchSize: batch.length, verbose: 0 });
            loss += h.history.loss[0];
            tf.dispose([xs, ys]);
        }

        this.epoch++;
        if (this.epoch % this.targetSyncEvery === 0) this.syncTargetModel();
        this.epsilon = Math.max(this.epsilonMin, this.epsilon - this.epsilonDecay);
        this.lastLoss = loss / this.batchesPerGame;
        console.log(`Epoch ${this.epoch}: loss ${this.lastLoss.toFixed(4)}, epsilon ${this.epsilon.toFixed(2)}, replay ${this.replayMemory.length}`);
        this.training = false;
        callback();
    }
}
