# NETFLIM

1. Copy `.env.example` to `.env` and add MongoDB, Cloudinary, and admin credentials.
2. Run `npm install` then `npm run dev`.
3. Visit `/` for the landing page, `/browse` for the catalogue, and `/admin` for the private administrator login.

Uploads go to Cloudinary and movie metadata is stored in MongoDB. The admin route is deliberately not linked in the viewer UI.
