"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRightOnRectangleIcon } from "@heroicons/react/24/outline";

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
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 h-16 w-full border-b border-white/8 bg-[#0a0a0a]/80 backdrop-blur-xl">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 text-white font-bold text-lg tracking-tight hover:opacity-80 transition-opacity">
          FileFlow
        </Link>

=        <nav className="flex items-center gap-4 text-sm font-medium">
          {loggedIn ? (
            <>
              <Link
                href="/upload"
                className={`transition-colors py-1.5 px-3 rounded-md \${pathname === "/upload" ? "text-white bg-white/10" : "text-gray-400 hover:text-white"}`}
              >
                Upload
              </Link>
              <Link
                href="/uploads"
                className={`transition-colors py-1.5 px-3 rounded-md \${pathname === "/uploads" ? "text-white bg-white/10" : "text-gray-400 hover:text-white"}`}
              >
                My Files
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className={`transition-colors py-1.5 px-3 rounded-md \${pathname.startsWith("/admin") ? "text-white bg-white/10" : "text-gray-400 hover:text-white"}`}
                >
                  Dashboard
                </Link>
              )}
              <button
                onClick={() => setShowLogoutModal(true)}
                className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors ml-2"
              >
                Logout <ArrowRightOnRectangleIcon className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={`transition-colors py-1.5 px-3 rounded-md \${pathname === "/login" ? "text-white bg-white/10" : "text-gray-400 hover:text-white"}`}
              >
                Log In
              </Link>
              <Link
                href="/register"
                className="h-8 inline-flex items-center justify-center px-4 rounded-md bg-white text-black font-semibold hover:bg-gray-200 transition-all text-sm"
              >
                Get Started
              </Link>
            </>
          )}
        </nav>
      </header>

      {showLogoutModal && (
        <div className="fixed inset-0 z-200 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowLogoutModal(false)}>
          <div className="w-full max-w-sm bg-[#111] border border-white/10 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-5">
              <ArrowRightOnRectangleIcon className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Sign out?</h3>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              You'll need to log back in to access your file pipeline and dashboard.
            </p>
            <div className="flex gap-3">
              <button className="flex-1 py-2.5 rounded-lg border border-white/10 text-white font-medium hover:bg-white/5 transition-colors" onClick={() => setShowLogoutModal(false)}>
                Cancel
              </button>
              <button className="flex-1 py-2.5 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 transition-colors" onClick={confirmLogout}>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
