# 📚 Story Reader - Children's Book Reading App

A warm and cozy mobile web app that helps parents by reading children's books aloud. Simply take a photo of a book page, and the app will extract the text using Claude AI and read it using ElevenLabs text-to-speech.

## ✨ Features

- 📱 **Mobile-first design** - Optimized for phones and tablets
- 📷 **Camera integration** - Take photos of book pages directly in the app
- 🤖 **AI text recognition** - Powered by Claude AI for accurate text extraction
- 🎵 **Natural speech** - High-quality text-to-speech using ElevenLabs
- 🎨 **Child-friendly design** - Warm, cozy interface designed for children
- 📖 **Story playback** - Play, pause, and replay the extracted story

## 🚀 Quick Start

### Prerequisites

- Node.js 14 or higher
- Claude API key from Anthropic
- ElevenLabs API key

### Installation

1. Clone or download this project
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your API keys:
   ```
   CLAUDE_API_KEY=your_claude_api_key_here
   ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
   ```

4. Start the server:
   ```bash
   npm start
   ```

5. Open your browser to `http://localhost:3000`

### For Development

Use nodemon for auto-restarting during development:
```bash
npm run dev
```

## 🎯 How to Use

1. **Open the app** on your mobile device or computer
2. **Take a photo** of a children's book page by tapping the camera button
3. **Wait for processing** - The app will extract text using AI
4. **Listen to the story** - Tap "Play Story" to hear the book read aloud
5. **Take another photo** when ready for the next page

## 🔧 API Configuration

### Claude API

- Uses Claude 3 Haiku for fast, accurate text extraction
- Requires an API key from Anthropic Console

### ElevenLabs API

- Provides natural-sounding speech synthesis
- Default voice is "Adam" but you can specify any voice ID
- Child-friendly voices recommended for better experience

## 📱 Mobile Optimization

The app is designed mobile-first with:
- Responsive design that works on all screen sizes
- Touch-friendly interface elements
- Camera access for taking photos
- Optimized loading states and feedback

## 🛠️ Technical Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Backend**: Node.js with Express
- **AI Services**: 
  - Anthropic Claude for text extraction
  - ElevenLabs for text-to-speech
- **Styling**: Custom CSS with gradient backgrounds and rounded corners

## 🎨 Design Features

- Warm gradient backgrounds in pink and orange tones
- Rounded corners and soft shadows for a friendly feel
- Child-friendly fonts (Fredoka One for headings, Nunito for body)
- Emojis and playful elements throughout the interface
- Loading animations and smooth transitions

## 🔒 Security & Privacy

- Images are processed server-side and not stored permanently
- API keys are kept secure in environment variables
- No user data is collected or stored

## 🌟 Future Enhancements

Potential improvements could include:
- Voice selection for different characters
- Reading speed controls
- Bookmarking favorite stories
- Multiple language support
- Offline reading capabilities

## 📝 License

MIT License - Feel free to use and modify for your own projects!