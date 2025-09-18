class StoryReader {
    constructor() {
        this.initializeElements();
        this.bindEvents();
        this.currentAudio = null;
        this.processingFile = false;
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
        // Use only change event for iPhone Safari compatibility
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
            
            // Reset processing flag
            this.processingFile = false;
            
            // For iPhone Safari, be more aggressive about clearing the file input
            this.fileInput.value = null;
            this.fileInput.value = '';
            
            if (this.isMobile() || !navigator.mediaDevices?.getUserMedia) {
                // On mobile or if getUserMedia not available, use file input with camera
                // Longer delay for iPhone Safari
                setTimeout(() => {
                    console.log('Triggering file input click');
                    this.fileInput.click();
                }, 50);
            } else {
                // On desktop, try to access camera
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: 'environment' } 
                });
                this.video.srcObject = stream;
                this.video.style.display = 'block';
                this.cameraBtn.textContent = '📸 Capture';
                this.cameraBtn.onclick = () => this.capturePhoto();
            }
        } catch (error) {
            console.error('Camera access error:', error);
            console.log('Falling back to file input');
            // Clear file input and add delay before clicking
            this.fileInput.value = '';
            setTimeout(() => {
                this.fileInput.click();
            }, 10);
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
        console.log('File selected:', file ? file.name : 'none', file ? file.size : 0);
        
        // Prevent duplicate processing (iPhone Safari might fire multiple events)
        if (this.processingFile) {
            console.log('Already processing a file, ignoring duplicate event');
            return;
        }
        
        if (file) {
            this.processingFile = true;
            
            // Check if it's an image
            if (!file.type.startsWith('image/')) {
                alert('Please select an image file');
                this.processingFile = false;
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                console.log('File loaded, data URL length:', e.target.result.length);
                this.displayCapturedImage(e.target.result);
                this.processingFile = false;
            };
            reader.onerror = (e) => {
                console.error('FileReader error:', e);
                alert('Error reading the image file. Please try again.');
                this.processingFile = false;
            };
            reader.readAsDataURL(file);
        } else {
            console.log('No file selected');
            this.processingFile = false;
        }
    }

    displayCapturedImage(dataURL) {
        console.log('Setting captured image src, processing...');
        
        // Ensure we have valid image data before proceeding
        if (!dataURL || !dataURL.includes(',')) {
            console.error('Invalid image data received');
            alert('Invalid image data. Please try taking the photo again.');
            return;
        }
        
        // Show the captured image section immediately
        this.capturedImageSection.style.display = 'block';
        this.cameraBtn.style.display = 'none';
        this.video.style.display = 'none';
        
        // Set image source and wait for it to load
        this.capturedImage.src = dataURL;
        
        // For iPhone Safari, use a more reliable approach
        const processImageWhenReady = () => {
            // Check if image is loaded or if it's a data URL (which loads immediately)
            if (this.capturedImage.complete || dataURL.startsWith('data:')) {
                console.log('Image ready, starting processing...');
                setTimeout(() => {
                    this.processImage();
                }, 300); // Longer delay for iPhone Safari
            } else {
                // Fallback: wait a bit more and try again
                setTimeout(processImageWhenReady, 100);
            }
        };
        
        // Start the processing check
        processImageWhenReady();
        
        // Also set up onload as backup
        this.capturedImage.onload = () => {
            console.log('Image onload fired');
        };
        
        this.capturedImage.onerror = () => {
            console.error('Failed to load captured image');
            alert('Failed to load the image. Please try taking another photo.');
            this.resetToCamera();
        };
    }

    stopCamera() {
        if (this.video.srcObject) {
            this.video.srcObject.getTracks().forEach(track => track.stop());
            this.video.srcObject = null;
        }
    }

    resetToCamera() {
        // Stop any ongoing audio
        this.stopAudio();
        
        // Reset UI to camera state
        this.capturedImageSection.style.display = 'none';
        this.textSection.style.display = 'none';
        this.video.style.display = 'none';
        this.cameraBtn.style.display = 'block';
        this.cameraBtn.textContent = '📸 Take Photo';
        this.cameraBtn.onclick = () => this.startCamera();
        
        // Clear the file input to ensure new photos are detected
        this.fileInput.value = '';
        
        // Clear image event handlers to prevent conflicts
        this.capturedImage.onload = null;
        this.capturedImage.onerror = null;
        
        // Only clear image src after a delay to avoid race conditions
        setTimeout(() => {
            this.capturedImage.src = '';
        }, 100);
        
        console.log('Reset to camera view completed');
    }

    async processImage() {
        console.log('ProcessImage called');
        this.showLoading();
        
        try {
            console.log('Extracting text from image...');
            const text = await this.extractTextFromImage();
            console.log('Extracted text:', text ? text.substring(0, 50) + '...' : 'none');
            
            if (text && text.trim().length > 0) {
                console.log('Generating audio...');
                await this.generateAudio(text);
                console.log('Auto-playing audio...');
                this.autoPlayAudio();
            } else {
                throw new Error('No text found in image');
            }
        } catch (error) {
            console.error('Processing error:', error);
            alert('Sorry, I couldn\'t read the text from your book. Please try taking another photo!');
            // Reset to camera view on error
            this.resetToCamera();
        } finally {
            this.hideLoading();
        }
    }

    async extractTextFromImage() {
        const imageData = this.capturedImage.src;
        console.log('Image data length:', imageData.length);
        console.log('Image complete:', this.capturedImage.complete);
        console.log('Image naturalWidth:', this.capturedImage.naturalWidth);
        
        if (!imageData || !imageData.includes(',')) {
            console.error('Invalid image data - missing or malformed data URL');
            throw new Error('Invalid image data');
        }
        
        // Additional validation for mobile
        if (!this.capturedImage.complete || this.capturedImage.naturalWidth === 0) {
            console.error('Image not fully loaded');
            throw new Error('Image not fully loaded');
        }
        
        // Remove data URL prefix to get base64 data
        const base64Data = imageData.split(',')[1];
        console.log('Base64 data length:', base64Data.length);
        
        const response = await fetch('/api/extract-text', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                image: base64Data
            })
        });

        console.log('API response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API error response:', errorText);
            throw new Error(`Failed to extract text: ${response.status}`);
        }

        const result = await response.json();
        console.log('API result:', result);
        return result.text;
    }

    displayText(text) {
        this.extractedText.textContent = text;
        this.textSection.style.display = 'block';
        this.capturedImageSection.style.display = 'none';
    }

    async generateAudio(text) {
        try {
            // Clean up any previous audio URL before creating a new one
            if (this.audioPlayer.src && this.audioPlayer.src.startsWith('blob:')) {
                URL.revokeObjectURL(this.audioPlayer.src);
            }
            
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
            this.audioPlayer.load(); // Ensure the new audio is properly loaded
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
            
            // Try to auto-play, but handle mobile restrictions gracefully
            this.audioPlayer.play().catch((error) => {
                console.log('Auto-play blocked, showing play button:', error.message);
                // Show play button since auto-play was blocked (no alert needed)
                this.playBtn.style.display = 'inline-block';
                this.pauseBtn.style.display = 'none';
            });
            
            // If auto-play succeeds, hide play button
            this.audioPlayer.onplay = () => {
                this.playBtn.style.display = 'none';
                this.pauseBtn.style.display = 'inline-block';
            };
            
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
            // Clean up the previous audio URL to prevent memory leaks and loading issues
            if (this.audioPlayer.src && this.audioPlayer.src.startsWith('blob:')) {
                URL.revokeObjectURL(this.audioPlayer.src);
            }
            this.audioPlayer.src = '';
            this.audioPlayer.load(); // Reset the audio element completely
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