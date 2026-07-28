import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

const PROTECTED_PREFIXES: { prefix: string; loginPath: string }[] = [
  { prefix: "/dashboard", loginPath: "/login" },
  { prefix: "/account", loginPath: "/login" },
  { prefix: "/admin", loginPath: "/login" },
  { prefix: "/colaborador", loginPath: "/colaborador/login" },
];

const PUBLIC_EXACT_PATHS = new Set(["/colaborador/login", "/colaborador/candidatura"]);

export async function middleware(request: NextRequest) {
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

  const pathname = request.nextUrl.pathname;
  if (!PUBLIC_EXACT_PATHS.has(pathname)) {
    const match = PROTECTED_PREFIXES.find((p) => pathname.startsWith(p.prefix));
    if (match && !user) {
      const url = request.nextUrl.clone();
      url.pathname = match.loginPath;
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)"],
};
