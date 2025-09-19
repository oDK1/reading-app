class StoryReader {
    constructor() {
        this.initializeElements();
        this.bindEvents();
        this.currentAudio = null;
        this.processingFile = false;
        
        // Enhanced error logging for mobile debugging
        this.setupErrorLogging();
        
        // Flow tracking for debugging
        this.flowStep = 'initialized';
        this.flowHistory = [];
        
        // Debounce mechanism to prevent rapid clicks
        this.lastClickTime = 0;
        this.clickDebounceMs = 1000; // 1 second debounce
        
        // Performance tracking
        this.performanceTimers = {};
        
        this.logFlow('App initialized');
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
        
        // Debug panel elements
        this.debugPanel = document.getElementById('debugPanel');
        this.debugLog = document.getElementById('debugLog');
        this.title = document.querySelector('.title');
        
        // Debug logging
        console.log('Camera button found:', !!this.cameraBtn);
        console.log('File input found:', !!this.fileInput);
        
        // Setup debug panel
        this.setupDebugPanel();
    }

    setupErrorLogging() {
        // Log all unhandled errors to console and show user-friendly messages
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            console.error('Error details:', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack
            });
            
            // Show user-friendly error message
            this.showError('Something went wrong. Please try again.');
        });

        // Log unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.showError('A network error occurred. Please check your connection and try again.');
        });

        // Log network errors
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            try {
                const response = await originalFetch(...args);
                if (!response.ok) {
                    console.error('Fetch error:', response.status, response.statusText, args[0]);
                }
                return response;
            } catch (error) {
                console.error('Fetch network error:', error, args[0]);
                throw error;
            }
        };
    }

    showError(message) {
        // Create a visible error message on the page
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #ff4444;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 10000;
            font-family: 'Nunito', sans-serif;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            max-width: 90%;
            text-align: center;
        `;
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
        
        // Remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }

    setupDebugPanel() {
        // Tap title 5 times to open debug panel
        let tapCount = 0;
        let tapTimer = null;
        
        this.title.addEventListener('click', () => {
            tapCount++;
            if (tapTimer) clearTimeout(tapTimer);
            
            if (tapCount >= 5) {
                this.openDebugPanel();
                tapCount = 0;
            } else {
                tapTimer = setTimeout(() => {
                    tapCount = 0;
                }, 1000);
            }
        });

        // Debug panel controls
        document.getElementById('closeDebug').addEventListener('click', () => {
            this.debugPanel.style.display = 'none';
        });

        document.getElementById('clearDebug').addEventListener('click', () => {
            this.debugLog.textContent = '';
        });

        document.getElementById('exportDebug').addEventListener('click', () => {
            this.exportDebugLog();
        });

        // Override console methods to capture logs
        this.originalConsole = {
            log: console.log,
            error: console.error,
            warn: console.warn,
            info: console.info
        };

        console.log = (...args) => {
            this.originalConsole.log(...args);
            this.addToDebugLog('LOG', args);
        };

        console.error = (...args) => {
            this.originalConsole.error(...args);
            this.addToDebugLog('ERROR', args);
        };

        console.warn = (...args) => {
            this.originalConsole.warn(...args);
            this.addToDebugLog('WARN', args);
        };

        console.info = (...args) => {
            this.originalConsole.info(...args);
            this.addToDebugLog('INFO', args);
        };
    }

    openDebugPanel() {
        this.debugPanel.style.display = 'block';
        this.addToDebugLog('SYSTEM', ['Debug panel opened']);
    }

    addToDebugLog(level, args) {
        if (!this.debugLog) return;
        
        const timestamp = new Date().toLocaleTimeString();
        const message = args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');
        
        const logEntry = `[${timestamp}] ${level}: ${message}\n`;
        this.debugLog.textContent += logEntry;
        this.debugLog.scrollTop = this.debugLog.scrollHeight;
    }
    
    logFlow(step, details = {}) {
        this.flowStep = step;
        this.flowHistory.push({
            step,
            timestamp: Date.now(),
            details
        });
        
        console.log(`🔄 FLOW: ${step}`, details);
        
        // Also log device info for mobile debugging
        if (step === 'take_photo_clicked' || step === 'new_photo_clicked') {
            console.log('📱 DEVICE INFO:', {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                isMobile: this.isMobile(),
                screenSize: `${window.screen.width}x${window.screen.height}`,
                viewport: `${window.innerWidth}x${window.innerHeight}`,
                pixelRatio: window.devicePixelRatio,
                orientation: screen.orientation?.type || 'unknown'
            });
        }
    }

    exportDebugLog() {
        const logContent = this.debugLog.textContent;
        const blob = new Blob([logContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `debug-log-${new Date().toISOString().slice(0, 19)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    bindEvents() {
        this.cameraBtn.addEventListener('click', () => {
            // Debounce rapid clicks to prevent conflicts
            const now = Date.now();
            this.logFlow('camera_button_clicked_raw', {
                lastClickTime: this.lastClickTime,
                currentTime: now,
                timeSinceLastClick: now - this.lastClickTime,
                debounceMs: this.clickDebounceMs,
                willDebounce: (now - this.lastClickTime < this.clickDebounceMs)
            });
            
            if (now - this.lastClickTime < this.clickDebounceMs) {
                this.logFlow('click_debounced', {
                    timeSinceLastClick: now - this.lastClickTime,
                    debounceMs: this.clickDebounceMs
                });
                return;
            }
            this.lastClickTime = now;
            
            this.logFlow('take_photo_clicked');
            this.startCamera();
        });
        // Use only change event for iPhone Safari compatibility
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.retakeBtn.addEventListener('click', () => this.resetToCamera());
        this.readBtn.addEventListener('click', () => {
            this.logFlow('read_button_clicked');
            this.processImage();
        });
        this.playBtn.addEventListener('click', () => {
            this.logFlow('play_button_clicked');
            this.playAudio();
        });
        this.pauseBtn.addEventListener('click', () => this.pauseAudio());
        this.newPhotoBtn.addEventListener('click', () => {
            // Reset click debounce when taking new photo
            this.lastClickTime = 0;
            this.logFlow('new_photo_clicked');
            this.resetToCamera();
        });
    }

    async startCamera() {
        try {
            this.logFlow('start_camera_called', {
                isMobile: this.isMobile(),
                protocol: window.location.protocol,
                hasGetUserMedia: !!navigator.mediaDevices?.getUserMedia,
                processingFile: this.processingFile
            });
            
            // Reset processing flag
            this.processingFile = false;
            
            // For iPhone Safari, be more aggressive about clearing the file input
            const oldValue = this.fileInput.value;
            this.fileInput.value = null;
            this.fileInput.value = '';
            
            this.logFlow('file_input_cleared', {
                oldValue,
                newValue: this.fileInput.value,
                fileInputType: this.fileInput.type,
                fileInputAccept: this.fileInput.accept
            });
            
            if (this.isMobile() || !navigator.mediaDevices?.getUserMedia) {
                // On mobile or if getUserMedia not available, use file input with camera
                this.logFlow('using_file_input_approach');
                setTimeout(() => {
                    this.logFlow('triggering_file_input_click');
                    try {
                        this.fileInput.click();
                        this.logFlow('file_input_click_succeeded');
                    } catch (error) {
                        this.logFlow('file_input_click_failed', { error: error.message });
                        console.error('File input click failed:', error);
                    }
                }, 50);
            } else {
                // On desktop, try to access camera with lower resolution for faster processing
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { 
                        facingMode: 'environment',
                        width: { ideal: 1280 },  // Lower resolution for faster processing
                        height: { ideal: 720 }
                    } 
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
        
        // Optimize canvas size for faster processing
        const maxWidth = 1600;  // Max width for good text recognition but fast processing
        const maxHeight = 1200; // Max height
        
        let { videoWidth, videoHeight } = this.video;
        
        // Scale down if needed while maintaining aspect ratio
        if (videoWidth > maxWidth || videoHeight > maxHeight) {
            const ratio = Math.min(maxWidth / videoWidth, maxHeight / videoHeight);
            videoWidth *= ratio;
            videoHeight *= ratio;
        }
        
        this.canvas.width = videoWidth;
        this.canvas.height = videoHeight;
        context.drawImage(this.video, 0, 0, videoWidth, videoHeight);
        
        // Use lower quality JPEG for faster processing
        const dataURL = this.canvas.toDataURL('image/jpeg', 0.8); // 80% quality
        
        this.logFlow('desktop_photo_captured', {
            originalDimensions: `${this.video.videoWidth}x${this.video.videoHeight}`,
            optimizedDimensions: `${videoWidth}x${videoHeight}`,
            quality: '80%',
            estimatedSizeMB: (dataURL.length / 1024 / 1024).toFixed(2)
        });
        
        this.displayCapturedImage(dataURL);
        this.stopCamera();
    }

    handleFileSelect(event) {
        this.logFlow('handle_file_select_called', {
            eventType: event.type,
            filesLength: event.target.files ? event.target.files.length : 0,
            processingFile: this.processingFile
        });
        
        const file = event.target.files[0];
        
        this.logFlow('file_selection_details', {
            hasFile: !!file,
            fileName: file ? file.name : 'none',
            fileSize: file ? file.size : 0,
            fileType: file ? file.type : 'none',
            lastModified: file ? file.lastModified : 'none'
        });
        
        // Prevent duplicate processing (iPhone Safari might fire multiple events)
        if (this.processingFile) {
            this.logFlow('duplicate_processing_prevented');
            return;
        }
        
        if (file) {
            this.processingFile = true;
            this.logFlow('file_processing_started');
            
            // Check if it's an image
            if (!file.type.startsWith('image/')) {
                this.logFlow('file_rejected_not_image', { fileType: file.type });
                alert('Please select an image file');
                this.processingFile = false;
                return;
            }
            
            // Clear any pending timeouts from previous attempts
            if (this.fileProcessingTimeout) {
                clearTimeout(this.fileProcessingTimeout);
                this.logFlow('cleared_previous_processing_timeout');
            }
            
            this.logFlow('creating_file_reader');
            const reader = new FileReader();
            
            reader.onload = (e) => {
                this.logFlow('file_reader_onload', {
                    resultLength: e.target.result ? e.target.result.length : 0,
                    resultType: typeof e.target.result
                });
                
                try {
                    // Clear the timeout since processing succeeded
                    if (this.fileProcessingTimeout) {
                        clearTimeout(this.fileProcessingTimeout);
                        this.fileProcessingTimeout = null;
                    }
                    
                    this.displayCapturedImage(e.target.result);
                    this.processingFile = false;
                    this.logFlow('file_processing_completed');
                } catch (error) {
                    if (this.fileProcessingTimeout) {
                        clearTimeout(this.fileProcessingTimeout);
                        this.fileProcessingTimeout = null;
                    }
                    this.logFlow('display_captured_image_error', { error: error.message, stack: error.stack });
                    console.error('Error in displayCapturedImage:', error);
                    this.processingFile = false;
                }
            };
            
            reader.onerror = (e) => {
                if (this.fileProcessingTimeout) {
                    clearTimeout(this.fileProcessingTimeout);
                    this.fileProcessingTimeout = null;
                }
                this.logFlow('file_reader_error', { error: e });
                console.error('FileReader error:', e);
                alert('Error reading the image file. Please try again.');
                this.processingFile = false;
            };
            
            this.logFlow('starting_file_read_as_data_url');
            
            // Set a timeout to detect if file processing gets stuck
            this.fileProcessingTimeout = setTimeout(() => {
                if (this.processingFile) {
                    this.logFlow('file_processing_timeout_detected');
                    this.processingFile = false;
                    alert('File processing timed out. Please try taking another photo.');
                    this.resetToCamera();
                }
            }, 10000); // 10 second timeout
            
            reader.readAsDataURL(file);
        } else {
            this.logFlow('no_file_selected');
            this.processingFile = false;
        }
    }

    displayCapturedImage(dataURL) {
        this.logFlow('display_captured_image_called', {
            dataURLLength: dataURL ? dataURL.length : 0,
            dataURLType: dataURL ? dataURL.substring(0, 30) : 'none',
            hasComma: dataURL ? dataURL.includes(',') : false
        });
        
        // Ensure we have valid image data before proceeding
        if (!dataURL || !dataURL.includes(',')) {
            this.logFlow('invalid_image_data_error', {
                dataURL: dataURL ? dataURL.substring(0, 100) : 'null'
            });
            console.error('Invalid image data received');
            alert('Invalid image data. Please try taking the photo again.');
            return;
        }
        
        this.logFlow('image_data_validation_passed');
        
        // Show the captured image section immediately
        this.capturedImageSection.style.display = 'block';
        this.cameraBtn.style.display = 'none';
        this.video.style.display = 'none';
        this.logFlow('ui_updated_for_captured_image');
        
        // Set image source and wait for it to load
        this.capturedImage.src = dataURL;
        this.logFlow('image_src_set', {
            srcLength: this.capturedImage.src.length,
            complete: this.capturedImage.complete
        });
        
        // For iPhone Safari, use a more reliable approach
        let attemptCount = 0;
        const processImageWhenReady = () => {
            attemptCount++;
            const imageReady = this.capturedImage.complete || dataURL.startsWith('data:');
            
            this.logFlow('process_image_when_ready_check', {
                attempt: attemptCount,
                imageComplete: this.capturedImage.complete,
                imageNaturalWidth: this.capturedImage.naturalWidth,
                imageNaturalHeight: this.capturedImage.naturalHeight,
                isDataURL: dataURL.startsWith('data:'),
                imageReady
            });
            
            if (imageReady) {
                this.logFlow('image_ready_starting_process', {
                    delayMs: 300
                });
                setTimeout(() => {
                    this.logFlow('about_to_call_process_image_from_display');
                    this.processImage();
                }, 300); // Longer delay for iPhone Safari
            } else if (attemptCount < 30) {
                this.logFlow('image_not_ready_will_retry', {
                    attempt: attemptCount,
                    retryInMs: 100
                });
                setTimeout(processImageWhenReady, 100);
            } else {
                this.logFlow('image_failed_to_load_after_attempts', {
                    totalAttempts: attemptCount
                });
                alert('Image failed to load after multiple attempts. Please try taking another photo.');
                this.resetToCamera();
            }
        };
        
        // Start the processing check
        this.logFlow('starting_process_image_when_ready_loop');
        processImageWhenReady();
        
        // Also set up onload as backup
        this.capturedImage.onload = () => {
            this.logFlow('image_onload_event_fired');
        };
        
        this.capturedImage.onerror = () => {
            this.logFlow('image_onerror_event_fired');
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
        this.logFlow('reset_to_camera_called');
        
        // Stop any ongoing audio
        this.stopAudio();
        this.logFlow('audio_stopped');
        
        // Reset UI to camera state
        this.capturedImageSection.style.display = 'none';
        this.textSection.style.display = 'none';
        this.video.style.display = 'none';
        this.cameraBtn.style.display = 'block';
        this.cameraBtn.textContent = '📸 Take Photo';
        // Remove any existing onclick handler to avoid conflicts with addEventListener
        this.cameraBtn.onclick = null;
        this.logFlow('ui_reset_completed');
        
        // Clear the file input to ensure new photos are detected
        const oldFileValue = this.fileInput.value;
        this.fileInput.value = '';
        this.logFlow('file_input_cleared_in_reset', {
            oldValue: oldFileValue,
            newValue: this.fileInput.value
        });
        
        // Clear image event handlers to prevent conflicts
        this.capturedImage.onload = null;
        this.capturedImage.onerror = null;
        this.logFlow('image_handlers_cleared');
        
        // Only clear image src after a delay to avoid race conditions
        setTimeout(() => {
            const oldSrc = this.capturedImage.src;
            this.capturedImage.src = '';
            this.logFlow('image_src_cleared', {
                oldSrc: oldSrc ? oldSrc.substring(0, 50) + '...' : 'empty',
                newSrc: this.capturedImage.src
            });
        }, 100);
        
        this.logFlow('reset_to_camera_completed');
    }

    async processImage() {
        // Start performance timer
        this.performanceTimers.totalProcessing = performance.now();
        
        this.logFlow('process_image_called', {
            capturedImageSrc: this.capturedImage.src ? this.capturedImage.src.substring(0, 50) + '...' : 'none',
            imageComplete: this.capturedImage.complete,
            imageNaturalWidth: this.capturedImage.naturalWidth,
            imageNaturalHeight: this.capturedImage.naturalHeight
        });
        
        this.showLoading();
        this.logFlow('loading_shown');
        
        try {
            this.logFlow('starting_text_extraction');
            const text = await this.extractTextFromImage();
            this.logFlow('text_extraction_completed', {
                hasText: !!text,
                textLength: text ? text.length : 0,
                textPreview: text ? text.substring(0, 50) + '...' : 'none'
            });
            
            if (text && text.trim().length > 0) {
                this.logFlow('starting_audio_generation');
                await this.generateAudio(text);
                this.logFlow('audio_generation_completed');
                
                this.logFlow('starting_auto_play_audio');
                this.autoPlayAudio();
                this.logFlow('auto_play_audio_completed');
            } else {
                this.logFlow('no_text_found_throwing_error');
                throw new Error('No text found in image');
            }
        } catch (error) {
            this.logFlow('process_image_error', {
                errorMessage: error.message,
                errorStack: error.stack,
                errorName: error.name
            });
            console.error('Processing error:', error);
            alert('Sorry, I couldn\'t read the text from your book. Please try taking another photo!');
            // Reset to camera view on error
            this.resetToCamera();
        } finally {
            this.hideLoading();
            
            // Calculate total processing time
            const totalTime = performance.now() - this.performanceTimers.totalProcessing;
            this.logFlow('processing_performance_summary', {
                totalProcessingTimeMs: totalTime.toFixed(2),
                totalProcessingTimeSec: (totalTime / 1000).toFixed(2),
                imageOptimizationUsed: this.performanceTimers.compressionUsed || false
            });
            
            this.logFlow('loading_hidden');
        }
    }

    async extractTextFromImage() {
        this.performanceTimers.textExtraction = performance.now();
        
        const imageData = this.capturedImage.src;
        this.logFlow('extract_text_from_image_called', {
            originalImageLength: imageData.length,
            imageComplete: this.capturedImage.complete,
            naturalWidth: this.capturedImage.naturalWidth,
            naturalHeight: this.capturedImage.naturalHeight
        });
        
        if (!imageData || !imageData.includes(',')) {
            this.logFlow('invalid_image_data_error');
            throw new Error('Invalid image data');
        }
        
        // Additional validation for mobile
        if (!this.capturedImage.complete || this.capturedImage.naturalWidth === 0) {
            this.logFlow('image_not_fully_loaded_error');
            throw new Error('Image not fully loaded');
        }
        
        // Check if image needs compression (with lower threshold for faster processing)
        let processedImageData = imageData;
        const imageSizeMB = imageData.length / 1024 / 1024;
        
        this.logFlow('checking_image_size', {
            imageSizeMB: imageSizeMB.toFixed(2),
            needsCompression: imageSizeMB > 2, // Lowered threshold
            strategy: 'fast_processing_optimized'
        });
        
        if (imageSizeMB > 2) { // Lowered from 3MB to 2MB for faster processing
            this.performanceTimers.compression = performance.now();
            this.performanceTimers.compressionUsed = true;
            
            this.logFlow('compressing_large_image', {
                reason: 'size_optimization_for_speed'
            });
            
            // More aggressive compression for speed
            processedImageData = await this.compressImage(imageData, 0.6, 1400, 1400);
            
            const compressionTime = performance.now() - this.performanceTimers.compression;
            this.logFlow('compression_performance', {
                compressionTimeMs: compressionTime.toFixed(2),
                compressionTimeSec: (compressionTime / 1000).toFixed(2)
            });
            
            const compressedSizeMB = processedImageData.length / 1024 / 1024;
            this.logFlow('image_compressed', {
                originalSizeMB: imageSizeMB.toFixed(2),
                compressedSizeMB: compressedSizeMB.toFixed(2),
                compressionRatio: (compressedSizeMB / imageSizeMB * 100).toFixed(1) + '%',
                speedOptimized: true
            });
        } else {
            this.logFlow('image_size_acceptable_for_fast_processing', {
                imageSizeMB: imageSizeMB.toFixed(2),
                skippingCompression: true
            });
        }
        
        // Remove data URL prefix to get base64 data
        const base64Data = processedImageData.split(',')[1];
        this.logFlow('prepared_base64_data', {
            base64Length: base64Data.length,
            finalSizeMB: (processedImageData.length / 1024 / 1024).toFixed(2)
        });
        
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
        const textExtractionTime = performance.now() - this.performanceTimers.textExtraction;
        
        this.logFlow('text_extraction_api_success', {
            extractedTextLength: result.text ? result.text.length : 0,
            textExtractionTimeMs: textExtractionTime.toFixed(2),
            textExtractionTimeSec: (textExtractionTime / 1000).toFixed(2)
        });
        
        return result.text;
    }
    
    async compressImage(dataURL, quality = 0.7, maxWidth = 1920, maxHeight = 1920) {
        return new Promise((resolve) => {
            this.logFlow('starting_image_compression', {
                quality,
                maxWidth,
                maxHeight,
                originalSize: (dataURL.length / 1024 / 1024).toFixed(2) + 'MB'
            });
            
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                // Calculate new dimensions while maintaining aspect ratio
                let { width, height } = img;
                
                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width *= ratio;
                    height *= ratio;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                // Draw and compress
                ctx.drawImage(img, 0, 0, width, height);
                const compressedDataURL = canvas.toDataURL('image/jpeg', quality);
                
                this.logFlow('image_compression_completed', {
                    originalDimensions: `${img.width}x${img.height}`,
                    newDimensions: `${width}x${height}`,
                    originalSize: (dataURL.length / 1024 / 1024).toFixed(2) + 'MB',
                    compressedSize: (compressedDataURL.length / 1024 / 1024).toFixed(2) + 'MB'
                });
                
                resolve(compressedDataURL);
            };
            
            img.src = dataURL;
        });
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
        this.logFlow('play_audio_called', {
            hasAudioSrc: !!this.audioPlayer.src,
            audioSrc: this.audioPlayer.src ? this.audioPlayer.src.substring(0, 50) + '...' : 'none',
            audioDuration: this.audioPlayer.duration,
            audioReadyState: this.audioPlayer.readyState
        });
        
        if (this.audioPlayer.src) {
            try {
                this.audioPlayer.play();
                this.playBtn.style.display = 'none';
                this.pauseBtn.style.display = 'inline-block';
                this.logFlow('audio_play_initiated');
                
                this.audioPlayer.onended = () => {
                    this.logFlow('audio_playback_ended');
                    this.playBtn.style.display = 'inline-block';
                    this.pauseBtn.style.display = 'none';
                };
            } catch (error) {
                this.logFlow('audio_play_error', {
                    errorMessage: error.message,
                    errorName: error.name
                });
                console.error('Audio play error:', error);
            }
        } else {
            this.logFlow('no_audio_src_available');
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