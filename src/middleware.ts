import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublic = createRouteMatcher([
  "/",
  "/pricing",
  "/scan",
  "/c/(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/health",
  "/api/trial/(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublic(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/api/(.*)"],
};
