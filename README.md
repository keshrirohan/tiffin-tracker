# 🍱 Tiffin Tracker

A production-ready PWA to track daily tiffin (lunch/dinner) meals, calculate bills, and manage payments.

## Features

- ✅ Mark lunch / dinner as Received or Not Received each day
- 💰 Automatic bill calculation (price per meal × received meals)
- 💳 Payment tracking with remaining balance
- 📋 Full meal history with filters
- 📊 Monthly bill view
- 📤 Export bill to CSV anytime
- 🔔 Configurable lunch/dinner reminders
- 📱 Installable PWA (works on Android like a native app)
- 🌐 Offline-friendly shell

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- MongoDB Atlas + Mongoose
- next-pwa (service worker, installability)

## Setup

### 1. Clone / open the project

```bash
cd "d:\food count app\tiffin-tracker"
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env.local` and fill in your MongoDB Atlas URI:

```
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/tiffin-tracker?retryWrites=true&w=majority
```

### 3. MongoDB Atlas

1. Create a free cluster at https://cloud.mongodb.com
2. Create a database user
3. Whitelist your IP (or use 0.0.0.0/0 for all)
4. Copy the connection string into `.env.local`

### 4. Run locally

```bash
npm run dev
```

Open http://localhost:3000

### 5. Production build

```bash
npm run build
npm run start
```

## Testing

TypeScript check:
```bash
npx tsc --noEmit
```

Lint:
```bash
npx eslint "src/**/*.ts" "src/**/*.tsx"
```

## PWA Installation (Android)

1. Open the app in Chrome
2. Tap the browser menu → "Add to Home Screen"
3. The app installs and runs in standalone mode

## Notifications

- Go to Settings → enable Lunch/Dinner reminders
- Set your preferred time
- Allow notification permission when prompted
- Reminders fire once daily at the configured time

## Deployment

Deploy to Vercel (recommended):
```bash
npm i -g vercel
vercel
```

Set `MONGODB_URI` in Vercel environment variables.
