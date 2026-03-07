import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import Topbar from "@/components/Topbar";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "FileFlow — File Processing Pipeline",
  description: "Upload, process and download files through the FileFlow pipeline.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={poppins.variable}>
        <div className="app-shell">
          <Topbar />
          <main className="page-content">{children}</main>
          <footer className="footer">
            FileFlow © {new Date().getFullYear()} — File Processing Pipeline
          </footer>
        </div>
      </body>
    </html>
  );
}
