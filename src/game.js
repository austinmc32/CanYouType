class TypingGame {
    constructor() {
        if (window.gameInitialized) {
            console.log('Game already initialized');
            return;
        }
        window.gameInitialized = true;

        this.words = [];
        this.currentWord = '';
        this.wordInput = document.getElementById('word-input');
        this.wordDisplay = document.getElementById('word-display');
        this.wpmDisplay = document.getElementById('wpm');
        this.accuracyDisplay = document.getElementById('accuracy');
        this.timeDisplay = document.getElementById('time');
        this.progressBar = document.getElementById('progress');
        this.totalKeystrokes = 0;
        this.correctKeystrokes = 0;
        this.wordsTyped = 0;
        this.gameTime = 60;
        this.timeLeft = this.gameTime;
        this.gameActive = false;
        
        this.allowedErrorDistance = 1; // How many characters can be wrong
        this.errorPenalty = 0.5; // Score multiplier for words with errors
        this.perfectWords = 0;
        this.imperfectWords = 0;
        this.isAttackMode = window.location.pathname.includes('attack.html');
        this.isClassicMode = window.location.pathname.includes('classic.html');
        
        this.successSoundURL = 'sounds/success.mp3';  // Store URL instead of Audio object
        
        this.backgroundMusic = new Audio('sounds/classic-mode.mp3');
        this.backgroundMusic.loop = true;
        this.backgroundMusic.volume = 0.3;

        this.initializeEventListeners();
        this.loadWords();

        // Update high scores immediately if on main page
        if (!this.isAttackMode && !this.isClassicMode) {
            this.updateHighScores();
        }
    }

    async loadWords() {
        try {
            const response = await fetch('https://random-word-api.herokuapp.com/word?number=1000');
            let words = await response.json();
            console.log('Words loaded');
            
            // Filter words to ensure a maximum length of 6 letters
            this.words = words.filter(word => word.length <= 6);
            
            // Only show menu screen on main page
            if (!this.isAttackMode && !this.isClassicMode) {
                this.showScreen('menu-screen');
            }
            
            // Start appropriate mode if on that page
            if (this.isAttackMode) {
                this.attackMode = new AttackMode(this);
                this.attackMode.start();
            } else if (this.isClassicMode) {
                this.startGame();
            }
        } catch (error) {
            console.error('Error loading words:', error);
        }
    }

    initializeEventListeners() {
        const classicBtn = document.getElementById('classic-btn');
        const attackBtn = document.getElementById('attack-btn');
        const retryBtn = document.getElementById('retry-btn');
        const menuBtn = document.getElementById('menu-btn');
    
        if (classicBtn) {
            classicBtn.addEventListener('click', () => this.startGame());
        }
        if (attackBtn) {
            attackBtn.addEventListener('click', () => this.startAttackMode());
        }
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                if (this.isAttackMode) {
                    this.attackMode.start();
                } else {
                    this.startGame();
                }
            });
        }
        if (menuBtn) {
            menuBtn.addEventListener('click', () => this.showScreen('menu-screen'));
        }
    
        if (this.wordInput) {
            this.wordInput.addEventListener('input', (e) => this.handleInput(e));
            this.wordInput.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') {
                    this.handleWordSubmission();
                }
            });
        }
    }

    startGame() {
        this.showScreen('game-screen');
        this.resetGame();
        this.nextWord();
        this.gameActive = true;
        this.wordInput.focus();
        
        // Start background music
        this.backgroundMusic.currentTime = 0;
        this.backgroundMusic.play();
        
        this.timer = setInterval(() => {
            this.timeLeft--;
            this.timeDisplay.textContent = this.timeLeft;
            this.progressBar.style.width = `${(this.timeLeft / this.gameTime) * 100}%`;
            
            if (this.timeLeft <= 0) {
                this.endGame();
            }
        }, 1000);
    }

    startAttackMode() {
        this.showScreen('attack-screen');
        // Initialize AttackMode only when needed
        if (!this.attackMode) {
            this.attackMode = new AttackMode(this);
        }
        this.attackMode.start();
    }

    calculateLevenshteinDistance(str1, str2) {
        const matrix = Array(str2.length + 1).fill(null)
            .map(() => Array(str1.length + 1).fill(null));

        for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
        for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

        for (let j = 1; j <= str2.length; j++) {
            for (let i = 1; i <= str1.length; i++) {
                const substitute = matrix[j - 1][i - 1] + (str1[i - 1] !== str2[j - 1] ? 1 : 0);
                matrix[j][i] = Math.min(
                    matrix[j - 1][i] + 1, // deletion
                    matrix[j][i - 1] + 1, // insertion
                    substitute // substitution
                );
            }
        }
        return matrix[str2.length][str1.length];
    }

    handleInput(e) {
        if (!this.gameActive) return;
        
        const typed = this.wordInput.value;
        this.totalKeystrokes++;
        
        if (typed === this.currentWord) {
            this.wordInput.className = 'word-input correct';
            this.correctKeystrokes++;
        } else if (this.calculateLevenshteinDistance(typed, this.currentWord) <= this.allowedErrorDistance) {
            this.wordInput.className = 'word-input almost-correct';
            this.correctKeystrokes++;
        } else {
            this.wordInput.className = 'word-input incorrect';
        }
        
        this.updateStats();
    }

    handleWordSubmission() {
        const typed = this.wordInput.value;
        const distance = this.calculateLevenshteinDistance(typed, this.currentWord);
        
        if (typed === this.currentWord) {
            this.playSuccessSound();
            this.perfectWords++;
            this.wordsTyped++;
            this.nextWord();
        } else if (distance <= this.allowedErrorDistance) {
            this.imperfectWords++;
            this.wordsTyped += this.errorPenalty; // Apply penalty for imperfect words
            this.wordDisplay.innerHTML = `<span class="almost-correct">${this.currentWord}</span>`;
            setTimeout(() => this.nextWord(), 500); // Short delay to show the correct word
        }
    }

    playSuccessSound() {
        const sound = new Audio(this.successSoundURL);
        sound.volume = 0.3;
        sound.play();
    }

    nextWord() {
        this.wordsTyped++;
        this.wordInput.value = '';
        this.currentWord = this.words[Math.floor(Math.random() * this.words.length)];
        this.wordDisplay.textContent = this.currentWord;
    }

    updateStats() {
        const minutes = (this.gameTime - this.timeLeft) / 60;
        const perfectScore = this.perfectWords;
        const imperfectScore = this.imperfectWords * this.errorPenalty;
        const wpm = Math.round(((perfectScore + imperfectScore) / minutes) || 0);
        const accuracy = Math.round((this.correctKeystrokes / this.totalKeystrokes) * 100) || 100;
        
        if (this.wpmDisplay) {
            this.wpmDisplay.textContent = wpm;
        }
        if (this.accuracyDisplay) {
            this.accuracyDisplay.textContent = `${accuracy}%`;
        }
    }

    endGame() {
        clearInterval(this.timer);
        this.gameActive = false;
        this.saveScore();
        this.showScreen('result-screen');
        
        this.backgroundMusic.pause();
        this.backgroundMusic.currentTime = 0;

        if (this.wpmDisplay) {
            document.getElementById('final-wpm').textContent = this.wpmDisplay.textContent;
        }
        if (this.accuracyDisplay) {
            document.getElementById('final-accuracy').textContent = this.accuracyDisplay.textContent;
        }
        document.getElementById('total-words').textContent = this.wordsTyped;
        document.getElementById('final-words').textContent = 
            `Perfect: ${this.perfectWords} | Almost: ${this.imperfectWords}`;
    }

    resetGame() {
        this.totalKeystrokes = 0;
        this.correctKeystrokes = 0;
        this.wordsTyped = 0;
        this.timeLeft = this.gameTime;
        this.perfectWords = 0;
        this.imperfectWords = 0;
        this.updateStats();
        clearInterval(this.timer);
    }

    showScreen(screenId) {
        const targetScreen = document.getElementById(screenId);
        if (!targetScreen) {
            console.log(`Screen ${screenId} not found - might be on different page`);
            return;
        }
        
        document.querySelectorAll('.screen').forEach(screen => {
            if (screen) screen.classList.add('hidden');
        });
        targetScreen.classList.remove('hidden');
    }

    saveScore() {
        const scores = JSON.parse(localStorage.getItem('typingScores') || '[]');
        scores.push({
            wpm: parseInt(this.wpmDisplay.textContent),
            accuracy: parseInt(this.accuracyDisplay.textContent),
            date: new Date().toISOString()
        });
        scores.sort((a, b) => b.wpm - a.wpm);
        localStorage.setItem('typingScores', JSON.stringify(scores.slice(0, 5)));
        this.updateHighScores();
    }

    updateHighScores() {
        const scores = JSON.parse(localStorage.getItem('typingScores') || '[]');
        const attackScores = JSON.parse(localStorage.getItem('attackScores') || '[]');
        const scoresList = document.getElementById('high-scores-list');
        
        if (!scoresList) return;  // Exit if element not found

        const classicScores = scores
            .map((score, index) => `
                <li class="score-item">
                    ${index + 1}. ${score.wpm} WPM - ${score.accuracy}% Accuracy
                </li>
            `).join('');

        const survivalScores = attackScores
            .map((score, index) => `
                <li class="score-item">
                    ${index + 1}. Score: ${score.score} - Level ${score.level}
                </li>
            `).join('');

        scoresList.innerHTML = `
            <div class="score-section">
                <h3>Classic Mode</h3>
                <ul class="score-list">${classicScores || '<li>No scores yet</li>'}</ul>
            </div>
            <div class="score-section">
                <h3>Survival Mode</h3>
                <ul class="score-list">${survivalScores || '<li>No scores yet</li>'}</ul>
            </div>
        `;
    }
}

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    window.game = new TypingGame();
});
