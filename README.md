# CCTV Maintenance Database

A modern, full-stack application designed to manage, track, and maintain CCTV site installations. This platform provides an intuitive interface for field technicians and managers to log maintenance activities, track equipment lifecycles, and generate printable service passports.

## Features

- **Dashboard & Analytics**: At-a-glance metrics for total sites, active cameras, and overdue maintenance alerts.
- **Site Management**: Add, edit, and track CCTV installation sites with detailed metadata.
- **Maintenance Tracking**: Keep tabs on service intervals, last service dates, and next service due dates. 
- **Global Command Palette**: Press `Ctrl + K` (or `Cmd + K` on Mac) to quickly search for sites and navigate the application.
- **Data Import/Export**: Bulk import and export site data via CSV for easy integrations.
- **Printable Site Passports**: Generate 1-page PDF summaries for field technicians.
- **Optimistic UI Updates**: Powered by TanStack Query for instantaneous data mutations.

## Tech Stack

- **Frontend**: React (Vite), Tailwind CSS, shadcn/ui components
- **Backend API**: Express.js, SQLite (Dockerized)
- **Data Fetching**: TanStack Query (React Query)
- **Deployment**: Configured for Vercel (Frontend) and Docker (Backend)

## Project Structure

```
├── public/                 # Static assets (including Favicon)
├── server/                 # Express backend API & SQLite database
│   ├── db.js               # SQLite database configuration
│   ├── index.js            # Express API endpoints
│   ├── seed.js             # Initial database seeding script
│   └── Dockerfile          # Docker image configuration for the backend
├── src/
│   ├── api/                # Base44 SDK Client / Fetch adapters
│   ├── components/         # Reusable React components & UI library
│   ├── hooks/              # Custom TanStack Query hooks (e.g., useEntities.js)
│   ├── pages/              # Main application pages (Dashboard, Sites, etc.)
│   └── App.jsx             # Root application component
├── base44/                 # Base44 entities configuration
├── DOCKER_SETUP.md         # Detailed instructions for Docker & Vercel deployment
├── docker-compose.yml      # Orchestration for local backend development
└── eslint.config.js        # ESLint flat configuration (ESM)
```

## Getting Started (Local Development)

### Prerequisites

- Node.js (v18+)
- Docker and Docker Compose

### 1. Start the Backend (Docker)

The application relies on an Express + SQLite backend running via Docker.

```bash
docker-compose up -d
```
This will start the backend API on `http://localhost:5000` and automatically seed the SQLite database with initial data.

### 2. Install Frontend Dependencies

```bash
npm install
```

### 3. Run the Frontend Development Server

```bash
npm run dev
```
Navigate to `http://localhost:5173` in your browser.

## Deployment

### Backend (Docker Container)
The backend can be deployed to any Docker-compatible host (e.g., AWS EC2, DigitalOcean Droplet, Render). Refer to `DOCKER_SETUP.md` for tunneling and advanced deployment configurations.

### Frontend (Vercel)
The frontend is optimized for zero-config Vercel deployment. Ensure you define the `VITE_API_URL` environment variable in your Vercel project settings to point to your live backend URL.

```bash
npm run build
```

## Linting & Code Quality

This project uses the modern ESLint flat config (`eslint.config.js`) to enforce code quality across the React codebase, ensuring unused variables and imports are caught during development. 

```bash
npm run lint
```
