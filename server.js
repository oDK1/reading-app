require('dotenv').config();
const express = require('express');
const path = require('path');
const multer = require('multer');
const fetch = require('node-fetch');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

// Explicitly serve CSS and JS files
app.get('/styles.css', (req, res) => {
    res.setHeader('Content-Type', 'text/css');
    res.sendFile(path.join(__dirname, 'styles.css'));
});

app.get('/script.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(path.join(__dirname, 'script.js'));
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Extract text from image using Claude API
app.post('/api/extract-text', async (req, res) => {
    try {
        const { image } = req.body;
        
        if (!image) {
            return res.status(400).json({ error: 'No image provided' });
        }

        const claudeApiKey = process.env.CLAUDE_API_KEY;
        if (!claudeApiKey) {
            return res.status(500).json({ error: 'Claude API key not configured' });
        }
        

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': claudeApiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-haiku-20240307',
                max_tokens: 1000,
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: 'Please extract all the text from this children\'s book page. Return only the text content, nothing else. If there are multiple text blocks, separate them with spaces to form complete sentences.'
                            },
                            {
                                type: 'image',
                                source: {
                                    type: 'base64',
                                    media_type: 'image/jpeg',
                                    data: image
                                }
                            }
                        ]
                    }
                ]
            })
        });

        if (!response.ok) {
            throw new Error(`Claude API error: ${response.status}`);
        }

        const result = await response.json();
        const extractedText = result.content[0].text;

        res.json({ text: extractedText });
    } catch (error) {
        console.error('Text extraction error:', error);
        res.status(500).json({ error: 'Failed to extract text from image' });
    }
});

// Generate audio using ElevenLabs API
app.post('/api/generate-audio', async (req, res) => {
    try {
        const { text } = req.body;
        
        if (!text) {
            return res.status(400).json({ error: 'No text provided' });
        }

        const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
        if (!elevenLabsApiKey) {
            return res.status(500).json({ error: 'ElevenLabs API key not configured' });
        }

        // Using a child-friendly voice ID (you may need to adjust this)
        const voiceId = process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB'; // Default to Adam voice

        console.log('ElevenLabs Request:', {
            voiceId: voiceId,
            textLength: text.length,
            textPreview: text.substring(0, 100) + '...',
            apiKeyExists: !!elevenLabsApiKey,
            apiKeyPrefix: elevenLabsApiKey ? elevenLabsApiKey.substring(0, 8) + '...' : 'none'
        });

        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
            method: 'POST',
            headers: {
                'Accept': 'audio/mpeg',
                'Content-Type': 'application/json',
                'xi-api-key': elevenLabsApiKey
            },
            body: JSON.stringify({
                text: text,
                model_id: 'eleven_monolingual_v1',
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75,
                    style: 0.1,
                    use_speaker_boost: true
                }
            })
        });

        if (!response.ok) {
            // Get the actual error message from ElevenLabs
            let elevenLabsError = 'Unknown ElevenLabs error';
            try {
                const errorBody = await response.text();
                elevenLabsError = errorBody;
                console.error('ElevenLabs API Error Details:', {
                    status: response.status,
                    statusText: response.statusText,
                    headers: Object.fromEntries(response.headers.entries()),
                    body: errorBody
                });
            } catch (parseError) {
                console.error('Failed to parse ElevenLabs error:', parseError);
            }
            
            return res.status(500).json({ 
                error: 'ElevenLabs API failed',
                details: {
                    status: response.status,
                    statusText: response.statusText,
                    elevenLabsError: elevenLabsError
                }
            });
        }

        const audioBuffer = await response.buffer();
        
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Length', audioBuffer.length);
        res.send(audioBuffer);
    } catch (error) {
        console.error('Audio generation error:', error);
        
        // Return more detailed error information
        res.status(500).json({ 
            error: 'Failed to generate audio',
            details: {
                message: error.message,
                stack: error.stack,
                type: error.constructor.name
            }
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`Story Reader app listening on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} to view the app`);
    
    // Check for required environment variables
    if (!process.env.CLAUDE_API_KEY) {
        console.warn('⚠️  CLAUDE_API_KEY environment variable not set');
    }
    if (!process.env.ELEVENLABS_API_KEY) {
        console.warn('⚠️  ELEVENLABS_API_KEY environment variable not set');
    }
});