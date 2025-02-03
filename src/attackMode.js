class AttackMode {
    constructor(game) {
        this.game = game;
        this.health = 100;
        this.score = 0;
        this.level = 1;
        this.activeWords = new Map();
        this.baseSpeed = 15; // seconds to fall
        this.baseSpawnRate = 3000; // Initial spawn rate in ms
        this.minSpawnRate = 500;   // Fastest possible spawn rate
        this.spawnRateReduction = 150; // How much to reduce spawn rate per level
        this.spawnRate = this.baseSpawnRate; // ms between spawns
        this.container = document.getElementById('game-container');
        this.input = document.getElementById('attack-input');
        this.healthBar = document.getElementById('health-fill');
        this.startBtn = document.getElementById('start-attack');
        this.countdown = document.getElementById('countdown');
        this.initialized = false;
        this.gameReady = false;
        this.gameStarted = false;
        this.wordPositions = []; // Track word positions
        this.wordsDestroyed = 0;  // Add counter for destroyed words
        this.quickClearEnabled = true; // Add new property
        this.successSoundURL = 'sounds/success.mp3';  // Store URL instead of Audio object
        this.backgroundMusic = new Audio('sounds/attack-mode.mp3');
        this.backgroundMusic.loop = true;
        this.backgroundMusic.volume = 0.3;
        
        // Initialize event listeners
        this.initializeEventListeners();
        this.bindStartButton(); // Add direct binding in constructor
    }

    initializeEventListeners() {
        if (this.initialized) return;
        
        this.input = document.getElementById('attack-input');
        this.startBtn = document.getElementById('start-attack');
        
        // Add toggle event listener
        const quickClearToggle = document.getElementById('quick-clear-toggle');
        if (quickClearToggle) {
            quickClearToggle.addEventListener('change', (e) => {
                this.quickClearEnabled = e.target.checked;
            });
        }
        
        if (this.input) {
            this.input.addEventListener('input', () => this.checkInput());
            // Add keydown event listener for backspace
            this.input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && this.quickClearEnabled) {
                    e.preventDefault(); // Prevent default backspace behavior
                    this.input.value = ''; // Clear entire input
                }
            });
        }
        
        this.initialized = true;
    }

    start() {
        console.log('Attack mode initializing...');
        if (this.gameStarted) {
            console.log('Game already starting or in progress');
            return;
        }
        
        // Hide result screen if visible
        const resultScreen = document.getElementById('result-screen');
        if (resultScreen) {
            resultScreen.classList.add('hidden');
        }
        
        // Show attack screen
        const attackScreen = document.getElementById('attack-screen');
        if (attackScreen) {
            attackScreen.classList.remove('hidden');
        }
        
        this.reset();
        this.initializeEventListeners();
        this.startGame(); // Start the game immediately
    }

    bindStartButton() {
        this.startBtn = document.getElementById('start-attack');
        if (this.startBtn && this.gameReady) {
            this.startBtn.replaceWith(this.startBtn.cloneNode(true));
            this.startBtn = document.getElementById('start-attack');
            
            this.startBtn.addEventListener('click', () => {
                if (!this.gameReady) return;
                console.log('Starting game...');
                this.startGame();
            });
        }
    }

    startGame() {
        if (this.gameStarted) return;
        this.gameStarted = true;
        
        // Start background music
        this.backgroundMusic.currentTime = 0;
        this.backgroundMusic.play();
        
        // Reset spawn rate at game start
        this.spawnRate = this.baseSpawnRate;
        
        if (this.spawnInterval) clearInterval(this.spawnInterval);
        if (this.difficultyInterval) clearInterval(this.difficultyInterval);
        
        this.spawnInterval = setInterval(() => this.spawnWord(), this.spawnRate);
        this.difficultyInterval = setInterval(() => this.increaseDifficulty(), 10000);
        
        if (this.input) {
            this.input.value = '';
            this.input.focus();
        }
    }

    reset() {
        this.gameStarted = false;
        this.health = 100;
        this.score = 0;
        this.level = 1;
        this.activeWords.clear();
        this.container.innerHTML = '';
        this.wordsDestroyed = 0;
        this.spawnRate = this.baseSpawnRate; // Reset spawn rate
        this.baseSpeed = 15; // Reset fall speed
        
        // Clear any existing intervals
        if (this.spawnInterval) clearInterval(this.spawnInterval);
        if (this.difficultyInterval) clearInterval(this.difficultyInterval);
        
        // Reset UI elements
        this.updateUI();
        if (this.input) {
            this.input.value = '';
        }
        if (this.healthBar) {
            this.healthBar.style.width = '100%';
        }
        
        this.backgroundMusic.pause();
        this.backgroundMusic.currentTime = 0;
    }

    spawnWord() {
        const word = this.game.words[Math.floor(Math.random() * this.game.words.length)];
        const element = document.createElement('div');
        element.className = 'falling-word';
        element.textContent = word;

        // Calculate a non-overlapping position
        let leftPosition;
        let attempts = 0;
        do {
            leftPosition = Math.random() * (this.container.offsetWidth - 100);
            attempts++;
        } while (this.isOverlapping(leftPosition) && attempts < 10);

        element.style.left = `${leftPosition}px`;
        element.style.top = '-30px'; // Start above container
        
        // Set animation duration
        const duration = this.baseSpeed - (this.level * 0.5);
        element.style.animation = `fall ${duration}s linear forwards`;
        
        this.container.appendChild(element);
        this.activeWords.set(word, element);
        this.wordPositions.push({ left: leftPosition, width: element.offsetWidth });

        // Add word reference to the element
        element.dataset.word = word;

        // Track animation end and remove word
        const handleAnimationEnd = () => {
            const currentWord = element.dataset.word;
            if (this.activeWords.has(currentWord)) {
                this.wordMissed(currentWord);
            }
            this.wordPositions = this.wordPositions.filter(pos => pos.left !== leftPosition);
            element.removeEventListener('animationend', handleAnimationEnd);
        };

        element.addEventListener('animationend', handleAnimationEnd);
    }

    isOverlapping(leftPosition) {
        return this.wordPositions.some(pos => {
            return Math.abs(pos.left - leftPosition) < pos.width;
        });
    }

    checkInput() {
        const typed = this.input.value.trim().toLowerCase();
        for (let [word, element] of this.activeWords) {
            // Count matching characters from start
            let matchCount = 0;
            while (matchCount < typed.length &&
                   matchCount < word.length &&
                   typed[matchCount] === word[matchCount].toLowerCase()) {
                matchCount++;
            }
            // Rebuild with highlighted matched portion
            const matched = word.slice(0, matchCount);
            const remainder = word.slice(matchCount);
            element.innerHTML = `<span class="matched">${matched}</span>${remainder}`;
            
            if (word.toLowerCase() === typed) {
                this.wordComplete(word);
                break;
            }
        }
    }

    wordComplete(word) {
        const element = this.activeWords.get(word);
        const rect = element.getBoundingClientRect();
        
        // Play success sound
        this.playSuccessSound();
        
        // Stop falling animation and add fade out
        element.style.animation = 'none';
        element.style.transition = 'opacity 0.2s ease-out';
        element.style.opacity = '0';
        
        // Create particles at current position
        this.createParticles(word, rect);
        
        // Remove word after fade
        setTimeout(() => {
            element.remove();
            this.activeWords.delete(word);
        }, 200);

        this.input.value = '';
        this.wordsDestroyed++;  // Increment counter when word is destroyed
        this.score += word.length;
        this.updateUI();
    }

    playSuccessSound() {
        const sound = new Audio(this.successSoundURL);
        sound.volume = 0.3;
        sound.play();
    }

    createParticles(word, rect) {
        const letters = word.split('');
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        letters.forEach((letter, i) => {
            for (let j = 0; j < 2; j++) { // 2 particles per letter
                const particle = document.createElement('span');
                particle.textContent = letter;
                particle.className = 'particle';
                
                // Random particle movement
                const angle = (Math.PI * 2 * (i / letters.length)) + (Math.random() * 0.5);
                const velocity = 50 + Math.random() * 100;
                const x = Math.cos(angle) * velocity;
                const y = Math.sin(angle) * velocity;
                const rotation = (Math.random() - 0.5) * 720;

                particle.style.left = `${centerX}px`;
                particle.style.top = `${centerY}px`;
                particle.style.setProperty('--x', `${x}px`);
                particle.style.setProperty('--y', `${y}px`);
                particle.style.setProperty('--rotation', `${rotation}deg`);

                document.body.appendChild(particle);
                
                // Clean up particles
                setTimeout(() => particle.remove(), 1000);
            }
        });
    }

    wordMissed(word) {
        if (!this.activeWords.has(word)) return;
        
        const element = this.activeWords.get(word);
        if (element && element.parentNode) {
            element.remove();
        }
        this.activeWords.delete(word);
        this.health -= 10;
        this.updateUI();
        
        if (this.health <= 0) {
            this.endGame();
        }
    }

    increaseDifficulty() {
        this.level++;
        
        // Increase spawn rate by 10% each level
        const spawnRateMultiplier = Math.pow(1.1, this.level - 1); // 1.1 = 10% increase
        this.spawnRate = Math.max(
            this.minSpawnRate,
            this.baseSpawnRate / spawnRateMultiplier
        );

        // Update spawn interval
        clearInterval(this.spawnInterval);
        this.spawnInterval = setInterval(() => this.spawnWord(), this.spawnRate);
        
        // Make words fall faster too
        this.baseSpeed = Math.max(5, 15 - (this.level * 0.5));
        
        console.log(`Level ${this.level}: Spawn rate ${Math.round(this.spawnRate)}ms (${Math.round(spawnRateMultiplier * 100)}% faster), Fall speed ${this.baseSpeed}s`);
        this.updateUI();
    }

    updateUI() {
        document.getElementById('attack-score').textContent = this.score;
        document.getElementById('level').textContent = this.level;
        this.healthBar.style.width = `${this.health}%`;
    }

    endGame() {
        clearInterval(this.spawnInterval);
        clearInterval(this.difficultyInterval);
        this.gameStarted = false;
        
        // Update final score display
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('final-level').textContent = this.level;
        document.getElementById('words-destroyed').textContent = this.wordsDestroyed;
        
        this.saveScore();
        this.game.showScreen('result-screen');
        
        this.backgroundMusic.pause();
        this.backgroundMusic.currentTime = 0;
    }

    saveScore() {
        const scores = JSON.parse(localStorage.getItem('attackScores') || '[]');
        scores.push({
            score: this.score,
            level: this.level,
            date: new Date().toISOString()
        });
        scores.sort((a, b) => b.score - a.score);
        localStorage.setItem('attackScores', JSON.stringify(scores.slice(0, 5)));
    }
}