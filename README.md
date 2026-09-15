# Hackathon Korkyt Project

This repository contains:
1. **Frontend**: A Next.js landing page built for Vercel deployment.
2. **Backend / Dashboard**: A Streamlit dashboard (`Hackathon_Korkyt` folder) configured for Render deployment.
3. **Fake API**: A Node.js express backend in the `backend` folder.

## Deployment Instructions

### Vercel (Frontend)
Vercel will automatically build the Next.js project from the root of this repository.

### Render (Dashboard)
Configure a Web Service on Render with:
- **Language**: Python 3
- **Root Directory**: `Hackathon_Korkyt`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `streamlit run dashboard.py --server.port $PORT --server.address 0.0.0.0`
