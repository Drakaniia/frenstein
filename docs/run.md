# Running the Birthday Celebration App

This guide provides comprehensive instructions for setting up and running the birthday celebration web application.

## Prerequisites

### System Requirements
- **Operating System**: Windows 10+, macOS 10.15+, or Linux (Ubuntu 18.04+)
- **Node.js**: Version 18.0 or higher
- **npm**: Version 8.0 or higher (comes with Node.js)
- **Memory**: Minimum 4GB RAM
- **Storage**: At least 2GB free disk space

### Required Software
1. **Node.js and npm**
   - Download from [nodejs.org](https://nodejs.org/)
   - Recommended: Use the LTS (Long Term Support) version
   - Verify installation:
     ```bash
     node --version
     npm --version
     ```

2. **Git** (for cloning the repository)
   - Download from [git-scm.com](https://git-scm.com/)
   - Verify installation:
     ```bash
     git --version
     ```

## Quick Start (Automated Setup)

### Option 1: Using the Setup Script (Recommended)

Run the automated setup script which handles all prerequisites:

```bash
# Make the script executable (Linux/macOS)
chmod +x setup.sh

# Run the setup script
./setup.sh
```

The script will:
- Check for and install Node.js if missing
- Install all project dependencies
- Optionally start the development server

### Option 2: Manual Setup

If you prefer manual setup or the script doesn't work on your system:

1. **Clone or download the repository**
   ```bash
   git clone <repository-url>
   cd nov_6_Frenstein
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

## Available Commands

### Development Commands
```bash
# Start development server with hot reload
npm run dev

# Build for development (development mode)
npm run build:dev

# Run ESLint code checking
npm run lint

# Format code with Prettier
npm run format
```

### Production Commands
```bash
# Build for production
npm run build

# Preview production build locally
npm run preview
```

### Testing Commands
```bash
# Run unit tests (if configured)
npm test

# Run end-to-end tests with Playwright
npx playwright test

# Run tests with UI
npx playwright test --ui
```

## Development Workflow

### 1. Start Development
```bash
npm run dev
```
The app will be available at `http://localhost:8080`

### 2. Make Changes
- Edit source files in the `src/` directory
- Changes will automatically reload in the browser
- Check the terminal for any compilation errors

### 3. Code Quality
```bash
# Check code quality
npm run lint

# Fix formatting issues
npm run format
```

### 4. Test Before Deploy
```bash
# Build production version
npm run build

# Test production build
npm run preview
```

## Environment Configuration

### Development Environment
- **Server**: Runs on `http://localhost:8080`
- **Hot Reload**: Enabled
- **Source Maps**: Enabled
- **Component Tagger**: Enabled (for development)

### Production Environment
- **Build Output**: `dist/` directory
- **Optimization**: Minified and bundled
- **Source Maps**: Not included (for security)

## Troubleshooting

### Common Issues

1. **Node.js Version Incompatibility**
   ```bash
   # Check current version
   node --version
   
   # Use nvm to switch to required version
   nvm install 18
   nvm use 18
   ```

2. **Permission Errors (Linux/macOS)**
   ```bash
   # Fix npm permissions
   sudo chown -R $(whoami) ~/.npm
   
   # Or use nvm instead of global npm
   ```

3. **Port Already in Use**
   ```bash
   # Kill process using port 8080
   # On Windows:
   netstat -ano | findstr :8080
   taskkill /PID <PID> /F
   
   # On Linux/macOS:
   lsof -ti:8080 | xargs kill -9
   ```

4. **Dependency Installation Issues**
   ```bash
   # Clear npm cache
   npm cache clean --force
   
   # Delete node_modules and package-lock.json
   rm -rf node_modules package-lock.json
   
   # Reinstall dependencies
   npm install
   ```

5. **Build Failures**
   ```bash
   # Check TypeScript configuration
   npx tsc --noEmit
   
   # Check for specific errors
   npm run build
   ```

### Performance Issues

1. **Slow Development Server**
   - Ensure sufficient RAM (minimum 4GB)
   - Close unnecessary applications
   - Check antivirus software interference

2. **Animation Performance**
   - The app uses GSAP animations which are GPU-accelerated
   - Ensure hardware acceleration is enabled in browser
   - Check browser developer tools for performance bottlenecks

## Browser Compatibility

### Supported Browsers
- **Chrome**: Version 90+
- **Firefox**: Version 88+
- **Safari**: Version 14+
- **Edge**: Version 90+

### Mobile Support
- **iOS Safari**: Version 14+
- **Chrome Mobile**: Version 90+
- **Samsung Internet**: Version 15+

## Deployment

### Static Hosting (Recommended)
The app builds to static files and can be deployed to:

1. **Netlify**
   ```bash
   # Build and deploy
   npm run build
   # Upload dist/ folder to Netlify
   ```

2. **Vercel**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Deploy
   vercel --prod
   ```

3. **GitHub Pages**
   ```bash
   # Build
   npm run build
   
   # Deploy dist/ folder to gh-pages branch
   ```

### Traditional Hosting
1. Build the project: `npm run build`
2. Upload `dist/` folder contents to your web server
3. Configure server to redirect all routes to `index.html` (for SPA routing)

## Security Considerations

- The app contains a PIN lock feature (default: 2306)
- Change the PIN in `src/components/LandingCard.tsx` before production
- No sensitive data is stored or transmitted
- All assets are static and served from the same origin

## Support

For issues or questions:
1. Check this documentation first
2. Review the console output for error messages
3. Ensure all prerequisites are met
4. Test with a fresh `npm install` if issues persist

---

**Note**: This is a birthday celebration application with animations and interactive features. Performance may vary based on device capabilities and network speed.