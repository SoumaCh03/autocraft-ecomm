import { Link } from "react-router-dom";
import {
  Home,
  ShoppingBag,
  ArrowLeft,
  AlertTriangle,
} from "lucide-react";

export default function NotFoundPage() {
  return (
    <section className="autocraft-404">
      <div className="autocraft-grid"></div>
      <div className="autocraft-red-glow"></div>

      <div className="autocraft-404-container">
        <div className="autocraft-404-badge">
          <AlertTriangle size={18} />
          Route Not Found
        </div>

        <h1 className="autocraft-404-code">404</h1>

        <div className="autocraft-404-card">
          <h2>Oops! Wrong Turn.</h2>

          <p>
            Looks like this route drifted off track.
            The page you're trying to access
            doesn&apos;t exist or may have been moved.
            Let&apos;s get you back on track.
          </p>

          <div className="autocraft-404-actions">
            <Link to="/" className="autocraft-btn-primary">
              <Home size={20} />
              Back to Home
            </Link>

            <Link to="/shop" className="autocraft-btn-secondary">
              <ShoppingBag size={20} />
              Browse Shop
            </Link>

            <button
              type="button"
              className="autocraft-btn-secondary"
              onClick={() => window.history.back()}
            >
              <ArrowLeft size={20} />
              Go Back
            </button>
          </div>
        </div>
        <div className="foot" style={{ marginTop: "2rem", textAlign: "center", fontSize: "0.875rem", color: "#888" }}>
            <p>
                Autocraft &copy; {new Date().getFullYear()}. <span style={{ marginLeft: "0.5rem",color: "red" }}>/ 404 Not Found.</span>
            </p>
          </div>
      </div>
    </section>
  );
}