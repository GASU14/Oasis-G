// Vibrant colors for the alphabet
const COLORS = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#84cc16', // Lime
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#d946ef', // Fuchsia
  '#f43f5e', // Rose
  '#e11d48', // Rose-700
  '#db2777', // Pink-600
  '#9333ea', // Purple-600
  '#4f46e5', // Indigo-600
  '#2563eb', // Blue-600
  '#0284c7', // Sky-600
  '#0d9488', // Teal-600
  '#059669', // Emerald-600
  '#65a30d', // Lime-600
  '#ca8a04', // Yellow-600
  '#ea580c', // Orange-600
  '#dc2626', // Red-600
  '#7e22ce', // Purple-700
  '#be185d', // Pink-700
  '#4338ca'  // Indigo-700
];

export const getDefaultAvatar = (username: string): string => {
  const name = username || "Guest";
  const initial = name.charAt(0).toUpperCase();
  const charCode = initial.charCodeAt(0);
  
  // Pick color based on character code (consistent for same letter)
  const colorIndex = charCode % COLORS.length;
  const bgColor = COLORS[colorIndex];

  // Create a simple SVG with the initial centered
  const svgString = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <rect width="100" height="100" fill="${bgColor}"/>
      <text 
        x="50" 
        y="50" 
        font-family="Segoe UI, sans-serif" 
        font-weight="bold" 
        font-size="50" 
        fill="white" 
        text-anchor="middle" 
        dy=".35em"
      >
        ${initial}
      </text>
    </svg>
  `.trim();

  return `data:image/svg+xml;base64,${btoa(svgString)}`;
};