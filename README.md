<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1W0afWkCgcCTfgW77AvOFz47EzhmY3F2R

## Run Locally

**Prerequisites:**  Node.js (v18 or higher recommended)

### Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   
   Create a `.env.local` file in the root directory:
   ```bash
   GEMINI_API_KEY=your_api_key_here
   ```
   
   Get your API key from: https://aistudio.google.com/apikey
   
   **Note:** If you're running in Google AI Studio, the API key can be selected via the UI, so this step is optional.

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   
   The app will be available at `http://localhost:3000`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run firebase:deploy` - Deploy to Firebase
- `npm run firebase:deploy:hosting` - Deploy only hosting
- `npm run firebase:serve` - Run Firebase emulators

### Firebase Deployment

This app is configured for Firebase Hosting and Authentication. See `FIREBASE_SETUP.md` for detailed setup instructions.

Quick deploy:
```bash
npm run build
npm run firebase:deploy:hosting
```

### Troubleshooting

- **API Key Issues:** Make sure your `.env.local` file is in the root directory and contains `GEMINI_API_KEY=your_actual_key`
- **Port Already in Use:** The default port is 3000. If it's occupied, Vite will automatically use the next available port
- **Module Not Found:** Run `npm install` again to ensure all dependencies are installed
