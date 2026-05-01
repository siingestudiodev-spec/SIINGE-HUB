// character-cards.jsx
// Character design sheet component for the dating-sim roster.
// Each card is a vertical "character page": silhouette placeholder,
// core info, lore, outfit variants, personality, and a copy-ready
// art prompt for downstream illustration.

const ccStyles = {
  card: {
    width: 560,
    background: '#0e0a0d',
    color: '#efe6dd',
    fontFamily: '"Inter", system-ui, sans-serif',
    borderRadius: 2,
    overflow: 'hidden',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    padding: '28px 32px 20px',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  nameBlock: { display: 'flex', flexDirection: 'column', gap: 4 },
  kanji: {
    fontFamily: '"Noto Serif JP", serif',
    fontSize: 13,
    letterSpacing: '0.3em',
    opacity: 0.55,
  },
  name: {
    fontFamily: '"Cinzel", serif',
    fontSize: 38,
    fontWeight: 600,
    letterSpacing: '0.04em',
    lineHeight: 1,
    margin: 0,
  },
  epithet: {
    fontFamily: '"Inter", sans-serif',
    fontSize: 11,
    letterSpacing: '0.28em',
    textTransform: 'uppercase',
    opacity: 0.6,
    marginTop: 10,
  },
  elementBadge: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 10,
    letterSpacing: '0.2em',
    padding: '6px 10px',
    border: '1px solid currentColor',
    borderRadius: 2,
    textTransform: 'uppercase',
  },
  silhouette: {
    position: 'relative',
    aspectRatio: '2 / 3',
    overflow: 'hidden',
  },
  silhouetteLabel: {
    position: 'absolute',
    top: 14,
    left: 14,
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 10,
    letterSpacing: '0.2em',
    padding: '4px 8px',
    background: 'rgba(0,0,0,0.55)',
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    borderRadius: 1,
  },
  silhouetteCaption: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    right: 14,
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 10,
    letterSpacing: '0.12em',
    color: 'rgba(255,255,255,0.55)',
    textTransform: 'uppercase',
  },
  section: {
    padding: '22px 32px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  sectionLabel: {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 10,
    letterSpacing: '0.28em',
    textTransform: 'uppercase',
    opacity: 0.5,
    marginBottom: 10,
  },
  tagline: {
    fontFamily: '"Cinzel", serif',
    fontSize: 18,
    fontStyle: 'italic',
    lineHeight: 1.45,
    margin: 0,
    opacity: 0.9,
    textWrap: 'pretty',
  },
  loreText: {
    fontSize: 13.5,
    lineHeight: 1.6,
    opacity: 0.78,
    margin: 0,
    textWrap: 'pretty',
  },
  statGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 14,
  },
  stat: { display: 'flex', flexDirection: 'column', gap: 3 },
  statLabel: {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 9,
    letterSpacing: '0.25em',
    textTransform: 'uppercase',
    opacity: 0.45,
  },
  statValue: { fontSize: 13, fontWeight: 500, opacity: 0.9 },
  outfitsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 14,
  },
  outfit: { display: 'flex', flexDirection: 'column', gap: 8 },
  outfitThumb: {
    aspectRatio: '2 / 3',
    borderRadius: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  outfitThumbLabel: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 8,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.75)',
  },
  outfitName: {
    fontFamily: '"Cinzel", serif',
    fontSize: 13,
    letterSpacing: '0.04em',
    margin: 0,
  },
  outfitDesc: {
    fontSize: 11,
    lineHeight: 1.45,
    opacity: 0.6,
    margin: 0,
  },
  paletteRow: { display: 'flex', gap: 6, marginTop: 10 },
  swatch: {
    flex: 1,
    height: 36,
    borderRadius: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  swatchHex: {
    position: 'absolute',
    bottom: 3,
    left: 5,
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 8,
    color: 'rgba(255,255,255,0.85)',
    textShadow: '0 1px 2px rgba(0,0,0,0.6)',
  },
  traits: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  trait: {
    fontSize: 11,
    padding: '4px 10px',
    borderRadius: 999,
    border: '1px solid rgba(255,255,255,0.15)',
    opacity: 0.8,
  },
  quote: {
    fontFamily: '"Cinzel", serif',
    fontStyle: 'italic',
    fontSize: 14,
    lineHeight: 1.5,
    margin: 0,
    paddingLeft: 16,
    borderLeft: '2px solid currentColor',
    opacity: 0.85,
  },
  promptBox: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 10.5,
    lineHeight: 1.6,
    padding: 16,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 3,
    color: 'rgba(255,255,255,0.8)',
    whiteSpace: 'pre-wrap',
    margin: 0,
  },
  meta: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '16px 32px',
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 9,
    letterSpacing: '0.25em',
    textTransform: 'uppercase',
    opacity: 0.4,
  },
};

// ── Stripe placeholder with element-tinted gradient ─────────────
function SilhouettePlaceholder({ accent, deep, label, caption, pose }) {
  const id = `stripes-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <div style={ccStyles.silhouette}>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 400 600"
        preserveAspectRatio="xMidYMid slice"
        style={{ display: 'block' }}
      >
        <defs>
          <pattern id={id} patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
            <rect width="8" height="8" fill={deep} />
            <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(255,255,255,0.04)" strokeWidth="4" />
          </pattern>
          <radialGradient id={`${id}-glow`} cx="50%" cy="42%" r="55%">
            <stop offset="0%" stopColor={accent} stopOpacity="0.55" />
            <stop offset="50%" stopColor={accent} stopOpacity="0.12" />
            <stop offset="100%" stopColor={deep} stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="400" height="600" fill={`url(#${id})`} />
        <rect width="400" height="600" fill={`url(#${id}-glow)`} />
        {/* vertical composition guides */}
        <line x1="200" y1="0" x2="200" y2="600" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="2 6" />
        <line x1="0" y1="300" x2="400" y2="300" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="2 6" />
        {/* simple pose silhouette */}
        <g fill="rgba(0,0,0,0.35)" stroke="rgba(255,255,255,0.12)" strokeWidth="1">
          {pose}
        </g>
      </svg>
      <div style={ccStyles.silhouetteLabel}>FULL-BODY · 2:3</div>
      <div style={ccStyles.silhouetteCaption}>{caption}</div>
    </div>
  );
}

// abstract pose silhouettes (generic shapes, not copies of anything)
const Poses = {
  standing: (
    <>
      <ellipse cx="200" cy="120" rx="34" ry="42" />
      <path d="M200 162 L172 200 L170 340 L180 440 L172 560 L190 560 L200 445 L210 560 L228 560 L220 440 L230 340 L228 200 Z" />
      <path d="M172 210 L130 310 L140 360 L160 320 Z" />
      <path d="M228 210 L270 310 L260 360 L240 320 Z" />
    </>
  ),
  contrapposto: (
    <>
      <ellipse cx="205" cy="115" rx="32" ry="40" />
      <path d="M205 155 L180 195 L175 320 L165 420 L155 560 L175 560 L185 430 L205 335 L215 420 L205 560 L225 560 L220 420 L225 320 L230 195 Z" />
      <path d="M180 205 L140 260 L135 330 L160 300 Z" />
      <path d="M230 205 L280 250 L300 220 L285 210 Z" />
    </>
  ),
  weapon: (
    <>
      <ellipse cx="195" cy="118" rx="34" ry="42" />
      <path d="M195 160 L165 200 L160 330 L170 430 L165 560 L185 560 L195 440 L205 560 L225 560 L225 430 L235 330 L225 200 Z" />
      <path d="M165 210 L110 170 L100 160 L95 175 L155 225 Z" />
      <path d="M225 210 L275 280 L270 350 L250 320 Z" />
      <line x1="110" y1="170" x2="60" y2="40" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
    </>
  ),
  floating: (
    <>
      <ellipse cx="200" cy="140" rx="34" ry="42" />
      <path d="M200 182 L170 220 L168 320 L175 420 L180 500 L195 520 L205 520 L220 500 L225 420 L232 320 L230 220 Z" />
      <path d="M170 230 L120 290 L115 330 L145 320 Z" />
      <path d="M230 230 L290 270 L300 320 L260 310 Z" />
      <ellipse cx="200" cy="540" rx="60" ry="6" fill="rgba(255,255,255,0.06)" />
    </>
  ),
};

// ── Card ─────────────────────────────────────────────────────────
function CharacterCard({ data }) {
  const accentStyle = { color: data.accent };
  return (
    <div style={{ ...ccStyles.card, boxShadow: `0 0 120px -40px ${data.accent}` }}>
      <div style={ccStyles.header}>
        <div style={ccStyles.nameBlock}>
          <div style={ccStyles.kanji}>{data.kanji}</div>
          <h2 style={{ ...ccStyles.name, color: data.accent }}>{data.name}</h2>
          <div style={ccStyles.epithet}>{data.epithet}</div>
        </div>
        <div style={{ ...ccStyles.elementBadge, color: data.accent }}>
          {data.element}
        </div>
      </div>

      <SilhouettePlaceholder
        accent={data.accent}
        deep={data.deep}
        caption={`▲ DROP FINAL ILLUSTRATION HERE · ${data.name.toUpperCase()}`}
        pose={Poses[data.pose]}
      />

      <div style={ccStyles.section}>
        <p style={{ ...ccStyles.tagline, color: data.accent }}>
          "{data.tagline}"
        </p>
      </div>

      <div style={ccStyles.section}>
        <div style={ccStyles.sectionLabel}>Lore</div>
        <p style={ccStyles.loreText}>{data.lore}</p>
      </div>

      <div style={ccStyles.section}>
        <div style={ccStyles.sectionLabel}>Vitals</div>
        <div style={ccStyles.statGrid}>
          {data.vitals.map((v) => (
            <div key={v.label} style={ccStyles.stat}>
              <div style={ccStyles.statLabel}>{v.label}</div>
              <div style={ccStyles.statValue}>{v.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={ccStyles.section}>
        <div style={ccStyles.sectionLabel}>Personality</div>
        <div style={ccStyles.traits}>
          {data.traits.map((t) => (
            <span key={t} style={{ ...ccStyles.trait, borderColor: `${data.accent}55`, color: data.accent }}>
              {t}
            </span>
          ))}
        </div>
      </div>

      <div style={ccStyles.section}>
        <div style={ccStyles.sectionLabel}>Palette</div>
        <div style={ccStyles.paletteRow}>
          {data.palette.map((c) => (
            <div key={c} style={{ ...ccStyles.swatch, background: c }}>
              <span style={ccStyles.swatchHex}>{c}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={ccStyles.section}>
        <div style={ccStyles.sectionLabel}>Outfit Variants</div>
        <div style={ccStyles.outfitsRow}>
          {data.outfits.map((o, i) => (
            <div key={i} style={ccStyles.outfit}>
              <div
                style={{
                  ...ccStyles.outfitThumb,
                  background: `linear-gradient(160deg, ${data.deep} 0%, ${o.tint} 100%)`,
                  border: `1px solid ${data.accent}33`,
                }}
              >
                <svg width="100%" height="100%" viewBox="0 0 100 150" style={{ display: 'block' }}>
                  <g fill="rgba(0,0,0,0.25)" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5">
                    <ellipse cx="50" cy="32" rx="10" ry="12" />
                    <path d="M50 44 L40 60 L38 100 L42 140 L58 140 L62 100 L60 60 Z" />
                  </g>
                </svg>
                <span style={ccStyles.outfitThumbLabel}>V{i + 1}</span>
              </div>
              <h4 style={{ ...ccStyles.outfitName, color: data.accent }}>{o.name}</h4>
              <p style={ccStyles.outfitDesc}>{o.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={ccStyles.section}>
        <div style={ccStyles.sectionLabel}>Signature Line</div>
        <p style={{ ...ccStyles.quote, color: data.accent }}>{data.quote}</p>
      </div>

      <div style={ccStyles.section}>
        <div style={ccStyles.sectionLabel}>Art Prompt · copy for illustrator / generator</div>
        <pre style={ccStyles.promptBox}>{data.prompt}</pre>
      </div>

      <div style={ccStyles.meta}>
        <span>ID · {data.id}</span>
        <span>REV 001</span>
        <span>{data.element}</span>
      </div>
    </div>
  );
}

window.CharacterCard = CharacterCard;
