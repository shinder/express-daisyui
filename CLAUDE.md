# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Architecture

This is an Express.js web application using ES Modules with a focus on frontend UI development using Tailwind CSS and daisyUI. The project follows a simple structure with static file serving and basic API routes.

### Core Components

- **Entry Point**: `index.js` - Express server with basic routing and static file serving
- **Frontend Assets**: `public/` directory containing HTML files and compiled CSS
- **Styling Source**: `src/css/app.css` - Tailwind CSS configuration with daisyUI plugin
- **UI Framework**: daisyUI (Tailwind CSS component library) with theme support

### Key Technologies

- **Backend**: Express.js with ES Modules (`"type": "module"`)
- **Frontend**: daisyUI + Tailwind CSS 4.x
- **Development**: Concurrent development with hot reloading
- **Package Manager**: pnpm (evidenced by `pnpm-lock.yaml`)

## Development Commands

### Development Workflow
```bash
npm run dev
```
Runs both Tailwind CSS watcher and nodemon for Express server concurrently

### CSS Compilation
```bash
npm run tw
```
Watches and compiles Tailwind CSS from `src/css/app.css` to `public/css/app.css`

### Individual Commands
- **Server**: `nodemon index.js` (auto-restart on changes)
- **CSS Build**: `tailwindcss -i ./src/css/app.css -o ./public/css/app.css --watch`

## Project Structure Notes

- Uses ES Modules (`"type": "module"` in package.json)
- Static files served from `public/` directory
- CSS compilation pipeline: `src/css/app.css` → `public/css/app.css`
- Main application is in Traditional Chinese (zh-TW) with Chinese comments and content
- Includes demo pages showcasing daisyUI components (`daisyui-demo.html`)

## Tailwind CSS Configuration

The project uses Tailwind CSS 4.x with daisyUI plugin configured in `src/css/app.css`:
- **Themes**: light (default), dark (prefers-color-scheme), cupcake, retro
- **Plugin**: daisyUI for pre-built components
- **Build Target**: CSS is output to `public/css/app.css`

## Environment Setup

- Server runs on port from `process.env.PORT` or defaults to 3000
- Uses dotenv for environment variable management
- No test framework currently configured

## Routes Available

- **GET /**: Welcome page with current timestamp
- **GET /about**: About page
- **GET /api/info**: JSON API endpoint with app info
- **404 Handler**: Custom 404 page for unmatched routes