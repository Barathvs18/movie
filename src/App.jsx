import { useEffect, useState } from "react";
import { Link, Route, Routes, useNavigate, useParams } from "react-router-dom";

const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const MAX_UPLOAD_SIZE = 100 * 1024 * 1024;

async function getMovies() {
  const response = await fetch(`${API_URL}/api/movies`);
  if (!response.ok) throw new Error("Could not load movies.");
  return response.json();
}

function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = window.setTimeout(
      () => navigate("/browse", { replace: true }),
      5500,
    );
    return () => window.clearTimeout(timer);
  }, [navigate]);

  return (
    <main className="landing-screen">
      <video
        autoPlay
        muted
        playsInline
        preload="auto"
        aria-label="NETFLIM introduction"
      >
        <source src="/landingpage.mp4" type="video/mp4" />
      </video>
      <Link className="skip-intro" to="/browse">
        Skip intro
      </Link>
    </main>
  );
}

function Header({ active }) {
  return (
    <header id="hd" className="site-header solid">
      <Link className="logo" to="/browse">
        NETFLIM
      </Link>
      <nav aria-label="Main navigation">
        <Link className={active === "home" ? "on" : ""} to="/browse">
          Home
        </Link>
        <Link className={active === "movies" ? "on" : ""} to="/movies">
          Movies
        </Link>
      </nav>
    </header>
  );
}

function MovieCard({ movie, index }) {
  const image = movie.poster || movie.backdrop || "";
  return (
    <Link
      className="card"
      to={`/watch/${encodeURIComponent(movie._id || index)}`}
      style={{ backgroundImage: `url("${image.replaceAll('"', "%22")}")` }}
    >
      <span>{movie.title}</span>
    </Link>
  );
}

function MovieRow({ title, movies }) {
  if (!movies.length) return null;
  return (
    <section className="row">
      <h2>{title}</h2>
      <div className="track">
        {movies.map((movie, index) => (
          <MovieCard
            key={movie._id || movie.title}
            movie={movie}
            index={index}
          />
        ))}
      </div>
    </section>
  );
}

function Browse({ allMovies = false }) {
  const [movies, setMovies] = useState([]);
  const [slide, setSlide] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getMovies()
      .then((data) => {
        if (active) setMovies(data);
      })
      .catch(() => {
        if (active) setError("The catalogue is temporarily unavailable.");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (movies.length < 2) return undefined;
    const timer = window.setInterval(
      () => setSlide((current) => (current + 1) % Math.min(movies.length, 5)),
      6000,
    );
    return () => window.clearInterval(timer);
  }, [movies.length]);

  const featured = movies.slice(0, 5);
  const selected = featured[slide];
  const activePage = allMovies ? "movies" : "home";

  return (
    <>
      <Header active={activePage} />
      {allMovies ? (
        <main className="all-movies-page">
          <h1>All movies</h1>
          {error ? (
            <p className="note">{error}</p>
          ) : movies.length ? (
            <MovieRow title="Now playing" movies={movies} />
          ) : (
            <p className="note">No movies available yet.</p>
          )}
        </main>
      ) : (
        <main>
          <section
            className="hero"
            style={
              selected?.backdrop || selected?.poster
                ? {
                    backgroundImage: `url("${(selected.backdrop || selected.poster).replaceAll('"', "%22")}")`,
                  }
                : undefined
            }
          >
            <div className="hero-copy">
              {selected ? (
                <>
                  <span className="tag">
                    Now playing{selected.year ? ` · ${selected.year}` : ""}
                  </span>
                  <h1>{selected.title}</h1>
                  <p>{selected.description}</p>
                  <Link
                    className="btn"
                    to={`/watch/${encodeURIComponent(selected._id || slide)}`}
                  >
                    Play
                  </Link>
                </>
              ) : (
                <>
                  <span className="tag">NETFLIM</span>
                  <h1>
                    {error
                      ? "Stories are taking a break."
                      : "Stories are coming soon."}
                  </h1>
                  <p>
                    {error ||
                      "New films will appear here once they are published."}
                  </p>
                </>
              )}
            </div>
            <div className="dots" aria-label="Featured movies">
              {featured.map((movie, index) => (
                <button
                  key={movie._id || movie.title}
                  type="button"
                  aria-label={`Show ${movie.title}`}
                  aria-current={index === slide}
                  className={index === slide ? "on" : ""}
                  onClick={() => setSlide(index)}
                />
              ))}
            </div>
          </section>
          <section className="intro">
            <h2>Netflim · AI Creation Film</h2>
            <p>
              Trailers, teasers and short films created with imagination. Pick a
              title, press play and watch.
            </p>
          </section>
          {movies.length ? (
            <MovieRow title="Now playing" movies={movies} />
          ) : (
            !error && (
              <p className="note empty-catalogue">No movies available yet.</p>
            )
          )}
        </main>
      )}
      <footer>Netflim · AI Creation Film</footer>
    </>
  );
}

function Watch() {
  const { id } = useParams();
  const [movie, setMovie] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getMovies()
      .then((movies) => {
        const found =
          movies.find((item) => String(item._id) === id) || movies[Number(id)];
        if (active) setMovie(found || null);
      })
      .catch(() => {
        if (active) setError("The movie could not be loaded.");
      });
    return () => {
      active = false;
    };
  }, [id]);

  const video = movie?.video || movie?.trailer;
  return (
    <>
      <Header active="movies" />
      <main className="wrap watch-page">
        <Link className="btn ghost" to="/movies">
          Back
        </Link>
        <h1>{movie?.title || (error ? "Unavailable" : "Loading movie…")}</h1>
        {video ? (
          <video
            className="movie-player"
            src={video}
            controls
            playsInline
            preload="metadata"
          />
        ) : (
          movie && <p className="note">Video coming soon.</p>
        )}
        <p className="note">{movie?.description || error}</p>
      </main>
      <footer>Netflim · AI Creation Film</footer>
    </>
  );
}

async function uploadMedia(file, resourceType, onProgress) {
  if (file.size > MAX_UPLOAD_SIZE)
    throw new Error("Each upload must be 100 MB or smaller.");

  const data = new FormData();
  data.append("file", file);
  data.append("upload_preset", "movies"); // Use unsigned upload preset
  // No api_key, signature, timestamp, or folder needed for unsigned presets

  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open(
      "POST",
      `https://api.cloudinary.com/v1_1/c87edazz/${resourceType}/upload`,
    );
    request.upload.onprogress = (event) => {
      if (event.lengthComputable)
        onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onerror = () =>
      reject(
        new Error(
          "The media upload failed. Check your connection and try again.",
        ),
      );
    request.onload = () => {
      let result;
      try {
        result = JSON.parse(request.responseText);
      } catch {
        result = {};
      }
      if (request.status >= 200 && request.status < 300) resolve(result);
      else
        reject(new Error(result.error?.message || "The media upload failed."));
    };
    request.send(data);
  });
}

function Admin() {
  const [token, setToken] = useState(
    () => localStorage.getItem("netflim_admin") || "",
  );
  const [movies, setMovies] = useState([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loginBusy, setLoginBusy] = useState(false);

  async function refreshMovies() {
    try {
      setMovies(await getMovies());
    } catch {
      setMessage("Could not load the collection. Check the API connection.");
    }
  }

  useEffect(() => {
    if (token) refreshMovies();
  }, [token]);

  async function signIn(event) {
    event.preventDefault();
    setLoginBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`${API_URL}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Sign in failed.");
      localStorage.setItem("netflim_admin", result.token);
      setToken(result.token);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoginBusy(false);
    }
  }

  async function publish(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    setBusy(true);
    setMessage("Preparing uploads…");
    try {
      const posterFile = fields.get("posterFile");
      const backdropFile = fields.get("backdropFile");
      const videoFile = fields.get("videoFile");
      const poster = posterFile.size
        ? (
            await uploadMedia(posterFile, "image", (percent) =>
              setMessage(`Uploading poster · ${percent}%`),
            )
          ).secure_url
        : fields.get("poster");
      const backdrop = backdropFile.size
        ? (
            await uploadMedia(backdropFile, "image", (percent) =>
              setMessage(`Uploading backdrop · ${percent}%`),
            )
          ).secure_url
        : fields.get("backdrop");
      const video = videoFile.size
        ? (
            await uploadMedia(videoFile, "video", (percent) =>
              setMessage(`Uploading video · ${percent}%`),
            )
          ).secure_url
        : fields.get("video");
      setMessage("Publishing movie…");
      const response = await fetch(`${API_URL}/api/movies`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: fields.get("title"),
          description: fields.get("description"),
          genre: fields.get("genre"),
          year: fields.get("year"),
          duration: fields.get("duration"),
          maturity: fields.get("maturity"),
          poster,
          backdrop,
          video,
          featured: fields.get("featured") === "on",
        }),
      });
      const result = response.status === 204 ? {} : await response.json();
      if (!response.ok)
        throw new Error(result.message || "Movie publish failed.");
      form.reset();
      setMessage("Movie published.");
      await refreshMovies();
    } catch (error) {
      if (error.message.toLowerCase().includes("authorization")) {
        localStorage.removeItem("netflim_admin");
        setToken("");
      }
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeMovie(id) {
    if (!window.confirm("Delete this movie?")) return;
    try {
      const response = await fetch(
        `${API_URL}/api/movies/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!response.ok) throw new Error("Could not delete this movie.");
      await refreshMovies();
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <main className="admin-body">
      <div className="admin-shell">
        <Link className="wordmark" to="/browse">
          NETFLIM
        </Link>
        {!token ? (
          <section className="admin-login">
            <p className="eyebrow">NETFLIM STUDIO</p>
            <h1>Administrator login</h1>
            <p>Manage your collection from one secure place.</p>
            <form onSubmit={signIn}>
              <label>
                Email
                <input
                  required
                  type="email"
                  name="email"
                  autoComplete="username"
                  placeholder="admin@netflim.com"
                />
              </label>
              <label>
                Password
                <input
                  required
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  placeholder="Password"
                />
              </label>
              <button className="button button-primary" disabled={loginBusy}>
                {loginBusy ? "Signing in…" : "Sign in"}
              </button>
              <p className="form-message">{message}</p>
            </form>
          </section>
        ) : (
          <section className="dashboard">
            <div className="dashboard-title">
              <div>
                <p className="eyebrow">CONTENT MANAGER</p>
                <h1>Publish a new story</h1>
              </div>
              <button
                className="logout"
                type="button"
                onClick={() => {
                  localStorage.removeItem("netflim_admin");
                  setToken("");
                  setMessage("");
                }}
              >
                Log out
              </button>
            </div>
            <form className="movie-form" onSubmit={publish}>
              <label>
                Title
                <input
                  name="title"
                  required
                  maxLength="160"
                  placeholder="Movie title"
                />
              </label>
              <label>
                Genre
                <input
                  name="genre"
                  maxLength="100"
                  placeholder="Drama, Thriller…"
                />
              </label>
              <label>
                Year
                <input
                  name="year"
                  type="number"
                  min="1888"
                  max="2200"
                  placeholder="2026"
                />
              </label>
              <label>
                Duration
                <input name="duration" maxLength="40" placeholder="1h 45m" />
              </label>
              <label>
                Maturity rating
                <input name="maturity" maxLength="30" placeholder="U/A 13+" />
              </label>
              <label className="full">
                Description
                <textarea
                  name="description"
                  maxLength="4000"
                  placeholder="Tell viewers what this story is about…"
                />
              </label>
              <label>
                Poster image
                <input name="posterFile" type="file" accept="image/*" />
                <small>or paste an image URL</small>
                <input name="poster" type="url" placeholder="https://…" />
              </label>
              <label>
                Backdrop image
                <input name="backdropFile" type="file" accept="image/*" />
                <small>or paste an image URL</small>
                <input name="backdrop" type="url" placeholder="https://…" />
              </label>
              <label className="full">
                Movie video
                <input
                  name="videoFile"
                  type="file"
                  accept="video/mp4,video/webm,video/ogg,video/quicktime"
                />
                <small>MP4, WebM, MOV or OGG · up to 100 MB</small>
                <input
                  name="video"
                  type="url"
                  placeholder="or paste a hosted video URL"
                />
              </label>
              <label className="check">
                <input name="featured" type="checkbox" /> Make this the featured
                banner
              </label>
              <div className="form-actions full">
                <button className="button button-primary" disabled={busy}>
                  {busy ? "Working…" : "Publish movie"}
                </button>
                <p className="form-message" role="status">
                  {message}
                </p>
              </div>
            </form>
            <section className="collection">
              <h2>Published movies</h2>
              {movies.length ? (
                movies.map((movie) => (
                  <article className="admin-movie" key={movie._id}>
                    <img src={movie.poster || movie.backdrop || ""} alt="" />
                    <div>
                      <strong>{movie.title}</strong>
                      <span>
                        {movie.year || ""}
                        {movie.genre ? ` · ${movie.genre}` : ""}
                        {movie.video || movie.trailer
                          ? " · Video attached"
                          : ""}
                      </span>
                    </div>
                    <button
                      className="delete-movie"
                      type="button"
                      onClick={() => removeMovie(movie._id)}
                    >
                      Delete
                    </button>
                  </article>
                ))
              ) : (
                <p className="note">No movies uploaded yet.</p>
              )}
            </section>
          </section>
        )}
      </div>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/browse" element={<Browse />} />
      <Route path="/movies" element={<Browse allMovies />} />
      <Route path="/watch/:id" element={<Watch />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="*" element={<Browse />} />
    </Routes>
  );
}
