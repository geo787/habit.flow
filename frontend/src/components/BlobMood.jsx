export default function BlobMood({ size = 80, mood = "neutral" }) {
  const anims = {
    "low-energy": "ff-bm-sleepy",
    "neutral": "ff-float",
    "high-energy": "ff-bm-bounce",
    "overwhelm": "ff-bm-pulse",
    "focusing": "",
    "celebrating": "ff-bm-dance",
    "coaching": "ff-float",
  };
  const cls = anims[mood] || "ff-float";

  const showZ = mood === "low-energy";
  const showStars = mood === "high-energy";
  const showHeadphones = mood === "focusing";
  const showHeart = mood === "overwhelm";
  const showBubble = mood === "coaching";

  // eyes
  const eyeY = showZ || mood === "focusing" ? 60 : 58;
  const eyeShape = showZ
    ? <><path d="M40 60 q5 4 12 0" stroke="#1A1625" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
       <path d="M68 60 q5 4 12 0" stroke="#1A1625" strokeWidth="2.5" fill="none" strokeLinecap="round"/></>
    : <><circle cx="46" cy={eyeY} r="4" fill="#1A1625" /><circle cx="74" cy={eyeY} r="4" fill="#1A1625" />
       <circle cx="47.5" cy={eyeY-1.5} r="1.2" fill="#FDFCFD" /><circle cx="75.5" cy={eyeY-1.5} r="1.2" fill="#FDFCFD" /></>;
  const smile = mood === "celebrating"
    ? <path d="M48 73 Q60 87 72 73" stroke="#1A1625" strokeWidth="3" fill="none" strokeLinecap="round"/>
    : mood === "overwhelm"
    ? <path d="M50 78 q10 -6 20 0" stroke="#1A1625" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
    : <path d="M50 75 Q60 84 70 75" stroke="#1A1625" strokeWidth="2.5" fill="none" strokeLinecap="round"/>;

  return (
    <div className="relative inline-block" style={{ width: size, height: size }} data-testid={`blob-mood-${mood}`}>
      <svg
        viewBox="0 0 120 120"
        width={size}
        height={size}
        className={`${cls} drop-shadow-[0_8px_24px_rgba(177,156,217,0.35)] transition-all duration-500`}
      >
        <defs>
          <radialGradient id={`bg-${mood}`} cx="40%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#FFD166" />
            <stop offset="60%" stopColor="#B19CD9" />
            <stop offset="100%" stopColor="#7E6BAA" />
          </radialGradient>
        </defs>
        <ellipse cx="60" cy="65" rx="42" ry="40" fill={`url(#bg-${mood})`} />
        {eyeShape}
        {smile}
        {/* cheeks */}
        <circle cx="40" cy="72" r="3.5" fill="#E07A5F" opacity="0.55" />
        <circle cx="80" cy="72" r="3.5" fill="#E07A5F" opacity="0.55" />

        {showHeadphones && (
          <g stroke="#1A1625" strokeWidth="3" fill="none">
            <path d="M22 55 q0 -28 38 -28 t38 28" />
            <rect x="14" y="50" width="12" height="20" rx="4" fill="#1A1625" />
            <rect x="94" y="50" width="12" height="20" rx="4" fill="#1A1625" />
          </g>
        )}
        {showHeart && (
          <g transform="translate(58 95)">
            <path d="M0 4 C-6 -4 -14 -4 -14 4 c0 6 14 14 14 14 s14 -8 14 -14 c0 -8 -8 -8 -14 0 z" fill="#E07A5F" className="ff-pulse-soft" />
          </g>
        )}
      </svg>

      {showZ && (
        <div className="absolute -top-2 -right-2 text-xl font-black text-[#89B4FA] ff-bm-z" data-testid="blob-z">Zz</div>
      )}
      {showStars && (
        <>
          <div className="absolute -top-1 -left-1 ff-bm-star1 text-[#FFD166]">✦</div>
          <div className="absolute top-2 -right-3 ff-bm-star2 text-[#FFD166]">✦</div>
          <div className="absolute bottom-0 -left-3 ff-bm-star3 text-[#45B69C]">✦</div>
        </>
      )}
      {showBubble && (
        <div className="absolute -top-2 -right-6 bg-[#FDFCFD] text-[#1A1625] text-xs px-2 py-1 rounded-2xl font-bold ff-pulse-soft">...</div>
      )}
    </div>
  );
}
