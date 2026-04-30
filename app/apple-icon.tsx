import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0A1628",
        }}
      >
        <span style={{ color: "#C9A84C", fontSize: 90, fontWeight: 800, fontFamily: "serif", lineHeight: 1 }}>
          V
        </span>
        <span style={{ color: "white", fontSize: 90, fontWeight: 800, fontFamily: "serif", lineHeight: 1 }}>
          CG
        </span>
      </div>
    ),
    { width: 180, height: 180 }
  );
}
