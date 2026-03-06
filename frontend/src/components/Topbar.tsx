"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(!!localStorage.getItem("token"));
  }, [pathname]); // re-check on every route change

  function handleLogout() {
    localStorage.removeItem("token");
    setLoggedIn(false);
    router.push("/login");
  }

  return (
    <header className="topbar">
      {/* Brand */}
      <Link href="/" className="topbar-brand">
        <span className="brand-icon">⚡</span>
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
            <button
              onClick={handleLogout}
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
  );
}
