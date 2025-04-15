# GymOS: Minimalist Gym Tracker

A minimalist gym tracker built with React and Vite, designed for speed and mobile ergonomics. Track your progress with flexibility and without the clutter of traditional apps.

## Features

- **Plan Management**: Create, edit, and archive custom training routines to keep your workspace organized.
- **Efficient Logging**: Fast session logging optimized for the gym floor, supporting sets, reps, and RPE-equivalent tracking.
- **Progress Analytics**: Detailed visualization of strength gains (1RM estimates) and volume trends using Recharts.
- **Mobile PWA**: Fully responsive, installable web app with bottom-tab navigation designed for one-handed mobile use.
- **Data Portability**: Complete control over your data with CSV export and import capabilities.

## Learning Objectives

- Architect a scalable React application using TypeScript for strict type safety.
- Implement a responsive and installable Progressive Web App (PWA) with specialized mobile layouts.
- Manage local data persistence using browser storage with robust error handling.
- Build interactive data visualizations and performance analysis logic from scratch.

## Project Structure

- `src/components/`: Feature-sliced UI components (Log, Plans, Progress, Shared).
- `src/utils/`: Core logic for storage, CSV processing, and utility functions.
- `src/types/`: Domain-specific TypeScript interfaces.
- `public/`: PWA configuration, manifest, and static assets.
- `GymTracker.tsx`: Main application container and navigation logic.

## Requirements

- Node.js 18+
- npm or yarn

## How to Run

Clone the repository and start the development server:

```bash
npm install
npm run dev
```
