"use client";

import React, { useState } from "react";
import api from "../../lib/api";
import Link from "next/link";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await api.register(email, password);
      const uid = res.userId || res.user_id || res.id || "";
      setSuccess(`Account created${uid ? ` (id: ${uid})` : ""}. You can now sign in.`);
      setEmail("");
      setPassword("");
    } catch (err: unknown) {
      const e = err as Record<string, unknown>;
      setError((e?.error as string) || (e?.message as string) || JSON.stringify(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-center">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <span className="logo-icon">⚡</span>
          <span style={{ fontWeight: 700, fontSize: "1rem" }}>FileFlow</span>
        </div>

        <h1 className="auth-title">Create an account</h1>
        <p className="auth-subtitle">
          Start uploading and processing files in seconds.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <div className="password-wrapper">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className="form-input"
                placeholder="Min 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="eye-btn"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ marginTop: 8 }}
          >
            {loading ? <><span className="spinner" /> Creating account…</> : "Create Account"}
          </button>
        </form>

        {success && (
          <div className="alert alert-success" style={{ marginTop: 16 }}>
            ✓ {success}
          </div>
        )}
        {error && (
          <div className="alert alert-error" style={{ marginTop: 16 }}>
            ✕ {error}
          </div>
        )}

        <div className="divider">or</div>

        <p style={{ textAlign: "center", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "var(--accent-light)", fontWeight: 600 }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

