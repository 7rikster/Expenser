import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
// const isProtectedRoute = createRouteMatcher([
//     '/dashboard(.*)',
//     '/'
// ])

export default clerkMiddleware((auth, req: NextRequest) => {
  const res = NextResponse.next();

  // Inject pathname for server components
  res.headers.set("x-pathname", req.nextUrl.pathname);

  return res;
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
