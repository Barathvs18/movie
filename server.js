require('dotenv').config();
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
const jwt = require('jsonwebtoken');

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const Movie = mongoose.model('Movie', new mongoose.Schema({
  title: { type: String, required: true, trim: true }, description: String,
  poster: String, backdrop: String, trailer: String, year: Number, maturity: String,
  duration: String, genre: String, featured: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
}));

cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
const auth = (req, res, next) => {
  try { req.admin = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), process.env.JWT_SECRET || 'change-me'); next(); }
  catch { res.status(401).json({ message: 'Admin authorization required.' }); }
};
const uploadToCloudinary = file => new Promise((resolve, reject) => {
  const stream = cloudinary.uploader.upload_stream({ folder: 'netflim' }, (error, result) => error ? reject(error) : resolve(result.secure_url));
  streamifier.createReadStream(file.buffer).pipe(stream);
});

app.post('/api/admin/login', (req, res) => {
  const valid = req.body.email === process.env.ADMIN_EMAIL && req.body.password === process.env.ADMIN_PASSWORD;
  if (!valid) return res.status(401).json({ message: 'Invalid admin credentials.' });
  res.json({ token: jwt.sign({ role: 'admin' }, process.env.JWT_SECRET || 'change-me', { expiresIn: '8h' }) });
});
app.get('/api/movies', async (req, res) => res.json(await Movie.find().sort({ featured: -1, createdAt: -1 })));
app.post('/api/movies', auth, upload.fields([{ name: 'posterFile', maxCount: 1 }, { name: 'backdropFile', maxCount: 1 }]), async (req, res) => {
  try {
    const files = req.files || {};
    const poster = files.posterFile ? await uploadToCloudinary(files.posterFile[0]) : req.body.poster;
    const backdrop = files.backdropFile ? await uploadToCloudinary(files.backdropFile[0]) : req.body.backdrop;
    res.status(201).json(await Movie.create({ ...req.body, poster, backdrop, featured: req.body.featured === 'true' }));
  } catch (error) { res.status(400).json({ message: error.message }); }
});
app.delete('/api/movies/:id', auth, async (req, res) => { await Movie.findByIdAndDelete(req.params.id); res.status(204).end(); });

app.get('/', (_, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/browse', (_, res) => res.sendFile(path.join(__dirname, 'public', 'browse.html')));
app.get('/admin', (_, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.warn('MongoDB not connected:', err.message));
} else {
  console.warn('MongoDB is not configured. Add MONGODB_URI to .env to enable movie storage.');
}
app.listen(process.env.PORT || 3000, () => console.log(`NETFLIM running on http://localhost:${process.env.PORT || 3000}`));
