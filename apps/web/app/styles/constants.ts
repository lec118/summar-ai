import React from "react";

// Common button styles
export const btnPrimary: React.CSSProperties = {
  padding: "12px 20px",
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

export const btnSm: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: 8,
  background: "#5865f2",
  marginRight: 8,
  color: "#fff",
  border: "none",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 500,
  transition: "all 0.2s",
};

// Common layout styles
export const mainStyle: React.CSSProperties = {
  maxWidth: 1200,
  margin: "0 auto",
  padding: 24,
  minHeight: "100vh",
};

export const sectionStyle: React.CSSProperties = {
  marginBottom: 40,
  padding: 24,
  background: "#0f1530",
  borderRadius: 16,
};

export const codeStyle: React.CSSProperties = {
  padding: "2px 8px",
  background: "#12183a",
  borderRadius: 4,
  fontSize: 13,
  fontFamily: "monospace",
};

// Table styles
export const th: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 16px",
  borderBottom: "2px solid #222",
  fontSize: 14,
  fontWeight: 600,
  opacity: 0.9,
};

export const td: React.CSSProperties = {
  padding: "14px 16px",
  borderBottom: "1px solid #1a2045",
  fontSize: 14,
};

// Form styles
export const inputStyle: React.CSSProperties = {
  padding: "12px 16px",
  borderRadius: 8,
  background: "#0f1530",
  color: "#fff",
  border: "1px solid #334",
  fontSize: 15,
  outline: "none",
};

export const selectStyle: React.CSSProperties = {
  padding: "12px 16px",
  borderRadius: 12,
  background: "#192041",
  color: "#fff",
  border: "1px solid #334",
  fontSize: 15,
  cursor: "pointer",
  minWidth: 300,
};

// Color palette
export const colors = {
  primary: "#5865f2",
  success: "#27ae60",
  warning: "#f39c12",
  danger: "#e74c3c",
  info: "#3498db",
  muted: "#95a5a6",

  bgPrimary: "#0f1530",
  bgSecondary: "#12183a",
  bgTertiary: "#192041",

  border: "#334",
  borderLight: "rgba(255,255,255,0.1)",
};
