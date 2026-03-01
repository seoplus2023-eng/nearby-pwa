# Nearby - Mobile Dating Map App

A mobile-first React web app that shows nearby profiles on a map. Uses Leaflet (no API keys), real GPS, and fake profiles from RandomUser.me.

## Features

- **Real GPS location** – Gets your current position
- **10 female profiles** – Fetched from randomuser.me, placed within 1km
- **Round avatars on map** – Click to open profile card
- **Tinder-style card** – Sliding panel with Like / Pass buttons
- **Pink-orange gradient theme** – Styled with Tailwind
- **Framer Motion** – Animations for loading, cards, and buttons

## Run

```bash
npm install
npm run dev
```

Open http://localhost:5173 on your phone (or use Chrome DevTools mobile emulation). **Allow location access** when prompted.

## Build

```bash
npm run build
```

Output is in `dist/`.
