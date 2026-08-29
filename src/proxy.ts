import { NextRequest, NextResponse } from "next/server";
import { verificarToken } from "@/lib/auth";

// jsonwebtoken depende de módulos Node.js — proxy roda em runtime Node

const ROTAS_PUBLICAS = ["/login", "/api/auth/login"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (ROTAS_PUBLICAS.some((rota) => pathname.startsWith(rota))) {
    return NextResponse.next();
  }

  // Assets estáticos, PWA, etc.
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icons") ||
    pathname.startsWith("/pdfs") ||
    pathname === "/manifest.json" ||
    pathname === "/sw.js"
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get("token")?.value;
  const payload = token ? verificarToken(token) : null;

  if (!payload && pathname.startsWith("/api")) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  if (!payload && !pathname.startsWith("/api")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
