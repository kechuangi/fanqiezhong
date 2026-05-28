# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- Install dependencies: `npm install`
- Run Electron + React dev app: `npm run dev`
- Build renderer assets: `npm run build`
- Run packaged-style app after `npm run build`: `npm start`
- Build Windows installer and portable exe: `npm run dist`

There are currently no lint or test scripts configured in `package.json`.

## Architecture

This repository contains two usable Pomodoro implementations:

- `pomodoro.html` is the fastest deliverable version: a standalone browser-based Pomodoro timer that can be opened directly without Node, Electron, or packaging.
- The Electron desktop app uses Vite + React for the renderer and Electron for desktop shell behavior.

Electron entry flow:

- `package.json` points Electron to `electron/main.cjs`.
- `electron/main.cjs` creates the main `BrowserWindow`, loads the Vite dev server in development, and loads `dist/index.html` in production.
- `electron/main.cjs` also owns the system tray, tray menu, close-to-tray behavior, and IPC handlers for timer state and finish notifications.
- `electron/preload.cjs` exposes a small `window.pomodoro` bridge to the renderer with `sendTimerState`, `notifyFinished`, and `onTrayAction`.
- `src/App.jsx` owns Pomodoro state: mode, remaining seconds, running state, completed rounds, custom durations, localStorage persistence, generated reminder sound, and tray action handling.
- `src/styles.css` contains all renderer styling.

Packaging details:

- `vite.config.js` uses `base: './'`. Keep this for Electron production builds; without it, packaged `file://` loading can show a blank window because assets resolve from the wrong path.
- `npm run dist` outputs to `release/` and builds both NSIS installer and portable exe.
- `package.json` sets `CSC_IDENTITY_AUTO_DISCOVERY=false` in the dist script and `win.signAndEditExecutable=false` because Windows symlink permissions previously blocked electron-builder's signing helper extraction.
- `node_modules/`, `dist/`, and `release/` are generated outputs and ignored by git.

## Current State And Known Issues

- The GitHub remote is `https://github.com/kechuangi/fanqiezhong.git`; `master` tracks `origin/master`.
- A minimal usable version exists at `pomodoro.html` and should be the fallback if Electron packaging is blocked.
- The Electron app previously opened to a blank packaged window until `vite.config.js` was updated with `base: './'`.
- Rebuilding the exe can fail if `release/番茄钟 0.1.0.exe` is running or locked by antivirus. Close the app from the tray or wait for the lock to clear, then rerun `npm run dist`.
- The packaged Electron app still uses the default Electron icon; adding a real tomato icon is a likely next polish task.
