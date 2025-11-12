<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Bottle Swap Studio

AI-powered bottle image manipulation tool using Google's Gemini 2.5 Flash Image model. Generate multiple angles of your product and seamlessly swap bottles into different scenes.

View your app in AI Studio: https://ai.studio/apps/drive/1alCWOKDDvzs4wRgsGuRseN3EUYYebhUU

## Features

### Core Functionality
- **Simple Mode**: Quick bottle swap into reference scenes
- **Complex Mode**: Generate 4 different bottle angles, then create scene variations
- **Style Reference Mode**: Create new scenes inspired by multiple style references
- **Batch Generation**: Generate 4 variations simultaneously

### User Experience Enhancements
- **Image Compression**: Automatic compression for images >2MB (max 10MB)
- **Smart Validation**: File type and size validation before upload
- **Toast Notifications**: Beautiful, non-intrusive success/error messages
- **Progress Indicators**: Real-time status updates during generation
- **Cancellation Support**: Cancel ongoing generations to save time
- **Full-Screen Preview**: Click any generated image to view in full screen
- **Batch Download**: Download all generated images at once or as ZIP
- **Quick Prompts**: Pre-defined prompt suggestions for common adjustments
- **Light/Dark Mode**: Toggle between light and dark themes with automatic system preference detection
- **Generation History**: Persistent local history of your last 20 generations with localStorage
- **Character Counter**: Smart prompt counter (max 1000 characters) with visual feedback
- **ZIP Export**: Download all generated images in a single ZIP file

### Reliability & Performance
- **Automatic Retry**: API calls retry up to 3 times with exponential backoff on network errors
- **Memory Optimization**: Proper cleanup of resources to prevent memory leaks
- **Error Recovery**: Smart error handling that distinguishes retriable vs non-retriable errors

### Accessibility
- ARIA labels and roles for screen readers
- Keyboard navigation support (Tab, Enter, Space, Escape)
- Focus management for modals and interactive elements
- High contrast light and dark themes
- Color-blind friendly error states

## Run Locally

**Prerequisites:** Node.js 16+

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd Bottle-Swap-Studio
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure API Key**
   - Copy `.env.example` to `.env.local`
   - Get your Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)
   - Add your key to `.env.local`:
     ```
     GEMINI_API_KEY=your_api_key_here
     ```

4. **Run the development server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser

5. **Build for production**
   ```bash
   npm run build
   npm run preview
   ```

## Tech Stack

- **React 19.2** - UI framework
- **TypeScript 5.8** - Type-safe JavaScript
- **Vite 6.2** - Fast build tool
- **Tailwind CSS** - Utility-first styling
- **Google Gemini AI** - Image generation model

## Usage Guide

### Simple Generation
1. Upload your product packshot
2. Choose generation mode (bottle swap or style reference)
3. Upload reference scene or style images
4. (Optional) Add custom prompt details
5. Click "Generate Creations"

### Complex Generation
1. Upload your product packshot
2. Click "Generate Angles" to create 4 different views
3. Upload reference scene or style images
4. (Optional) Add custom prompt details
5. Click "Generate Creations"

### Tips
- Use high-quality, well-lit product images for best results
- Images are automatically compressed to optimize performance
- Try the quick prompt suggestions for common adjustments
- Click on generated images to view them full-screen
- Use "Download All" to save all variations at once

## Performance

- **Image Compression**: Automatic optimization for images >2MB
- **Memory Management**: Proper cleanup to prevent memory leaks
- **Lazy Loading**: Efficient resource loading
- **Responsive Design**: Optimized for mobile and desktop

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## License

MIT
