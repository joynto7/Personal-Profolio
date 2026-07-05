import { ImageResponse } from "next/og";
import { profile } from "@/data/profile";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "80px",
          backgroundColor: "#FAF8F5",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 30,
            fontWeight: 600,
            letterSpacing: 4,
            color: "#C28A58",
            textTransform: "uppercase",
          }}
        >
          {profile.designation}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 92,
            fontWeight: 600,
            color: "#1B1A18",
            marginTop: 20,
          }}
        >
          {profile.name}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 30,
            color: "#68625B",
            marginTop: 24,
            maxWidth: 900,
          }}
        >
          {profile.tagline}
        </div>
        <div
          style={{
            display: "flex",
            width: 90,
            height: 6,
            backgroundColor: "#4A2F27",
            marginTop: 40,
            borderRadius: 4,
          }}
        />
      </div>
    ),
    { ...size }
  );
}
