/** Subtle dark grain texture overlay on the canvas background */
export function GrainOverlay() {
  return (
    <svg
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        opacity: 0.035,
        mixBlendMode: 'screen',
      }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <filter id="monveil-grain">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.65"
          numOctaves="3"
          stitchTiles="stitch"
        />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#monveil-grain)" />
    </svg>
  );
}
