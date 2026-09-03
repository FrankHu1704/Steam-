import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

const PROTECTED_PREFIXES: { prefix: string; loginPath: string }[] = [
  { prefix: "/dashboard", loginPath: "/login" },
  { prefix: "/account", loginPath: "/login" },
  { prefix: "/admin", loginPath: "/login" },
  { prefix: "/colaborador", loginPath: "/colaborador/login" },
  { prefix: "/conta-suspensa", loginPath: "/login" },
];

const PUBLIC_EXACT_PATHS = new Set(["/colaborador/login", "/colaborador/candidatura"]);

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Public routes never need a session check — skip the Supabase round-trip
  // entirely so pages like the landing page aren't blocked on an auth call.
  if (PUBLIC_EXACT_PATHS.has(pathname)) {
    return NextResponse.next({ request });
  }
  const match = PROTECTED_PREFIXES.find((p) => pathname.startsWith(p.prefix));
  if (!match) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (match && !user) {
    const url = request.nextUrl.clone();
    url.pathname = match.loginPath;
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Session exists but hasn't completed a required 2FA step-up yet (the
  // account has a verified TOTP factor enrolled) — hold it at /verify-2fa
  // before letting it into any protected area.
  if (match && user && pathname !== "/verify-2fa") {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== aal.nextLevel) {
      const url = request.nextUrl.clone();
      url.pathname = "/verify-2fa";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)"],
};
