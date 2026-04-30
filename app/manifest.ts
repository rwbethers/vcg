import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vision Consulting Group",
    short_name: "VCG Portal",
    description: "Premium Insurance & Financial Strategy Portal",
    start_url: "/",
    display: "standalone",
    background_color: "#0A1628",
    theme_color: "#0A1628",
    orientation: "portrait",
    icons: [
      {
        src: "/api/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
  };
}
