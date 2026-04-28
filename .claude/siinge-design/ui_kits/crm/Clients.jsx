// ============================================================================
// Clients — directory table with editorial chrome.
// ============================================================================

const CLIENTS = [
  { id: 1, name: 'Catalina Beach Studio', email: 'eva@catalinabeach.co', company: 'Catalina Beach Studio', country: 'Spain', phone: '+34 600 442 010', nda: 'Signed', sow: 'Sent', joined: '12 Aug 2025', tier: 'Established' },
  { id: 2, name: 'Marin Holdings', email: 'l.suarez@marinholdings.com', company: 'Marin Holdings', country: 'US', phone: '+1 415 555 0148', nda: 'Signed', sow: 'Signed', joined: '04 Aug 2025', tier: 'High-value' },
  { id: 3, name: 'Verde Hospitality Group', email: 'projects@verde.hg', company: 'Verde HG', country: 'Mexico', phone: '+52 55 1234 9982', nda: 'Sent', sow: null, joined: '28 Jul 2025', tier: 'High-value' },
  { id: 4, name: 'Bramble & Sons', email: 'studio@brambleandsons.uk', company: 'Bramble & Sons', country: 'UK', phone: '+44 20 7946 0822', nda: 'Signed', sow: 'Sent', joined: '20 Jul 2025', tier: 'Early-stage' },
  { id: 5, name: 'Astra Architects', email: 'hello@astra.studio', company: 'Astra Architects', country: 'US', phone: null, nda: null, sow: null, joined: '14 Jul 2025', tier: 'Established' },
  { id: 6, name: 'Hightide Spirits', email: 'olivia@hightide.co', company: 'Hightide Co.', country: 'AU', phone: '+61 2 9000 4412', nda: 'Signed', sow: null, joined: '02 Jul 2025', tier: 'High-value' },
  { id: 7, name: 'Lila & Cline', email: 'jo@lilacline.com', company: 'Lila & Cline', country: 'US', phone: '+1 212 555 0190', nda: 'Signed', sow: 'Signed', joined: '24 Jun 2025', tier: 'Established' },
];

const Clients = () => {
  const [q, setQ] = React.useState('');
  const filtered = CLIENTS.filter(c =>
    !q || c.name.toLowerCase().includes(q.toLowerCase()) || c.company.toLowerCase().includes(q.toLowerCase())
  );

  const statusChip = (label, status) => {
    if (!status) return <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)' }}>—</span>;
    const tone = status === 'Signed' ? 'pos' : 'cau';
    return <Chip tone={tone} dot={false} style={{ fontSize: 9 }}>{label} · {status}</Chip>;
  };

  return (
    <div style={{ padding: '24px 40px 64px' }}>
      <Card padded={false} style={{ overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{ padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--ink)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Eyebrow>{filtered.length} records</Eyebrow>
            <span style={{ width: 1, height: 16, background: 'var(--border)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--paper)', border: '1px solid var(--ink-5)', borderRadius: 4, padding: '6px 10px', width: 280 }}>
              <Icon name="search" size={14} color="var(--ink-3)" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name or company"
                style={{ border: 0, outline: 0, background: 'transparent', fontFamily: 'var(--font-sans)', fontSize: 13, flex: 1, color: 'var(--ink)' }} />
            </div>
          </div>
          <Btn variant="primary" icon={<Icon name="plus" size={12} color="var(--paper)" />}>New Client</Btn>
        </div>

        {/* Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-sans)' }}>
          <thead>
            <tr style={{ background: 'var(--paper-2)' }}>
              {['Name & Contact', 'Company', 'Documents', 'Joined', ''].map(h => (
                <th key={h} style={{
                  textAlign: 'left', padding: '12px 24px',
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.18em',
                  textTransform: 'uppercase', color: 'var(--ink-3)',
                  borderBottom: '1px solid var(--border)',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid var(--border-soft)', transition: 'background 120ms' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--paper)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '16px 24px' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 17, color: 'var(--ink)', lineHeight: 1.1 }}>{c.name}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>{c.email}</div>
                  {c.phone && <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon name="phone" size={11} color="var(--ink-4)" />{c.country} · {c.phone}
                  </div>}
                </td>
                <td style={{ padding: '16px 24px', fontSize: 13, color: 'var(--ink-2)' }}>{c.company}</td>
                <td style={{ padding: '16px 24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                    {statusChip('NDA', c.nda)}
                    {statusChip('SOW', c.sow)}
                  </div>
                </td>
                <td style={{ padding: '16px 24px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>{c.joined}</td>
                <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', gap: 4 }}>
                    {['plus', 'pencil', 'trash'].map(n => (
                      <button key={n} style={{ background: 'transparent', border: 0, padding: 6, cursor: 'pointer', color: 'var(--ink-3)', borderRadius: 2 }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--paper-2)'; e.currentTarget.style.color = 'var(--ink)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ink-3)'; }}>
                        <Icon name={n} size={14} />
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

Object.assign(window, { Clients });
