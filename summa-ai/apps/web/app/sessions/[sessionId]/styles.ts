import React from "react";

export const mainStyle: React.CSSProperties = {
  maxWidth: 1200,
  margin: "0 auto",
  padding: 24,
  minHeight: "100vh",
};

export const btnPrimary: React.CSSProperties = {
  padding: "12px 24px",
  background: "#5865f2",
  color: "#fff",
  borderRadius: 12,
  border: "none",
  cursor: "pointer",
  fontSize: 15,
  fontWeight: 600,
  transition: "all 0.2s",
};

export const btnSecondary: React.CSSProperties = {
  padding: "10px 20px",
  background: "#0f1530",
  color: "#fff",
  borderRadius: 10,
  border: "1px solid #334",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 600,
  transition: "all 0.2s",
};

export const btnLarge: React.CSSProperties = {
  padding: "24px 48px",
  background: "#5865f2",
  color: "#fff",
  borderRadius: 16,
  border: "none",
  cursor: "pointer",
  fontSize: 16,
  fontWeight: 600,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 0.3s",
  boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
};

export const codeStyle: React.CSSProperties = {
  padding: "2px 8px",
  background: "#12183a",
  borderRadius: 4,
  fontSize: 13,
  fontFamily: "monospace",
};
