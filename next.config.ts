import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Socket.io calls /socket.io/ and the signal server only answers that path. A slash redirect turns it into /socket.io, which never connects.
  skipTrailingSlashRedirect: true,
  experimental: {
    agentUpgrade: "security",
  },
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    const meet = process.env.GOMEET_INTERNAL_URL || "http://127.0.0.1:3010";
    const room = process.env.GOMEET_ROOM_URL || "http://127.0.0.1:3011";
    const signal = process.env.GOMEET_SIGNAL_URL || "http://127.0.0.1:4010";
    const fonts = [
      "Lahzeh-Regular.woff2",
      "Lahzeh-Bold.woff2",
      "Lahzeh-FaNum-Regular.woff2",
      "Lahzeh-FaNum-Bold.woff2",
      "Peyda-Regular.woff",
      "Peyda-Medium.woff",
      "Peyda-SemiBold.woff",
      "Peyda-Bold.woff",
      "Peyda-ExtraBold.woff",
      "Estedad-Black.woff2",
      "manrope-latin.woff2",
      "dm-sans-latin.woff2",
      "plasma-circle-dots.woff2",
      "Outfit-SemiBold.woff2",
    ];
    return {
      beforeFiles: [
        { source: "/call", destination: `${room}/call` },
        { source: "/call/:path*", destination: `${room}/call/:path*` },
        { source: "/socket.io", destination: `${signal}/socket.io` },
        { source: "/socket.io/:path*", destination: `${signal}/socket.io/:path*` },
        { source: "/api/create-room", destination: `${signal}/api/create-room` },
        { source: "/api/rooms/:path*", destination: `${signal}/api/rooms/:path*` },
        { source: "/api/desk", destination: `${signal}/api/desk` },
        { source: "/api/desk/:path*", destination: `${signal}/api/desk/:path*` },
        { source: "/meet", destination: `${meet}/meet` },
        { source: "/meet/:path*", destination: `${meet}/meet/:path*` },
        { source: "/emoji/:path*", destination: `${meet}/meet/emoji/:path*` },
        { source: "/api/files", destination: `${meet}/meet/api/files` },
        { source: "/api/files/:path*", destination: `${meet}/meet/api/files/:path*` },
        { source: "/api/avatars/:path*", destination: `${meet}/meet/api/avatars/:path*` },
        { source: "/api/logos/:path*", destination: `${meet}/meet/api/logos/:path*` },
        { source: "/walls/:path*", destination: `${meet}/meet/walls/:path*` },
        { source: "/vendor/:path*", destination: `${meet}/meet/vendor/:path*` },
        { source: "/room.jpg", destination: `${meet}/meet/room.jpg` },
        { source: "/icon.svg", destination: `${meet}/meet/icon.svg` },
        { source: "/icon-192.png", destination: `${meet}/meet/icon-192.png` },
        { source: "/icon-512.png", destination: `${meet}/meet/icon-512.png` },
        { source: "/manifest.webmanifest", destination: `${meet}/meet/manifest.webmanifest` },
        ...fonts.map((file) => ({
          source: `/fonts/${file}`,
          destination: `${meet}/meet/fonts/${file}`,
        })),
      ],
    };
  },
};

export default withNextIntl(nextConfig);
