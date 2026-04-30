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
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
