import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export: the site is served as plain files from the domain root.
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  // .wgsl shaders are imported as raw strings.
  turbopack: {
    rules: {
      "*.wgsl": { loaders: ["raw-loader"], as: "*.js" },
    },
  },
  webpack: (config) => {
    config.module.rules.push({ test: /\.wgsl$/, type: "asset/source" });
    return config;
  },
};

export default nextConfig;
