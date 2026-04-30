import { ImageResponse } from "next/og";

export const runtime = "edge";

export function GET() {
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
        <span style={{ color: "#C9A84C", fontSize: 240, fontWeight: 800, fontFamily: "serif", lineHeight: 1 }}>
          V
        </span>
        <span style={{ color: "white", fontSize: 240, fontWeight: 800, fontFamily: "serif", lineHeight: 1, marginLeft: -16 }}>
          CG
        </span>
      </div>
    ),
    { width: 512, height: 512 }
  );
}
