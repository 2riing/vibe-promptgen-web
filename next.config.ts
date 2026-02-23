import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@huggingface/transformers", "onnxruntime-node", "sharp"],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Transformers.js / ONNX Runtime are client-only — exclude from server bundle
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
