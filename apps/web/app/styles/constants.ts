import React from "react";

// Common button styles
export const btnPrimary: React.CSSProperties = {
  padding: "12px 20px",
  background: "var(--primary-color)",
  color: "#fff",
  borderRadius: 12,
  border: "none",
  cursor: "pointer",
  fontSize: 15,
  fontWeight: 600,
  transition: "all 0.2s ease",
  boxShadow: "var(--shadow-sm)",
};

export const btnSecondary: React.CSSProperties = {
  padding: "12px 20px",
  background: "var(--bg-secondary)",
  color: "#fff",
  borderRadius: 12,
  border: "1px solid var(--border-color)",
  cursor: "pointer",
  fontSize: 15,
  fontWeight: 600,
  transition: "all 0.2s ease",
  boxShadow: "var(--shadow-sm)",
};

export const btnLarge: React.CSSProperties = {
  padding: "24px 48px",
  background: "var(--primary-color)",
  color: "#fff",
  borderRadius: 16,
  border: "none",
  cursor: "pointer",
  fontSize: 18,
  fontWeight: 700,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 0.2s ease",
  boxShadow: "var(--shadow-md)",
  width: "100%",
  maxWidth: "400px",
  margin: "0 auto",
};

export const btnIcon: React.CSSProperties = {
  padding: "16px",
  background: "var(--bg-secondary)",
  border: "1px solid var(--border-color)",
  cursor: "pointer",
  width: 64,
  height: 64,
  borderRadius: 20,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 24,
  transition: "all 0.2s ease",
};

export const btnDanger: React.CSSProperties = {
  padding: "0 32px",
  height: 64,
  borderRadius: 20,
  fontSize: 18,
  display: "flex",
  alignItems: "center",
  gap: 8,
  background: "var(--danger-color)",
  color: "#fff",
  border: "none",
  cursor: "pointer",
  fontWeight: 600,
  transition: "all 0.2s ease",
};

export const btnSm: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: 8,
  background: "var(--primary-color)",
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
  maxWidth: 1000,
  margin: "0 auto",
  padding: "60px 24px",
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};

export const sectionStyle: React.CSSProperties = {
  marginBottom: 32,
  padding: 32,
  background: "var(--card-bg)",
  borderRadius: 16,
  boxShadow: "var(--shadow-sm)",
  width: "100%",
  border: "1px solid var(--border-color)",
};

export const emptyStateStyle: React.CSSProperties = {
  marginTop: 40,
  padding: 80,
  background: "var(--card-bg)",
  borderRadius: 24,
  textAlign: "center",
  boxShadow: "var(--shadow-sm)",
  width: "100%",
  maxWidth: 800,
  border: "1px solid var(--border-color)",
};

export const iconCircleStyle: React.CSSProperties = {
  width: 80,
  height: 80,
  background: "rgba(59, 130, 246, 0.1)",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  margin: "0 auto 24px",
  color: "var(--primary-color)",
  fontSize: 32,
  border: "1px solid rgba(59, 130, 246, 0.2)",
};

export const codeStyle: React.CSSProperties = {
  padding: "2px 6px",
  background: "var(--bg-secondary)",
  borderRadius: 4,
  fontSize: 14,
  fontFamily: "monospace",
  color: "var(--text-primary)",
  fontWeight: 600,
};

// Table styles
export const th: React.CSSProperties = {
  textAlign: "left",
  padding: "16px",
  borderBottom: "1px solid var(--border-color)",
  fontSize: 14,
  fontWeight: 600,
  color: "var(--text-secondary)",
};

export const td: React.CSSProperties = {
  padding: "16px",
  borderBottom: "1px solid var(--border-color)",
  fontSize: 15,
  color: "var(--text-primary)",
};

// Form styles
export const inputStyle: React.CSSProperties = {
  padding: "16px 20px",
  borderRadius: 12,
  background: "var(--bg-secondary)",
  color: "var(--text-primary)",
  border: "1px solid var(--border-color)",
  fontSize: 16,
  outline: "none",
  transition: "all 0.2s",
  width: "100%",
};

export const selectStyle: React.CSSProperties = {
  padding: "16px 20px",
  borderRadius: 12,
  background: "var(--bg-secondary)",
  color: "var(--text-primary)",
  border: "1px solid var(--border-color)",
  fontSize: 16,
  cursor: "pointer",
  minWidth: 300,
  boxShadow: "var(--shadow-sm)",
};

// Color palette (kept for reference, but prefer using CSS variables)
export const colors = {
  primary: "#3B82F6",
  success: "#22C55E",
  warning: "#FACC15",
  danger: "#EF4444",
  info: "#3B82F6",
  muted: "#71717A",

  bgPrimary: "#09090b",
  bgSecondary: "#18181b",
  bgTertiary: "#27272A",

  border: "#27272A",
  borderLight: "#3F3F46",
};
