import { NextResponse, type NextRequest } from "next/server";

// The site is offline at the editor's request: every page answers 503
// ("temporarily unavailable", so search engines keep the pages). Set to false
// to bring the site back; nothing else changes.
const OFFLINE = true;

const OFFLINE_PAGE = `<!doctype html>
<html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>אמת מציון</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0f19;color:#e8eaf0;font-family:system-ui,sans-serif;text-align:center;padding:16px}h1{font-size:2rem;margin:0 0 .5rem}p{color:#9aa3b5;margin:0}</style>
</head><body><main><h1>אמת מציון</h1><p>האתר אינו זמין כרגע.</p><p lang="en" dir="ltr">The site is currently unavailable.</p></main></body></html>`;

// Bare "/" goes to the reader's language: English if the browser prefers it, Hebrew otherwise.
export function proxy(request: NextRequest) {
  if (OFFLINE) {
    return new NextResponse(OFFLINE_PAGE, { status: 503, headers: { "content-type": "text/html; charset=utf-8", "retry-after": "86400", "cache-control": "no-store" } });
  }
  if (request.nextUrl.pathname !== "/") return NextResponse.next();
  const prefersEnglish = /^en\b/i.test(request.headers.get("accept-language") ?? "");
  const url = request.nextUrl.clone();
  url.pathname = prefersEnglish ? "/en" : "/he";
  return NextResponse.redirect(url);
}

// Every page (assets excluded) so the switch covers the whole site.
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
