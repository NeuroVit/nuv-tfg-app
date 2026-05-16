export function NeuralStockMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 44 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Top cube */}
      <rect x="13" y="1" width="18" height="13" rx="2.5" stroke="#2eae7a" strokeWidth="2.2" />
      {/* Bottom-left cube */}
      <rect x="1" y="26" width="18" height="13" rx="2.5" stroke="#2eae7a" strokeWidth="2.2" />
      {/* Bottom-right cube */}
      <rect x="25" y="26" width="18" height="13" rx="2.5" stroke="#2eae7a" strokeWidth="2.2" />
      {/* Y-shaped connector */}
      <path
        d="M22 14 L22 22 M22 22 L10 26 M22 22 L34 26"
        stroke="#2eae7a"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
