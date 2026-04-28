// ============================================================================
// SIINGE CRM — primitives
// Small, reusable building blocks. Inline-style approach to avoid Tailwind.
// All consumers expect colors_and_type.css to be loaded.
// ============================================================================

const Eyebrow = ({ children, style = {}, color }) => (
  <div style={{
    fontSize: 10, fontWeight: 700, letterSpacing: '0.18em',
    textTransform: 'uppercase', color: color || 'var(--ink-3)',
    fontFamily: 'var(--font-sans)', ...style,
  }}>{children}</div>
);

const Serif = ({ as = 'div', size = 28, italic = false, children, style = {} }) => {
  const Tag = as;
  return <Tag style={{
    fontFamily: 'var(--font-display)',
    fontSize: size, fontWeight: 400,
    lineHeight: size > 36 ? 1.05 : 1.15,
    letterSpacing: '-0.02em',
    fontStyle: italic ? 'italic' : 'normal',
    color: 'var(--ink)', margin: 0, ...style,
  }}>{children}</Tag>;
};

const Rule = ({ ink = false, style = {} }) => (
  <hr style={{
    border: 0, height: 1, margin: 0,
    background: ink ? 'var(--ink)' : 'var(--border-soft)',
    ...style,
  }} />
);

const Btn = ({ variant = 'primary', size = 'md', icon, children, onClick, disabled, style = {}, type = 'button' }) => {
  const base = {
    fontFamily: 'var(--font-sans)',
    fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
    border: '1px solid var(--ink)', borderRadius: 4, cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'opacity 120ms', display: 'inline-flex', alignItems: 'center',
    gap: 6, opacity: disabled ? 0.4 : 1, lineHeight: 1,
  };
  const sizes = {
    sm: { padding: '6px 10px', fontSize: 10 },
    md: { padding: '11px 16px', fontSize: 11 },
    lg: { padding: '14px 22px', fontSize: 12 },
  };
  const variants = {
    primary: { background: 'var(--ink)', color: 'var(--paper)' },
    ember:   { background: 'var(--ember)', color: '#fff', borderColor: 'var(--ember)' },
    ghost:   { background: 'transparent', color: 'var(--ink)' },
    danger:  { background: 'transparent', color: 'var(--critical)', borderColor: 'var(--critical)' },
    soft:    { background: 'var(--paper-2)', color: 'var(--ink)', borderColor: 'var(--ink-5)' },
  };
  return <button type={type} disabled={disabled} onClick={onClick}
    style={{ ...base, ...sizes[size], ...variants[variant], ...style }}
    onMouseEnter={e => !disabled && (e.currentTarget.style.opacity = 0.85)}
    onMouseLeave={e => !disabled && (e.currentTarget.style.opacity = 1)}>
    {icon}{children}
  </button>;
};

const Chip = ({ tone = 'neutral', dot = true, children, style = {} }) => {
  const tones = {
    neutral: { bg: 'var(--paper-2)', bd: 'var(--border)', fg: 'var(--ink-2)', dot: '#A39C8E' },
    pos:     { bg: '#E5EAD9', bd: '#B8C4A0', fg: '#3A4F2A', dot: '#4F6B3A' },
    cau:     { bg: '#F5E9C8', bd: '#DBC68A', fg: '#7A5512', dot: '#B5841E' },
    crit:    { bg: '#F1DAD3', bd: '#D9B5AB', fg: '#6E1F1F', dot: '#8C2A2A' },
    info:    { bg: '#DCE3E7', bd: '#B6C0C7', fg: '#2B4654', dot: '#3B5A6B' },
    ember:   { bg: '#F3D9C5', bd: '#D9A37E', fg: '#7C2D12', dot: '#C2410C' },
    ink:     { bg: 'var(--ink)', bd: 'var(--ink)', fg: 'var(--paper)', dot: 'var(--paper)' },
  };
  const t = tones[tone] || tones.neutral;
  return <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 6,
    fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
    padding: '4px 8px', borderRadius: 2, border: `1px solid ${t.bd}`,
    background: t.bg, color: t.fg, lineHeight: 1, whiteSpace: 'nowrap', ...style,
  }}>
    {dot && <span style={{ width: 5, height: 5, borderRadius: 999, background: t.dot, display: 'inline-block' }} />}
    {children}
  </span>;
};

const Field = ({ label, children, error, help }) => (
  <label style={{ display: 'block' }}>
    {label && <div style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase',
      color: 'var(--ink-3)', marginBottom: 6, fontFamily: 'var(--font-sans)',
    }}>{label}</div>}
    {children}
    {(error || help) && <div style={{
      fontSize: 11, marginTop: 5, color: error ? 'var(--critical)' : 'var(--ink-3)',
      fontWeight: error ? 600 : 400,
    }}>{error || help}</div>}
  </label>
);

const Input = React.forwardRef(({ error, style = {}, ...props }, ref) => (
  <input ref={ref} {...props} style={{
    width: '100%', boxSizing: 'border-box',
    fontFamily: 'var(--font-sans)', fontSize: 14,
    padding: '11px 14px', background: 'var(--bone)',
    border: `1px solid ${error ? 'var(--critical)' : 'var(--ink-5)'}`,
    borderRadius: 4, color: 'var(--ink)', outline: 'none',
    ...style,
  }}
    onFocus={e => { e.target.style.borderColor = 'var(--ink)'; e.target.style.boxShadow = '0 0 0 2px var(--paper), 0 0 0 3px var(--ink)'; }}
    onBlur={e => { e.target.style.borderColor = error ? 'var(--critical)' : 'var(--ink-5)'; e.target.style.boxShadow = 'none'; }}
  />
));

const Card = ({ children, style = {}, padded = true, onClick }) => (
  <div onClick={onClick} style={{
    background: 'var(--bone)', border: '1px solid var(--border-soft)',
    borderRadius: 4, padding: padded ? 20 : 0,
    cursor: onClick ? 'pointer' : 'default',
    transition: 'border-color 120ms, transform 120ms',
    ...style,
  }}
    onMouseEnter={e => onClick && (e.currentTarget.style.borderColor = 'var(--ink)')}
    onMouseLeave={e => onClick && (e.currentTarget.style.borderColor = 'var(--border-soft)')}>
    {children}
  </div>
);

// ----- Icons (Lucide subset, inlined) -----
const Icon = ({ name, size = 18, color, style = {} }) => {
  const paths = {
    dashboard: <><rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" /><rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" /></>,
    pipeline: <><line x1="3" y1="6" x2="3" y2="20"/><line x1="9" y1="6" x2="9" y2="20"/><line x1="15" y1="6" x2="15" y2="20"/><line x1="21" y1="6" x2="21" y2="20"/></>,
    users: <><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>,
    file: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    pencil: <><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4z"/></>,
    trash: <><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></>,
    phone: <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.37 1.9.72 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0122 16.92z"/>,
    search: <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    chevron: <polyline points="9 18 15 12 9 6"/>,
    chevronDown: <polyline points="6 9 12 15 18 9"/>,
    download: <><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>,
    check: <polyline points="20 6 9 17 4 12"/>,
    x: <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    arrowRight: <><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></>,
  };
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none"
    stroke={color || 'currentColor'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
    style={style}>{paths[name]}</svg>;
};

// ----- Brand mark, drawn inline so it scales freely -----
const SiingeMark = ({ size = 32, color = 'currentColor', strokeWidth = 1 }) => (
  <svg width={size} height={size * 0.92} viewBox="0 0 100 92" fill="none"
    stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    {/* Outer arch */}
    <path d="M 6 88 L 6 40 A 44 38 0 0 1 94 40 L 94 88" />
    {/* Inner arch */}
    <path d="M 11 88 L 11 41 A 39 33 0 0 1 89 41 L 89 88" />
    {/* Sun half */}
    <path d="M 30 60 A 20 20 0 0 1 70 60" />
    {/* Rays */}
    {Array.from({ length: 17 }).map((_, i) => {
      const a = (Math.PI / 18) * (i + 0.5);
      const x1 = 50 + Math.cos(a + Math.PI) * 22;
      const y1 = 60 + Math.sin(a + Math.PI) * 22;
      const x2 = 50 + Math.cos(a + Math.PI) * (35 + (i % 3) * 2);
      const y2 = 60 + Math.sin(a + Math.PI) * (35 + (i % 3) * 2);
      return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
    })}
    {/* Waves */}
    <path d="M 8 70 Q 30 60 50 70 T 92 70" />
    <path d="M 8 78 Q 30 68 50 78 T 92 78" />
    {/* Bottom rule */}
    <line x1="6" y1="88" x2="94" y2="88" />
  </svg>
);

Object.assign(window, { Eyebrow, Serif, Rule, Btn, Chip, Field, Input, Card, Icon, SiingeMark });
