export const tokens = {
  // Typography
  fonts: {
    sans: "var(--font-inter), system-ui, sans-serif",
    serif: "var(--font-lora), Georgia, serif",
  },

  // Spacing scale
  spacing: {
    xs: "0.25rem", // 4px
    sm: "0.5rem", // 8px
    md: "1rem", // 16px
    lg: "1.5rem", // 24px
    xl: "2rem", // 32px
    "2xl": "3rem", // 48px
    "3xl": "4rem", // 64px
  },

  // Content widths
  contentWidth: {
    narrow: "680px", // Blog content
    default: "1024px", // General content
    wide: "1280px", // Full-width sections
  },

  // Reading optimizations
  reading: {
    lineHeight: "1.7",
    fontSize: "1.125rem", // 18px
    maxWidth: "680px",
  },

  // Transitions
  transitions: {
    fast: "150ms ease",
    default: "200ms ease",
    slow: "300ms ease",
  },

  // Shadows
  shadows: {
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    default: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  },

  // Border radius
  radius: {
    sm: "0.25rem",
    default: "0.5rem",
    lg: "0.75rem",
    full: "9999px",
  },
};
