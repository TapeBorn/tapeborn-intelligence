// src/visual/trace-svg.js
// Trace SVG Generator for Signal Artifacts
// Generates deterministic SVG from trace data (entry, exit, bends) + signal type
// DRAFT visual specification — founder will revise

const { keccak256, toUtf8Bytes } = require("ethers");

/**
 * Signal type color palette (DRAFT — founder will revise)
 * Each signal type gets a distinct accent color
 */
const SIGNAL_TYPE_COLORS = {
  large_transfer: {
    primary: "#00E676",      // Bright green — money movement
    secondary: "#00BFA5",
    bg: "#0A1A0F",
    grid: "#1A3A1F",
    text: "#E8F5E9",
  },
  contract_creation: {
    primary: "#2979FF",      // Deep blue — infrastructure
    secondary: "#2196F3",
    bg: "#0A1428",
    grid: "#1A2A4A",
    text: "#E3F2FD",
  },
  high_frequency_wallet: {
    primary: "#FF6D00",      // Orange — activity/speed
    secondary: "#FF9800",
    bg: "#1A0F00",
    grid: "#3A1F00",
    text: "#FFF3E0",
  },
  contract_interaction: {
    primary: "#AA00FF",      // Purple — smart contract interaction
    secondary: "#CE93D8",
    bg: "#140A1F",
    grid: "#2A143A",
    text: "#F3E5F5",
  },
  wallet_burst: {
    primary: "#FF1744",      // Red — burst/intensity
    secondary: "#FF5252",
    bg: "#1A0005",
    grid: "#3A000A",
    text: "#FCE4EC",
  },
  token_flow_anomaly: {
    primary: "#FFEA00",      // Yellow — anomaly/alert
    secondary: "#FFF59D",
    bg: "#1A1400",
    grid: "#3A2F00",
    text: "#FFFDE7",
  },
  address_reactivation: {
    primary: "#00E5FF",      // Cyan — reactivation/awakening
    secondary: "#4DD0E1",
    bg: "#00141A",
    grid: "#002A3A",
    text: "#E0F7FA",
  },
};

/**
 * Default colors for unknown signal types
 */
const DEFAULT_COLORS = {
  primary: "#FFFFFF",
  secondary: "#BBBBBB",
  bg: "#0A0A0A",
  grid: "#1A1A1A",
  text: "#EEEEEE",
};

/**
 * Get color palette for a signal type
 */
function getColors(signalType) {
  return SIGNAL_TYPE_COLORS[signalType] || DEFAULT_COLORS;
}

/**
 * Interpolate between two hex colors
 */
function lerpColor(color1, color2, t) {
  const c1 = parseInt(color1.slice(1), 16);
  const c2 = parseInt(color2.slice(1), 16);
  const r1 = (c1 >> 16) & 0xff, g1 = (c1 >> 8) & 0xff, b1 = c1 & 0xff;
  const r2 = (c2 >> 16) & 0xff, g2 = (c2 >> 8) & 0xff, b2 = c2 & 0xff;
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, "0")}`;
}

/**
 * Generate a deterministic seed from trace + signal type for consistent decorative elements
 */
function generateDecorativeSeed(trace, signalType) {
  const input = `${trace.entry.join(",")}-${trace.exit.join(",")}-${trace.bends}-${signalType}`;
  const hash = keccak256(toUtf8Bytes(input));
  return hash.slice(2);
}

/**
 * Generate trace SVG from trace data and signal type
 * 
 * @param {Object} trace - { entry: [x,y], exit: [x,y], bends: 1|2 }
 * @param {string} signalType - Signal type string (e.g., "large_transfer")
 * @param {Object} options - Optional configuration
 * @returns {string} Valid SVG string
 */
function generateTraceSVG(trace, signalType, options = {}) {
  const {
    width = 400,
    height = 400,
    gridSize = 10,           // 10x10 grid
    padding = 40,            // Padding around grid
    lineWidth = 3,
    dotRadius = 8,
    showGrid = true,
    showCoordinates = false,
    backgroundStyle = "dark", // "dark" | "light"
    animated = false,        // CSS animation for line drawing
  } = options;

  const colors = getColors(signalType);
  const cellSize = (Math.min(width, height) - 2 * padding) / gridSize;
  const originX = padding;
  const originY = padding;
  const gridWidth = gridSize * cellSize;
  const gridHeight = gridSize * cellSize;

  // Convert grid coordinates to SVG coordinates (origin top-left)
  function gridToSvg(gx, gy) {
    return {
      x: originX + gx * cellSize + cellSize / 2,
      y: originY + (gridSize - 1 - gy) * cellSize + cellSize / 2, // Flip Y for grid coordinates
    };
  }

  const entry = gridToSvg(trace.entry[0], trace.entry[1]);
  const exit = gridToSvg(trace.exit[0], trace.exit[1]);

  // Generate bend points based on bends count
  function generateBendPoints(entryPt, exitPt, bends) {
    if (bends === 1) {
      // Single bend at midpoint with perpendicular offset
      const midX = (entryPt.x + exitPt.x) / 2;
      const midY = (entryPt.y + exitPt.y) / 2;
      const dx = exitPt.x - entryPt.x;
      const dy = exitPt.y - entryPt.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const offset = dist * 0.3;
      // Perpendicular direction
      const perpX = -dy / (dist || 1);
      const perpY = dx / (dist || 1);
      return [{
        x: midX + perpX * offset,
        y: midY + perpY * offset,
      }];
    } else if (bends === 2) {
      // Two bends: create an S-curve
      const t1 = 1/3, t2 = 2/3;
      const p1 = {
        x: entryPt.x + (exitPt.x - entryPt.x) * t1,
        y: entryPt.y + (exitPt.y - entryPt.y) * t1,
      };
      const p2 = {
        x: entryPt.x + (exitPt.x - entryPt.x) * t2,
        y: entryPt.y + (exitPt.y - entryPt.y) * t2,
      };
      const dx = exitPt.x - entryPt.x;
      const dy = exitPt.y - entryPt.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const offset = dist * 0.25;
      const perpX = -dy / (dist || 1);
      const perpY = dx / (dist || 1);
      return [
        { x: p1.x + perpX * offset, y: p1.y + perpY * offset },
        { x: p2.x - perpX * offset, y: p2.y - perpY * offset },
      ];
    }
    return [];
  }

  const bendPoints = generateBendPoints(entry, exit, trace.bends);

  // Build SVG path
  function buildPath() {
    let path = `M ${entry.x} ${entry.y}`;
    for (const bp of bendPoints) {
      path += ` Q ${bp.x} ${bp.y} `;
    }
    path += `${exit.x} ${exit.y}`;
    return path;
  }

  const pathData = buildPath();

  // Generate decorative seed for consistent noise/pattern
  const decSeed = generateDecorativeSeed(trace, signalType);
  const decBytes = [];
  for (let i = 0; i < decSeed.length; i += 2) {
    decBytes.push(parseInt(decSeed.substring(i, i + 2), 16));
  }

  // Build SVG
  const bgColor = backgroundStyle === "light" ? "#FAFAFA" : colors.bg;
  const gridColor = backgroundStyle === "light" ? "#DDDDDD" : colors.grid;
  const textColor = backgroundStyle === "light" ? "#333333" : colors.text;

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${colors.primary}" />
      <stop offset="100%" stop-color="${colors.secondary}" />
    </linearGradient>
    <radialGradient id="entryGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${colors.primary}" stop-opacity="0.4" />
      <stop offset="100%" stop-color="${colors.primary}" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="exitGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${colors.secondary}" stop-opacity="0.4" />
      <stop offset="100%" stop-color="${colors.secondary}" stop-opacity="0" />
    </radialGradient>
    ${animated ? `
    <style>
      @keyframes drawLine {
        to { stroke-dashoffset: 0; }
      }
      .trace-line {
        stroke-dasharray: 1000;
        stroke-dashoffset: 1000;
        animation: drawLine 2s ease-out forwards;
      }
      @keyframes pulse {
        0%, 100% { opacity: 0.5; r: ${dotRadius}px; }
        50% { opacity: 1; r: ${dotRadius * 1.5}px; }
      }
      .entry-dot, .exit-dot {
        animation: pulse 2s ease-in-out infinite;
      }
    </style>
    ` : ""}
  </defs>

  <!-- Background -->
  <rect width="${width}" height="${height}" fill="${bgColor}" />

  ${showGrid ? `
  <!-- Grid -->
  <g stroke="${gridColor}" stroke-width="0.5" opacity="0.4">
    ${Array.from({length: gridSize + 1}, (_, i) => 
      `<line x1="${originX + i * cellSize}" y1="${originY}" x2="${originX + i * cellSize}" y2="${originY + gridHeight}" />`
    ).join("")}
    ${Array.from({length: gridSize + 1}, (_, i) => 
      `<line x1="${originX}" y1="${originY + i * cellSize}" x2="${originX + gridWidth}" y2="${originY + i * cellSize}" />`
    ).join("")}
  </g>
  ` : ""}

  <!-- Trace Path -->
  <path 
    class="${animated ? "trace-line" : ""}"
    d="${pathData}"
    stroke="url(#lineGradient)"
    stroke-width="${lineWidth}"
    stroke-linecap="round"
    stroke-linejoin="round"
    fill="none"
  />

  ${bendPoints.map((bp, i) => `
  <!-- Bend point ${i + 1} -->
  <circle cx="${bp.x}" cy="${bp.y}" r="4" fill="${colors.primary}" opacity="0.6" />
  `).join("")}

  <!-- Entry Point -->
  <circle 
    class="${animated ? "entry-dot" : ""}"
    cx="${entry.x}" 
    cy="${entry.y}" 
    r="${dotRadius}" 
    fill="${colors.primary}" 
    stroke="${bgColor}" 
    stroke-width="2"
  />
  <circle 
    cx="${entry.x}" 
    cy="${entry.y}" 
    r="${dotRadius * 2}" 
    fill="url(#entryGlow)" 
  />

  <!-- Exit Point -->
  <circle 
    class="${animated ? "exit-dot" : ""}"
    cx="${exit.x}" 
    cy="${exit.y}" 
    r="${dotRadius}" 
    fill="${colors.secondary}" 
    stroke="${bgColor}" 
    stroke-width="2"
  />
  <circle 
    cx="${exit.x}" 
    cy="${exit.y}" 
    r="${dotRadius * 2}" 
    fill="url(#exitGlow)" 
  />

  ${showCoordinates ? `
  <!-- Coordinate Labels -->
  <g font-family="monospace" font-size="10" fill="${textColor}" opacity="0.7">
    <text x="${entry.x}" y="${entry.y - dotRadius - 4}" text-anchor="middle">Entry (${trace.entry[0]},${trace.entry[1]})</text>
    <text x="${exit.x}" y="${exit.y - dotRadius - 4}" text-anchor="middle">Exit (${trace.exit[0]},${trace.exit[1]})</text>
    ${bendPoints.map((bp, i) => `
    <text x="${bp.x}" y="${bp.y - 12}" text-anchor="middle">Bend ${i+1}</text>
    `).join("")}
  </g>
  ` : ""}

  <!-- Signal Type Badge -->
  <g>
    <rect x="${width - 120}" y="${height - 30}" width="110" height="20" rx="3" fill="${colors.primary}" opacity="0.9" />
    <text x="${width - 65}" y="${height - 13}" text-anchor="middle" font-family="monospace" font-size="11" font-weight="bold" fill="${bgColor}">${signalType.toUpperCase().replace("_", " ")}</text>
  </g>

  ${!animated ? `
  <!-- Decorative Noise Pattern (deterministic) -->
  <g opacity="0.03" fill="${colors.primary}">
    ${decBytes.slice(0, 50).map((byte, i) => {
      const x = (byte % gridSize) * cellSize + originX + cellSize/2;
      const y = (decBytes[(i + 10) % decBytes.length] % gridSize) * cellSize + originY + cellSize/2;
      const size = (byte % 3) + 1;
      return `<circle cx="${x}" cy="${y}" r="${size}" />`;
    }).join("")}
  </g>
  ` : ""}
</svg>`;

  return svg;
}

/**
 * Generate data URI from SVG string
 */
function svgToDataUri(svg) {
  const encoded = encodeURIComponent(svg)
    .replace(/%0A/g, "")
    .replace(/%20/g, " ")
    .replace(/%3D/g, "=")
    .replace(/%3A/g, ":")
    .replace(/%2F/g, "/")
    .replace(/%22/g, "'");
  return `data:image/svg+xml,${encoded}`;
}

/**
 * Generate trace SVG and return as data URI
 */
function generateTraceDataUri(trace, signalType, options = {}) {
  const svg = generateTraceSVG(trace, signalType, options);
  return svgToDataUri(svg);
}

module.exports = {
  generateTraceSVG,
  generateTraceDataUri,
  svgToDataUri,
  SIGNAL_TYPE_COLORS,
  getColors,
};