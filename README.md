# Vibe Kanban - Birthday Celebration Website

This is an interactive birthday celebration website built with React, TypeScript, and Vite. It features password unlocking, animations, memory galleries, and a cutting-edge 3D particle system controlled by hand gestures.

## Project Overview

This is a React + TypeScript + Vite birthday celebration website project that uses modern UI components and animation effects. The project is an interactive birthday greeting page that includes password unlocking, animation effects, image galleries, and an innovative hand-gesture-controlled 3D particle system.

## Main Tech Stack

- **Frontend Framework**: React 18.3.1 + TypeScript
- **Build Tool**: Vite 7.3.0
- **UI Components**: Radix UI + shadcn/ui
- **Styling Framework**: Tailwind CSS
- **Animation Library**: GSAP (GreenSock Animation Platform)
- **3D Graphics**: Three.js + React Three Fiber
- **Computer Vision**: MediaPipe Tasks Vision
- **Routing**: React Router DOM
- **State Management**: React Query (TanStack Query)
- **Icons**: Lucide React

## Project Structure

```
src/
├── components/          # Reusable components
│   ├── ui/             # shadcn/ui base components
│   ├── LandingCard.tsx # Password unlock card
│   ├── HeroSection.tsx # Main hero section
│   ├── MemoryGallery.tsx # Memory gallery
│   ├── ParticleSystem3D.tsx # Hand-controlled particle system
│   ├── TableScene3D.tsx # 3D table viewer
│   └── ...            # Other effect components
├── pages/              # Page components
│   ├── Index.tsx       # Main page
│   ├── FinalSection.tsx # Particle system page
│   ├── TableScene.tsx  # 3D table scene page
│   └── NotFound.tsx    # 404 page
├── hooks/              # Custom Hooks
├── lib/                # Utility functions
└── assets/             # Static assets
    └── 3D-models/      # 3D model files
```

## Core Features

### 1. 3D Particle System with Hand Gesture Control 🎨✋
- **5,000 interactive particles** rendered in real-time using Three.js
- **Hand gesture recognition** using MediaPipe for intuitive control
- **Three dynamic formations**:
  - 🖐️ Open Palm → Galaxy formation (purple/pink spiral)
  - ✊ Closed Fist → Saturn formation (planet with rings)
  - ✌️ Peace Sign → Heart formation (red/pink heart)
- **Smooth transitions** between formations with color morphing
- **GPU-accelerated rendering** for optimal performance
- **Real-time camera tracking** with visual feedback

### 2. Password Unlock System
- 4-digit numeric password verification (default password: 2306)
- Virtual numeric keyboard
- Error notifications and animations
- Transition animations after successful unlock

### 3. Animation Effects
- Complex page animations using the GSAP animation library
- Scroll-triggered animations (ScrollTrigger)
- Confetti effects
- Hover and interaction effects

### 4. 3D Table Scene
- Interactive 3D table model viewer
- Built with React Three Fiber
- Smooth camera controls

### 5. Responsive Design
- Mobile-first responsive layout
- Adapts to various screen sizes
- Touch-friendly interaction design

## Building and Running

### Prerequisites
- Node.js 18+ installed
- Modern browser with WebGL support (Chrome 90+, Firefox 88+, Safari 14.1+, Edge 90+)
- Webcam for hand tracking features

### Development Environment
```bash
npm install  # Install dependencies
npm run dev  # Start development server
```
Starts the development server, default running on `http://localhost:5173`

### Using the Particle System
1. Navigate to the main page
2. Scroll down and click "🎨 Enter Particle Experience"
3. Allow camera access when prompted
4. Wait for "Camera Status: ✓ Ready"
5. Show your left hand to the camera and make gestures

**Tips for best results:**
- Ensure good lighting
- Keep hand 1-2 feet from camera
- Use plain backgrounds
- Hold gestures for 1-2 seconds

### Build Production Version
```bash
npm run build
```
Builds the production version to the `dist/` directory

### Preview Production Version
```bash
npm run preview
```
Previews the built production version

### Code Checking and Formatting
```bash
npm run lint      # ESLint code checking
npm run format    # Prettier code formatting
```

## Development Conventions

### Code Style
- Use TypeScript for type checking
- Follow ESLint rules
- Use Prettier for code formatting
- Components use PascalCase naming
- File names use PascalCase (components) or camelCase (utility functions)

### Component Development
- All UI components are built on shadcn/ui
- Use Tailwind CSS for styling
- Components should include appropriate TypeScript type definitions
- Use React Hooks for state and side effects

### Resource Management
- Static resources go in `src/assets/` directory
- Use WebP format for images when possible
- Control animation resource (like GIF) sizes appropriately

## Special Notes

### Password Modification
Default password is `2306`, can be changed in `src/components/LandingCard.tsx`:
```typescript
const correctPin = '2306'; // Modify this value here
```

### Animation Configuration
GSAP animation configuration is managed independently in each component, main animation parameters:
- Duration: 0.5s - 0.8s
- Easing functions: mainly use 'power3.out', 'back.out', 'elastic.out'
- Scroll triggering: use ScrollTrigger plugin

### Theme Customization
Tailwind CSS theme configuration in `tailwind.config.ts`:
- Custom color variables use CSS variables
- Custom animation keyframes
- Responsive breakpoint configuration

## Dependency Management

### Main Dependencies
- React ecosystem (React, React DOM, React Router)
- Three.js + React Three Fiber (3D graphics)
- MediaPipe Tasks Vision (hand tracking)
- Radix UI component library (accessibility support)
- GSAP animation library
- Tailwind CSS styling framework

### Development Dependencies
- Vite build tool
- TypeScript type checking
- ESLint + Prettier code quality tools
- Test-related tools (Testing Library, Playwright)

## Documentation

- [Quick Start Guide](./docs/QUICK_START.md) - Get up and running quickly
- [Particle System Documentation](./docs/particle-system-hand-tracking.md) - Detailed particle system guide
- [3D Table Scene](./docs/3d-table-scene.md) - Table scene documentation
- [Development Guide](./docs/DEVELOPMENT_GUIDE.md) - Development best practices
- [Implementation Summary](./docs/IMPLEMENTATION_SUMMARY.md) - Complete feature overview

## Deployment Suggestions

1. Build production version: `npm run build`
2. Deploy contents of `dist/` directory to static file server
3. Ensure server supports SPA routing (all routes redirect to index.html)
4. Configure appropriate caching strategy

## Commit Hygiene Guidelines

Follow strict version control best practices: each commit must represent one clear, logical change—such as a single feature, fix, refactor, removal, refactor, performance, test, build, docs, style, chore, revert, security, deps, improvement, or continuous integration—NEVER commit unrelated work.

### Commit Format

Use this strict format: `commit_type: commit_message`

### Common Commit Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `build`: Changes that affect the build system or external dependencies
- `ci`: Changes to our CI configuration files and scripts
- `chore`: Other changes that don't modify src or test files
- `revert`: Reverts a previous commit
- `deps`: Dependency updates

### Examples of Good Commits

- `feat: add password unlock system`
- `fix: resolve memory gallery loading issue`
- `docs: add project overview section to README`
- `style: format components with prettier`
- `refactor: optimize GSAP animation performance`
- `test: add unit tests for LandingCard component`

### Using the Commit Template

To help enforce commit hygiene, we've included a commit message template in `.gitmessage`. To configure git to use this template by default:

```bash
git config commit.template .gitmessage
```

This will pre-populate your commit messages with guidelines and examples.

### Important Notes

- Never use "and" when combining commit messages
- Separate commits for every feature when possible
- Each commit should have a clear, descriptive message
- Keep commits focused on a single logical change

## Notes

- Project uses relative path imports (`@/` alias points to `src/` directory)
- Animation effects may need loading time, test on low-speed networks
- Some animation effects may impact performance on low-end devices
- Image resources are large, consider using CDN in production