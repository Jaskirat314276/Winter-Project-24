import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { routeAccessMap } from "./lib/settings";
import { NextResponse } from "next/server";
import { getClientIp, rateLimit } from "./lib/rateLimit";

const matchers = Object.keys(routeAccessMap).map((route) => ({
  matcher: createRouteMatcher([route]),
  allowedRoles: routeAccessMap[route],
}));

const isAuthRoute = createRouteMatcher(["/", "/sign-in(.*)", "/onboarding"]);

export default clerkMiddleware((auth, req) => {
  const { userId, sessionClaims } = auth();

  // Throttle anonymous traffic to auth routes: 30 hits / 60s / IP.
  if (!userId && isAuthRoute(req)) {
    const ip = getClientIp(req);
    const { allowed, retryAfterMs } = rateLimit(`auth:${ip}`, {
      limit: 30,
      windowMs: 60_000,
    });
    if (!allowed) {
      return new NextResponse("Too many requests. Slow down and try again.", {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(retryAfterMs / 1000)),
        },
      });
    }
  }

  const role = (sessionClaims?.metadata as { role?: string })?.role;

  for (const { matcher, allowedRoles } of matchers) {
    if (matcher(req) && !allowedRoles.includes(role!)) {
      return NextResponse.redirect(new URL(`/${role}`, req.url));
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
