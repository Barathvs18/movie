# NETFLIM

NETFLIM is a React/Vite catalogue with an Express API. Movie metadata is stored in MongoDB; poster, backdrop, and video files upload directly from the browser to Cloudinary using signed upload parameters.

## Local development

1. Copy `.env.example` to `.env` and add your MongoDB, Cloudinary, and admin credentials.
2. Run `npm install` and `npm run dev`.
3. Open `http://localhost:5173`. Vite proxies `/api` requests to Express on port `3000`.
4. Visit `/admin` to sign in and publish movies.

## Deployment

Deploy the frontend and API as separate services. Vercel serves the Vite build; Render runs the Express API and connects to MongoDB. Cloudinary stores uploaded media, so uploads do not depend on either host's local filesystem or request-body size limits.

### Render API

Create a Render Web Service from this repository. `render.yaml` provides the build/start commands and required environment variable names. Set each secret in the Render dashboard. Set `CORS_ORIGIN` to the exact Vercel site origin, including `https://`, for example `https://netflim.vercel.app`.

### Vercel frontend

Import the same repository into Vercel. The included `vercel.json` builds and serves `dist` and supports React routes such as `/browse`, `/movies`, `/watch/:id`, and `/admin`. Set the Vercel environment variable `VITE_API_URL` to the deployed Render service origin, for example `https://netflim-api.onrender.com`, then redeploy. Add the resulting Vercel origin to the Render `CORS_ORIGIN` value.

### Required services and limits

- MongoDB Atlas (or another MongoDB instance) for movie records.
- Cloudinary credentials for signed image and video uploads.
- A private administrator email and password, plus a unique random `JWT_SECRET`.
- The studio accepts direct uploads up to 100 MB per file, matching Cloudinary's standard upload endpoint limit.

The Express service can also serve the built React app when deployed on Render alone. The admin page is intentionally not linked from the viewer navigation.
