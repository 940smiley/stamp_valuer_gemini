# Deployment Options - Stamplicity

## Free-Tier Cloud Providers

### 1. Google Cloud Run (Current)
- **Free Tier**: 2 million requests per month, 180,000 vCPU-seconds, 360,000 GiB-seconds.
- **Best For**: Containerized backend (`server.js`) and high scalability.

### 2. Vercel
- **Free Tier**: Unlimited personal projects, 100GB bandwidth, Serverless Functions.
- **Best For**: Fast frontend deployment and automated previews.

### 3. Netlify
- **Free Tier**: 100GB bandwidth, 300 build minutes/mo.
- **Best For**: Simple static hosting (React `dist`) and easy CDN.

### 4. Supabase (Backend-as-a-Service)
- **Free Tier**: 500MB database, 5GB storage, 50,000 monthly active users.
- **Best For**: Authentication and Collection Sync.

## Recommended Multi-Cloud Strategy
- **Frontend**: GitHub Pages (Static) or Vercel.
- **API/Server**: Google Cloud Run (Free Tier).
- **Database**: Supabase (Free Tier).
