"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [loggedIn, setLoggedIn]               = useState(false);
  const [isAdmin, setIsAdmin]                 = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    setLoggedIn(!!localStorage.getItem("token"));
    setIsAdmin(localStorage.getItem("isAdmin") === "1");
  }, [pathname]);

  function confirmLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("isAdmin");
    setLoggedIn(false);
    setIsAdmin(false);
    setShowLogoutModal(false);
    router.push("/login");
  }

  return (
    <>
      <header className="topbar">
        {/* Brand */}
        <Link href="/" className="topbar-brand">
          {/* bolt icon */}
          <svg className="brand-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M13 2 4.5 13H11l-1 9L19.5 11H13L14 2z" />
          </svg>
          FileFlow
        </Link>

        {/* Nav */}
        <nav className="topbar-nav">
          {loggedIn ? (
            <>
              <Link
                href="/upload"
                className={`nav-link${pathname === "/upload" ? " active" : ""}`}
              >
                Upload
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className={`nav-link${pathname === "/admin" ? " active" : ""}`}
                >
                  Dashboard
                </Link>
              )}
              <button
                onClick={() => setShowLogoutModal(true)}
                className="btn btn-ghost btn-sm"
                style={{ marginLeft: 6 }}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={`nav-link${pathname === "/login" ? " active" : ""}`}
              >
                Login
              </Link>
              <Link
                href="/register"
                className="btn btn-primary btn-sm"
                style={{ width: "auto", padding: "6px 14px" }}
              >
                Get Started
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* ── Logout confirm modal ── */}
      {showLogoutModal && (
        <div className="modal-backdrop" onClick={() => setShowLogoutModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">
              {/* door-open / logout icon */}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </div>
            <h3 className="modal-title">Sign out?</h3>
            <p className="modal-body">You&apos;ll need to log back in to access your uploads and dashboard.</p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowLogoutModal(false)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={confirmLogout}>
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
