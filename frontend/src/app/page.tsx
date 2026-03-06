import Link from "next/link";

const features = [
  {
    icon: "🔐",
    title: "Secure Auth",
    desc: "JWT-based registration and login. Your token is stored client-side and sent automatically with every request.",
  },
  {
    icon: "☁️",
    title: "Direct S3 Upload",
    desc: "Files go straight from your browser to S3 via a pre-signed URL — no proxy, no size limits imposed by the server.",
  },
  {
    icon: "⚙️",
    title: "Background Processing",
    desc: "A queue worker picks up your upload and processes it asynchronously. The UI polls for status every 2 seconds.",
  },
  {
    icon: "📥",
    title: "Instant Download",
    desc: "Once processing completes a signed download URL is generated on-demand so you can grab the result immediately.",
  },
];

export default function Home() {
  return (
    <div className="landing">
      {/* Hero */}
      <section className="hero">
        <span className="hero-eyebrow">⚡ File Processing Pipeline</span>
        <h1>
          Upload, Process &amp;{" "}
          <span className="hero-gradient">Download Files</span>
          <br />in Seconds
        </h1>
        <p>
          FileFlow handles secure uploads directly to S3, background processing
          via a queue worker, and instant signed downloads — all with a clean,
          modern UI.
        </p>
        <div className="hero-cta">
          <Link href="/register" className="btn btn-primary btn-lg" style={{ width: "auto" }}>
            Create Account
          </Link>
          <Link href="/login" className="btn btn-ghost btn-lg">
            Sign In →
          </Link>
        </div>
      </section>

      {/* Feature cards */}
      <section className="features">
        {features.map((f) => (
          <div key={f.title} className="feature-card">
            <div className="fc-icon">{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

