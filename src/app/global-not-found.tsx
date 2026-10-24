import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = { title: "404 · Truth of Zion" };

export default function GlobalNotFound() {
  return (
    <html lang="he" dir="rtl">
      <body className="flex min-h-screen items-center justify-center p-8 text-center">
        <div className="space-y-3">
          <h1 className="text-3xl font-bold">404</h1>
          <p>הדף לא נמצא · <span lang="en">Page not found</span></p>
          <p className="space-x-4 text-brand underline">
            <Link href="/he">עברית</Link> <Link href="/en">English</Link>
          </p>
        </div>
      </body>
    </html>
  );
}
