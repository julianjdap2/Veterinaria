/**
 * Mascotas que cruzan el banner de extremo a extremo (perro, gato, otro).
 * Cada una con velocidad y delay distintos para efecto natural.
 */
export function BannerMascot() {
  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      aria-hidden
    >
      {/* Perrito */}
      <div
        className="banner-mascot-cross absolute left-0 top-1/2 w-11 h-11"
        style={{ animationDuration: '20s', animationDelay: '0s' }}
      >
        <svg
          className="banner-mascot-bounce h-11 w-11 text-white drop-shadow-lg"
          viewBox="0 0 64 64"
          fill="currentColor"
        >
          <ellipse cx="32" cy="42" rx="12" ry="9" opacity="0.95" />
          <circle cx="32" cy="26" r="11" />
          <ellipse cx="20" cy="22" rx="5" ry="6" />
          <ellipse cx="44" cy="22" rx="5" ry="6" />
          <path d="M20 36 Q16 30 20 26 L24 30 Z" />
          <path d="M44 36 Q48 30 44 26 L40 30 Z" />
          <path d="M30 40 L26 52 M34 40 L38 52" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <circle cx="26" cy="25" r="2.2" fill="rgba(15, 23, 42, 0.5)" />
          <circle cx="38" cy="25" r="2.2" fill="rgba(15, 23, 42, 0.5)" />
          <path d="M36 30 Q38 32 36 34" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        </svg>
      </div>

      {/* Gatico */}
      <div
        className="banner-mascot-cross absolute left-0 top-1/2 w-10 h-10"
        style={{ animationDuration: '22s', animationDelay: '6s' }}
      >
        <svg
          className="banner-mascot-bounce h-10 w-10 text-white drop-shadow-lg"
          viewBox="0 0 64 64"
          fill="currentColor"
        >
          <ellipse cx="32" cy="44" rx="10" ry="8" opacity="0.95" />
          <circle cx="32" cy="28" r="10" />
          <path d="M24 18 L20 8 L28 16 Z" />
          <path d="M40 18 L44 8 L36 16 Z" />
          <path d="M24 40 L22 52 M32 42 L30 54 M40 40 L42 52" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
          <circle cx="27" cy="27" r="2" fill="rgba(15, 23, 42, 0.5)" />
          <circle cx="37" cy="27" r="2" fill="rgba(15, 23, 42, 0.5)" />
          <path d="M30 32 L32 34 L34 32" stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="round" />
        </svg>
      </div>

      {/* Pajarito */}
      <div
        className="banner-mascot-cross absolute left-0 top-1/2 w-8 h-8"
        style={{ animationDuration: '14s', animationDelay: '12s' }}
      >
        <svg
          className="banner-mascot-bounce h-8 w-8 text-white/90 drop-shadow-md"
          viewBox="0 0 64 64"
          fill="currentColor"
        >
          <ellipse cx="32" cy="36" rx="14" ry="10" opacity="0.95" />
          <circle cx="32" cy="24" r="9" />
          <path d="M18 22 Q8 20 12 28 Q14 26 18 24 Z" />
          <path d="M46 22 Q56 20 52 28 Q50 26 46 24 Z" />
          <circle cx="28" cy="23" r="2" fill="rgba(15, 23, 42, 0.5)" />
          <circle cx="36" cy="23" r="2" fill="rgba(15, 23, 42, 0.5)" />
          <path d="M32 28 L32 30" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  )
}
