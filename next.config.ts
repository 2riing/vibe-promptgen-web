import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingExcludes: {
    "*": [
      "node_modules/onnxruntime-node/**",
      "node_modules/@img/**",
      "node_modules/sharp/**",
    ],
  },
  serverExternalPackages: ["@huggingface/transformers", "onnxruntime-node", "sharp"],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "@huggingface/transformers": false,
        "onnxruntime-node": false,
        "sharp$": false,
      };
    }
    return config;
  },
};

export default nextConfig;
