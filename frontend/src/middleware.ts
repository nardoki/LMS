import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { extractRoleFromUser, getRoleHomePath } from "@/lib/roles";

const AUTH_ROUTES = new Set(["/login", "/register"]);
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/courses",
  "/learn",
  "/quiz",
  "/assignments",
  "/certificates",
  "/instructor",
  "/admin",
];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase environment variables are missing, do not crash the app
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Middleware warning: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing.");
    return response;
  }

  try {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value),
            );
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
          },
        },
      },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const pathname = request.nextUrl.pathname;
    const isAuthRoute = AUTH_ROUTES.has(pathname);
    const isProtected = PROTECTED_PREFIXES.some((prefix) =>
      pathname.startsWith(prefix),
    );

    if (!user && isProtected) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (user) {
      const role = extractRoleFromUser(user);
      const homePath = getRoleHomePath(role);

      // Redirect signed-in users away from /login or /register to their role home
      if (isAuthRoute || pathname === "/") {
        const targetUrl = request.nextUrl.clone();
        targetUrl.pathname = homePath;
        return NextResponse.redirect(targetUrl);
      }

      // Role isolation: students cannot access /instructor or /admin; instructors cannot access /admin
      if (pathname.startsWith("/admin") && role !== "admin") {
        const targetUrl = request.nextUrl.clone();
        targetUrl.pathname = homePath;
        return NextResponse.redirect(targetUrl);
      }

      if (
        pathname.startsWith("/instructor") &&
        role !== "instructor" &&
        role !== "admin"
      ) {
        const targetUrl = request.nextUrl.clone();
        targetUrl.pathname = homePath;
        return NextResponse.redirect(targetUrl);
      }
    }
  } catch (err) {
    console.error("Middleware auth check failed:", err);
    return response;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
