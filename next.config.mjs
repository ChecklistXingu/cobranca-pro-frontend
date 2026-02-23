import path from "path";

const nextConfig = {
  webpack(config) {
    config.resolve.alias["@/"] = path.join(process.cwd(), "src") + path.sep;
    config.resolve.alias["@"] = path.join(process.cwd(), "src");
    return config;
  },
};

export default nextConfig;
