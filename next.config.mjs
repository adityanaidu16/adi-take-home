const isDev = process.env.NODE_ENV !== "production";

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Fluent UI v9's barrel re-exports destructured context providers, which
    // webpack cannot resolve through the barrel; rewriting the imports to the
    // individual packages sidesteps it (and keeps the bundle smaller).
    optimizePackageImports: ["@fluentui/react-components"],
    serverComponentsExternalPackages: ["openid-client"],
  },
  async headers() {
    // Dashboards ship as code inside apps/, so the browser gets a second,
    // independent limit on where their scripts and requests can go. Fluent
    // injects its styles at runtime, hence 'unsafe-inline' for style-src; dev
    // additionally needs eval for React Refresh.
    const csp = [
      "default-src 'self'",
      "connect-src 'self'" + (isDev ? " ws: wss:" : ""),
      "img-src 'self' data:",
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [{ key: "Content-Security-Policy", value: csp }],
      },
    ];
  },
};

export default nextConfig;
