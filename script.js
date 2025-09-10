class StoryReader {
    constructor() {
        this.initializeElements();
        this.bindEvents();
        this.currentAudio = null;
    }

    initializeElements() {
        this.cameraBtn = document.getElementById('cameraBtn');
        this.fileInput = document.getElementById('fileInput');
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.capturedImage = document.getElementById('capturedImage');
        this.capturedImageSection = document.getElementById('capturedImageSection');
        this.retakeBtn = document.getElementById('retakeBtn');
        this.readBtn = document.getElementById('readBtn');
        this.textSection = document.getElementById('textSection');
        this.extractedText = document.getElementById('extractedText');
        this.playBtn = document.getElementById('playBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.newPhotoBtn = document.getElementById('newPhotoBtn');
        this.loading = document.getElementById('loading');
        this.audioPlayer = document.getElementById('audioPlayer');
        
        // Debug logging
        console.log('Camera button found:', !!this.cameraBtn);
        console.log('File input found:', !!this.fileInput);
    }

    bindEvents() {
        this.cameraBtn.addEventListener('click', () => this.startCamera());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.retakeBtn.addEventListener('click', () => this.resetToCamera());
        this.readBtn.addEventListener('click', () => this.processImage());
        this.playBtn.addEventListener('click', () => this.playAudio());
        this.pauseBtn.addEventListener('click', () => this.pauseAudio());
        this.newPhotoBtn.addEventListener('click', () => this.resetToCamera());
    }

    async startCamera() {
        try {
            console.log('Starting camera, isMobile:', this.isMobile());
            console.log('Location protocol:', window.location.protocol);
            
            // Always try file input first for better compatibility
            this.fileInput.click();
        } catch (error) {
            console.error('Camera access error:', error);
            alert('Unable to access camera. Please try refreshing the page.');
        }
    }

    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    capturePhoto() {
        const context = this.canvas.getContext('2d');
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
        context.drawImage(this.video, 0, 0);
        
        const dataURL = this.canvas.toDataURL('image/jpeg');
        this.displayCapturedImage(dataURL);
        this.stopCamera();
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.displayCapturedImage(e.target.result);
            };
            reader.readAsDataURL(file);
        }
    }

    displayCapturedImage(dataURL) {
        this.capturedImage.src = dataURL;
        // Skip showing the image, process immediately
        this.processImage();
    }

    stopCamera() {
        if (this.video.srcObject) {
            this.video.srcObject.getTracks().forEach(track => track.stop());
            this.video.srcObject = null;
        }
    }

    resetToCamera() {
        this.capturedImageSection.style.display = 'none';
        this.textSection.style.display = 'none';
        this.cameraBtn.style.display = 'block';
        this.cameraBtn.textContent = '📸 Take Photo';
        this.cameraBtn.onclick = () => this.startCamera();
        this.stopAudio();
    }

    async processImage() {
        this.showLoading();
        
        try {
            const text = await this.extractTextFromImage();
            if (text) {
                await this.generateAudio(text);
                this.autoPlayAudio();
            } else {
                throw new Error('No text found in image');
            }
        } catch (error) {
            console.error('Processing error:', error);
            alert('Sorry, I couldn\'t read the text from your book. Please try taking another photo!');
        } finally {
            this.hideLoading();
        }
    }

    async extractTextFromImage() {
        const imageData = this.capturedImage.src;
        
        // Remove data URL prefix to get base64 data
        const base64Data = imageData.split(',')[1];
        
        const response = await fetch('/api/extract-text', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                image: base64Data
            })
        });

        if (!response.ok) {
            throw new Error('Failed to extract text');
        }

        const result = await response.json();
        return result.text;
    }

    displayText(text) {
        this.extractedText.textContent = text;
        this.textSection.style.display = 'block';
        this.capturedImageSection.style.display = 'none';
    }

    async generateAudio(text) {
        try {
            const response = await fetch('/api/generate-audio', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: text
                })
            });

            if (!response.ok) {
                throw new Error('Failed to generate audio');
            }

            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            this.audioPlayer.src = audioUrl;
        } catch (error) {
            console.error('Audio generation error:', error);
            alert('I can show you the text, but audio isn\'t working right now. Please try again later!');
        }
    }

    autoPlayAudio() {
        if (this.audioPlayer.src) {
            // Hide everything except audio controls
            this.cameraBtn.style.display = 'none';
            this.video.style.display = 'none';
            this.capturedImageSection.style.display = 'none';
            this.textSection.style.display = 'block';
            
            // Hide the text content but show the controls
            this.extractedText.style.display = 'none';
            
            // Auto-play the audio
            this.audioPlayer.play();
            this.playBtn.style.display = 'none';
            this.pauseBtn.style.display = 'inline-block';
            
            this.audioPlayer.onended = () => {
                this.playBtn.style.display = 'inline-block';
                this.pauseBtn.style.display = 'none';
            };
        }
    }

    playAudio() {
        if (this.audioPlayer.src) {
            this.audioPlayer.play();
            this.playBtn.style.display = 'none';
            this.pauseBtn.style.display = 'inline-block';
            
            this.audioPlayer.onended = () => {
                this.playBtn.style.display = 'inline-block';
                this.pauseBtn.style.display = 'none';
            };
        }
    }

    pauseAudio() {
        this.audioPlayer.pause();
        this.playBtn.style.display = 'inline-block';
        this.pauseBtn.style.display = 'none';
    }

    stopAudio() {
        if (this.audioPlayer) {
            this.audioPlayer.pause();
            this.audioPlayer.currentTime = 0;
            this.playBtn.style.display = 'inline-block';
            this.pauseBtn.style.display = 'none';
        }
    }

    showLoading() {
        this.loading.style.display = 'flex';
    }

    hideLoading() {
        this.loading.style.display = 'none';
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new StoryReader();
});