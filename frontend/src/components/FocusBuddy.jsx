export default function FocusBuddy({ size = 80, mood = "happy" }) {
  // Soft blob mascot rendered with SVG
  const eyeShape = mood === "focused" ? "M0 0 h6" : "M3 0 a3 3 0 1 0 0.1 0";
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className="ff-float drop-shadow-[0_8px_24px_rgba(177,156,217,0.35)]"
      data-testid="focus-buddy"
      aria-label="Focus buddy"
    >
      <defs>
        <radialGradient id="bodyGrad" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#FFD166" />
          <stop offset="60%" stopColor="#B19CD9" />
          <stop offset="100%" stopColor="#7E6BAA" />
        </radialGradient>
      </defs>
      <ellipse cx="60" cy="65" rx="42" ry="40" fill="url(#bodyGrad)" />
      {/* eyes */}
      <circle cx="46" cy="58" r="4" fill="#1A1625" />
      <circle cx="74" cy="58" r="4" fill="#1A1625" />
      <circle cx="47.5" cy="56.5" r="1.2" fill="#FDFCFD" />
      <circle cx="75.5" cy="56.5" r="1.2" fill="#FDFCFD" />
      {/* smile */}
      <path d="M50 75 Q60 84 70 75" stroke="#1A1625" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* cheeks */}
      <circle cx="40" cy="72" r="3.5" fill="#E07A5F" opacity="0.55" />
      <circle cx="80" cy="72" r="3.5" fill="#E07A5F" opacity="0.55" />
    </svg>
  );
}
