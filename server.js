require("dotenv").config();
require("express-async-errors"); // Catches errors in async routes automatically
const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cloudinary = require("cloudinary").v2;
const jwt = require("jsonwebtoken");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const requiredEnvVars = [
  "MONGODB_URI",
  "JWT_SECRET",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "CORS_ORIGIN",
];
if (process.env.NODE_ENV === "production") {
  const missing = requiredEnvVars.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(
      `CRITICAL: Missing required environment variables in production: ${missing.join(", ")}`,
    );
    process.exit(1);
  }
}

const app = express();
app.set("trust proxy", 1);
const distPath = path.join(__dirname, "dist");
const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(
  cors({
    origin(origin, callback) {
      callback(
        null,
        !origin ||
          allowedOrigins.length === 0 ||
          allowedOrigins.includes(origin),
      );
    },
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(express.static(distPath, { dotfiles: "deny", index: false }));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    message:
      "Too many login attempts from this IP, please try again after 15 minutes.",
  },
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { message: "Too many API requests, please try again later." },
});

const Movie = mongoose.model(
  "Movie",
  new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: String,
    poster: String,
    backdrop: String,
    video: String,
    trailer: String,
    year: Number,
    maturity: String,
    duration: String,
    genre: String,
    featured: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  }),
);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const auth = (req, res, next) => {
  try {
    req.admin = jwt.verify(
      (req.headers.authorization || "").replace("Bearer ", ""),
      process.env.JWT_SECRET || "change-me",
    );
    next();
  } catch (err) {
    res.status(401).json({ message: "Admin authorization required." });
  }
};

app.post("/api/admin/login", loginLimiter, (req, res) => {
  const valid =
    req.body.email === process.env.ADMIN_EMAIL &&
    req.body.password === process.env.ADMIN_PASSWORD;
  if (!valid)
    return res.status(401).json({ message: "Invalid admin credentials." });
  res.json({
    token: jwt.sign({ role: "admin" }, process.env.JWT_SECRET || "change-me", {
      expiresIn: "8h",
    }),
  });
});

app.use("/api", apiLimiter);

app.get("/healthz", (req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res
    .status(connected ? 200 : 503)
    .json({ status: connected ? "ok" : "starting" });
});

app.get("/api/movies", async (req, res) =>
  res.json(await Movie.find().sort({ featured: -1, createdAt: -1 })),
);

app.post("/api/movies", auth, async (req, res) => {
  const {
    title,
    description,
    poster,
    backdrop,
    video,
    trailer,
    year,
    maturity,
    duration,
    genre,
    featured,
  } = req.body;
  if (typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ message: "A movie title is required." });
  }

  const movie = await Movie.create({
    title: title.trim(),
    description,
    poster,
    backdrop,
    video,
    trailer,
    year: year ? Number(year) : undefined,
    maturity,
    duration,
    genre,
    featured: featured === true,
  });
  res.status(201).json(movie);
});

app.delete("/api/movies/:id", auth, async (req, res) => {
  await Movie.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

app.use("/api", (req, res) =>
  res.status(404).json({ message: "API route not found." }),
);
app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));

app.use((err, req, res, next) => {
  console.error("Unhandled Exception:", err);
  res.status(500).json({ message: "Internal Server Error" });
});

let server;
if (process.env.MONGODB_URI) {
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {
      console.log("MongoDB connected successfully");
      server = app.listen(process.env.PORT || 3000, () =>
        console.log(`NETFLIM API running on port ${process.env.PORT || 3000}`),
      );
    })
    .catch((err) => {
      console.error("MongoDB connection error:", err.message);
      if (process.env.NODE_ENV === "production") process.exit(1);
    });
} else {
  console.warn(
    "MongoDB is not configured. Add MONGODB_URI to .env to enable movie storage.",
  );
  server = app.listen(process.env.PORT || 3000, () =>
    console.log(`NETFLIM API running on port ${process.env.PORT || 3000}`),
  );
}

const gracefulShutdown = () => {
  console.log("\nReceived kill signal, shutting down gracefully.");
  if (server) {
    server.close(() => {
      console.log("HTTP server closed.");
      mongoose.connection.close().then(() => {
        console.log("MongoDB connection closed.");
        process.exit(0);
      });
    });
  } else {
    process.exit(0);
  }
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
