# Smartworld Sky Arc — Sales Dashboard

A React + Vite dashboard that reads data directly from your Excel files.

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:3000 in your browser.

## How It Works

The app reads two Excel files from `public/data/`:

| File | Purpose |
|------|---------|
| `SKYARC_INVR.XLSX` | Inventory — units, status, area, pricing |
| `skyarc_pdrn.XLSX` | Payments — demand, received amounts, bookings |

## Updating Excel Files

Simply replace the files in `public/data/` with your updated Excel files.  
**Keep the same filenames and column headers** — the app reads them on page load.

If your column names change, update the mapping in `src/dataLoader.js`.

## Dashboard Features

- **KPI Cards** — Total units, booked/available, total sales, demand, received, TCV, booked area
- **Filters** — Project, Company, Unit Number, Month, Year
- **Charts** — Tower distribution, Booking status pie, Monthly demand vs received trend, Collection progress, BHK distribution, Monthly bookings count
- **Data Tables** — Scrollable inventory + payment tables with status badges

## Build for Production

```bash
npm run build
```

Output goes to `dist/` — serve with any static server.

## Tech Stack

- React 18
- Vite
- Recharts (charts)
- SheetJS/xlsx (Excel parsing)
- Lucide React (icons)
