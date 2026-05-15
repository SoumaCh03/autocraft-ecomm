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
      {/* Background layers */}
      <div className="autocraft-grid"></div>
      <div className="autocraft-red-glow"></div>

      {/* Ambient light streaks */}
      <div className="autocraft-light-streaks">
        <span></span>
        <span></span>
        <span></span>
      </div>

      {/* Rolling Alloy Wheel */}
      <div className="alloy-wheel-track">
        <div className="alloy-wheel-wrapper">
          <div className="wheel-motion-trail"></div>

          <svg
            className="alloy-wheel"
            viewBox="0 0 200 200"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <radialGradient
                id="rimMetal"
                cx="50%"
                cy="50%"
                r="50%"
              >
                <stop offset="0%" stopColor="#dadada" />
                <stop offset="45%" stopColor="#8d8d8d" />
                <stop offset="75%" stopColor="#404040" />
                <stop offset="100%" stopColor="#181818" />
              </radialGradient>

              <radialGradient
                id="rimGlow"
                cx="50%"
                cy="50%"
                r="50%"
              >
                <stop offset="0%" stopColor="#ff5050" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#ff0000" stopOpacity="0" />
              </radialGradient>

              <filter id="wheelGlow">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* red glow */}
            <circle
              cx="100"
              cy="100"
              r="92"
              fill="url(#rimGlow)"
            />

            {/* outer tire */}
            <circle
              cx="100"
              cy="100"
              r="88"
              fill="#0e0e0e"
            />

            {/* metallic rim */}
            <circle
              cx="100"
              cy="100"
              r="72"
              fill="url(#rimMetal)"
              filter="url(#wheelGlow)"
            />

            {/* sporty spokes */}
            <g
              transform="translate(100 100)"
              fill="#d0d0d0"
            >
              {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                <g
                  key={deg}
                  transform={`rotate(${deg})`}
                >
                  <path
                    d="
                      M -8 -12
                      L 10 -58
                      L 22 -54
                      L 8 -8
                      Z
                    "
                    fill="#d6d6d6"
                  />

                  <path
                    d="
                      M -6 -8
                      L 6 -42
                      L 14 -38
                      L 4 -6
                      Z
                    "
                    fill="#666"
                  />
                </g>
              ))}
            </g>

            {/* center cap */}
            <circle
              cx="100"
              cy="100"
              r="18"
              fill="#1c1c1c"
              stroke="#777"
              strokeWidth="3"
            />

            <circle
              cx="100"
              cy="100"
              r="7"
              fill="#ff4545"
            />
          </svg>
        </div>
      </div>

      {/* Main Content */}
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
            <Link
              to="/"
              className="autocraft-btn-primary"
            >
              <Home size={20} />
              Back to Home
            </Link>

            <Link
              to="/shop"
              className="autocraft-btn-secondary"
            >
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

        <div className="foot autocraft-foot">
          <p>
            Autocraft &copy; {new Date().getFullYear()}
            <span
              style={{
                marginLeft: "0.5rem",
                color: "#ef4444",
              }}
            >
              / 404 Not Found.
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}