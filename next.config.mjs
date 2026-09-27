/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Fluent UI v9's barrel re-exports destructured context providers, which
    // webpack cannot resolve through the barrel; rewriting the imports to the
    // individual packages sidesteps it (and keeps the bundle smaller).
    optimizePackageImports: ["@fluentui/react-components"],
    serverComponentsExternalPackages: ["openid-client"],
  },
};

export default nextConfig;
