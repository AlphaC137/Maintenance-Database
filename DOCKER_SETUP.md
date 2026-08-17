# Docker Database Setup & Vercel Integration Guide

This guide explains how to host your Maintenance Database locally using Docker and connect your Vercel deployment to it.

---

## 🐳 Quick Start: Running Local Docker Database

To build and start the Docker containerized backend API and database on your local computer:

```bash
docker-compose up -d --build
```

The container starts the backend API on **`http://localhost:5000`** with persistent database storage in Docker volume `cctv_data`.

### Verify Health Check
Open your browser or terminal:
```bash
curl http://localhost:5000/api/health
```
Expected output:
```json
{"status":"ok","service":"CCTV Maintenance Docker API"}
```

---

## 🌐 Connecting Vercel Deployment to Your Local Docker Database

Because Vercel runs on cloud infrastructure outside your local WiFi/Ethernet network, a Vercel-deployed website cannot directly reach `http://localhost:5000` on your PC. 

To bridge Vercel to your local Docker container, use one of the two options below:

---

### Option 1: Expose Local Docker via Cloudflare Tunnel (Free & Secure - Recommended)

1. **Install Cloudflare Tunnel CLI (`cloudflared`)**:
   - Windows: Download from [Cloudflare Docs](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) or run `winget install --id Cloudflare.cloudflared`.

2. **Start a public tunnel to your Docker API**:
   ```bash
   cloudflared tunnel --url http://localhost:5000
   ```
3. Copy the generated public URL (e.g. `https://random-subdomain.trycloudflare.com`).

4. **Configure Vercel Environment Variables**:
   In your Vercel project settings (or `.env.local` / Vercel Dashboard):
   * Add Environment Variable:
     `VITE_API_URL` = `https://random-subdomain.trycloudflare.com/api`

---

### Option 2: Expose Local Docker via ngrok

1. **Start ngrok tunnel**:
   ```bash
   ngrok http 5000
   ```
2. Copy the generated `https://xxxx.ngrok-free.app` URL.

3. **Configure Vercel Environment Variable**:
   * Set `VITE_API_URL` = `https://xxxx.ngrok-free.app/api` in Vercel.

---

### Option 3: Deploy Backend Container to Free Cloud Host (Render / Railway / Fly.io)

If you don't want your local PC to remain on, you can host the `server/Dockerfile` on Render, Railway, or Fly.io:
1. Push this repository to GitHub.
2. Create a Web Service on Railway or Render pointing to `server/Dockerfile`.
3. Copy the deployed backend URL (e.g. `https://my-cctv-backend.up.railway.app/api`).
4. Set `VITE_API_URL` on Vercel to point to that URL.

---

## 🛠 Frontend Environment Config

For local frontend development using the local Docker database:
1. Create or edit `.env.local` in project root:
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```
2. Run frontend:
   ```bash
   npm run dev
   ```
