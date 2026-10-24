import { NextResponse, type NextRequest } from "next/server";

// Bare "/" goes to the reader's language: English if the browser prefers it, Hebrew otherwise.
export function proxy(request: NextRequest) {
  const prefersEnglish = /^en\b/i.test(request.headers.get("accept-language") ?? "");
  const url = request.nextUrl.clone();
  url.pathname = prefersEnglish ? "/en" : "/he";
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/"] };
