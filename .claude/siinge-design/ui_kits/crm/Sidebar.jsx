// ============================================================================
// Sidebar — left navigation. Ink fill, paper text. Brand mark at top.
// ============================================================================

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'pipeline',  label: 'Pipeline',  icon: 'pipeline' },
  { id: 'clients',   label: 'Clients',   icon: 'users' },
  { id: 'contracts', label: 'Contracts', icon: 'file' },
];

const Sidebar = ({ active, onNavigate }) => {
  return (
    <aside style={{
      width: 240, minHeight: '100vh', background: 'var(--ink)',
      color: 'var(--paper)', display: 'flex', flexDirection: 'column',
      flexShrink: 0, borderRight: '1px solid var(--ink)',
    }}>
      {/* Brand block */}
      <div style={{ padding: '28px 24px 24px', borderBottom: '1px solid #1c1a17' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <SiingeMark size={28} color="var(--paper)" strokeWidth={1.2} />
          <div>
            <div style={{
              fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 700,
              letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--paper)',
            }}>SIINGE</div>
            <div style={{
              fontSize: 9, fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase',
              color: 'var(--ink-4)', marginTop: 2,
            }}>Studio · CRM</div>
          </div>
        </div>
      </div>

      {/* Section label */}
      <div style={{
        padding: '24px 24px 8px',
        fontSize: 9, fontWeight: 700, letterSpacing: '0.22em',
        textTransform: 'uppercase', color: 'var(--ink-4)',
      }}>Workspace</div>

      <nav style={{ padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
        {NAV.map(item => {
          const isActive = active === item.id;
          return (
            <a key={item.id} href="#" onClick={e => { e.preventDefault(); onNavigate(item.id); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 12px', borderRadius: 4,
                background: isActive ? 'var(--paper)' : 'transparent',
                color: isActive ? 'var(--ink)' : 'var(--paper)',
                fontFamily: 'var(--font-sans)',
                fontSize: 12, fontWeight: 600, letterSpacing: '0.04em',
                textDecoration: 'none',
                transition: 'background 120ms, color 120ms',
                position: 'relative',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#1c1a17'; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}>
              <Icon name={item.icon} size={16} color={isActive ? 'var(--ink)' : 'var(--ink-4)'} />
              <span>{item.label}</span>
              {isActive && <div style={{ position: 'absolute', left: -12, top: '50%', transform: 'translateY(-50%)', width: 2, height: 16, background: 'var(--ember)' }} />}
            </a>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '16px 24px', borderTop: '1px solid #1c1a17' }}>
        <Eyebrow color="var(--ink-4)" style={{ fontSize: 9 }}>Operator</Eyebrow>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 999, background: 'var(--paper-2)',
            color: 'var(--ink)', display: 'grid', placeItems: 'center',
            fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600,
          }}>J</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--paper)' }}>Joaquin Khan</div>
            <div style={{ fontSize: 10, color: 'var(--ink-4)' }}>admin@siinge.studio</div>
          </div>
        </div>
      </div>
    </aside>
  );
};

const TopBar = ({ title, subtitle, actions }) => (
  <header style={{
    height: 72, background: 'var(--paper)',
    borderBottom: '1px solid var(--ink)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 40px', flexShrink: 0,
  }}>
    <div>
      <Eyebrow style={{ marginBottom: 4 }}>{subtitle}</Eyebrow>
      <Serif size={26} as="h1">{title}</Serif>
    </div>
    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>{actions}</div>
  </header>
);

Object.assign(window, { Sidebar, TopBar });
