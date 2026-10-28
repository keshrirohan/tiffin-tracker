export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/",
    "/history/:path*",
    "/bill/:path*",
    "/payments/:path*",
    "/settings/:path*",
    "/api/meals/:path*",
    "/api/payments/:path*",
    "/api/bill/:path*",
    "/api/settings/:path*",
    "/api/export/:path*",
    "/api/clear-data/:path*",
  ],
};
