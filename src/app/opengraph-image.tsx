import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "VettedSaaSBlueprint practical SaaS reviews";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "stretch",
          background: "#f5f0e7",
          color: "#17201c",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "space-between",
          padding: "64px 72px",
          width: "100%",
        }}
      >
        <div
          style={{
            alignItems: "center",
            display: "flex",
            fontSize: 25,
            fontWeight: 700,
            justifyContent: "space-between",
            letterSpacing: "-0.02em",
          }}
        >
          <span>VettedSaaSBlueprint</span>
          <span style={{ color: "#6c7c67", fontSize: 18, letterSpacing: "0.08em" }}>
            INDEPENDENT REVIEWS
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          <div
            style={{
              background: "#b5654d",
              display: "flex",
              height: 10,
              width: 112,
            }}
          />
          <div
            style={{
              display: "flex",
              fontSize: 72,
              fontWeight: 650,
              letterSpacing: "-0.055em",
              lineHeight: 1.02,
              maxWidth: 980,
            }}
          >
            Practical SaaS reviews for real buying decisions
          </div>
        </div>
        <div
          style={{
            borderTop: "2px solid #17201c",
            display: "flex",
            fontSize: 20,
            justifyContent: "space-between",
            paddingTop: 22,
          }}
        >
          <span>Evidence-led · Buyer-first</span>
          <span>South Africa</span>
        </div>
      </div>
    ),
    size,
  );
}
