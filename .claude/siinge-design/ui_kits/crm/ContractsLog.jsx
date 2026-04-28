// ============================================================================
// Contracts log + Public Sign portal.
// ============================================================================

const CONTRACTS = [
  { client: 'Catalina Beach Studio', company: 'Catalina Beach Studio', type: 'SOW', status: 'Sent', sent: '12 Sept 2025', opened: '12 Sept 2025', signed: null, live: true },
  { client: 'Marin Holdings', company: 'Marin Holdings', type: 'NDA', status: 'Signed', sent: '02 Sept 2025', opened: '02 Sept 2025', signed: '02 Sept 2025' },
  { client: 'Marin Holdings', company: 'Marin Holdings', type: 'SOW', status: 'Signed', sent: '04 Sept 2025', opened: '04 Sept 2025', signed: '05 Sept 2025' },
  { client: 'Verde Hospitality', company: 'Verde HG', type: 'NDA', status: 'Sent', sent: '01 Sept 2025', opened: null, signed: null },
  { client: 'Bramble & Sons', company: 'Bramble & Sons', type: 'NDA', status: 'Signed', sent: '21 Aug 2025', opened: '22 Aug 2025', signed: '22 Aug 2025' },
  { client: 'Hightide Spirits', company: 'Hightide Co.', type: 'NDA', status: 'Signed', sent: '03 Jul 2025', opened: '04 Jul 2025', signed: '04 Jul 2025' },
];

const ContractsLog = () => (
  <div style={{ padding: '24px 40px 64px' }}>
    <Card padded={false} style={{ overflow: 'hidden' }}>
      <div style={{ padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--ink)' }}>
        <Eyebrow>{CONTRACTS.length} dispatched</Eyebrow>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="soft" size="sm">All Statuses</Btn>
          <Btn variant="ghost" size="sm">Sent</Btn>
          <Btn variant="ghost" size="sm">Signed</Btn>
        </div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'var(--paper-2)' }}>
            {['Client', 'Document', 'Status', 'Sent', 'Opened', 'Signed'].map(h => (
              <th key={h} style={{ textAlign: 'left', padding: '12px 24px', fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-3)', borderBottom: '1px solid var(--border)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {CONTRACTS.map((r, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--border-soft)' }}>
              <td style={{ padding: '14px 24px' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 16, color: 'var(--ink)' }}>{r.client}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{r.company}</div>
              </td>
              <td style={{ padding: '14px 24px' }}>
                <Chip tone={r.type === 'SOW' ? 'ember' : 'neutral'} dot={false}>{r.type}</Chip>
              </td>
              <td style={{ padding: '14px 24px' }}>
                <Chip tone={r.status === 'Signed' ? 'pos' : 'cau'}>{r.status}</Chip>
              </td>
              <td style={{ padding: '14px 24px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>{r.sent}</td>
              <td style={{ padding: '14px 24px' }}>
                {r.live ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 700, color: 'var(--info)' }}>
                    <span style={{ position: 'relative', width: 8, height: 8 }}>
                      <span style={{ position: 'absolute', inset: 0, borderRadius: 999, background: 'var(--info)', opacity: 0.3, animation: 'pulse 1.6s ease-out infinite' }} />
                      <span style={{ position: 'absolute', inset: 2, borderRadius: 999, background: 'var(--info)' }} />
                    </span>
                    {r.opened}
                  </span>
                ) : r.opened ? (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>{r.opened}</span>
                ) : <span style={{ color: 'var(--ink-4)' }}>—</span>}
              </td>
              <td style={{ padding: '14px 24px' }}>
                {r.signed ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--positive)', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600 }}>
                    <Icon name="check" size={12} />{r.signed}
                  </span>
                ) : <span style={{ color: 'var(--ink-4)' }}>—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
    <style>{`@keyframes pulse { 0%{transform:scale(.6);opacity:.5} 100%{transform:scale(1.6);opacity:0} }`}</style>
  </div>
);

// ----- Public-facing signature portal -----
const PortalSign = () => {
  const [signed, setSigned] = React.useState(false);
  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)', padding: '48px 24px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        {/* Letterhead */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28, paddingBottom: 18, borderBottom: '1px solid var(--ink)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <SiingeMark size={42} color="var(--ink)" strokeWidth={1.1} />
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase' }}>SIINGE Studio</div>
              <div style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 2 }}>Brand & Identity, est. 2024</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <Eyebrow style={{ fontSize: 9 }}>Reference</Eyebrow>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink-2)', marginTop: 4 }}>#4F2A9C8E</div>
          </div>
        </div>

        <Eyebrow style={{ marginBottom: 8 }}>Scope of Work</Eyebrow>
        <Serif size={48} italic as="h1" style={{ marginBottom: 18 }}>For Catalina Beach Studio</Serif>

        {/* PDF preview well */}
        <div style={{
          width: '100%', height: 380, background: 'var(--bone)',
          border: '1px solid var(--border)', boxShadow: 'inset 0 0 0 1px rgba(14,14,12,0.04), inset 0 8px 24px -16px rgba(14,14,12,0.18)',
          borderRadius: 4, padding: 32, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden', marginBottom: 28,
        }}>
          <Serif size={20}>Scope of Work — Identity & Packaging</Serif>
          <Rule />
          <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.7, margin: 0 }}>
            This Scope of Work ("SOW") is entered into on <strong>12 Sept 2025</strong> between SIINGE Studio
            ("Studio") and Catalina Beach Studio ("Client"). The Studio agrees to deliver the following workstreams:
          </p>
          <ul style={{ fontSize: 13, color: 'var(--ink-2)', margin: '4px 0 0 18px', lineHeight: 1.8 }}>
            <li>Brand strategy intensive and visual identity system</li>
            <li>Primary & secondary mark, type system, color & motion guidelines</li>
            <li>Packaging design across three SKUs with print specifications</li>
          </ul>
        </div>

        {!signed ? (
          <Card style={{ padding: 24 }}>
            <Eyebrow style={{ marginBottom: 12 }}>Execution & Signature</Eyebrow>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <Field label="Company Name"><Input defaultValue="Catalina Beach Studio" /></Field>
              <Field label="Business Name (DBA)"><Input defaultValue="Catalina Beach LLC" /></Field>
              <Field label="Signer's Full Name"><Input defaultValue="Eva Marín" /></Field>
              <Field label="Signer's Title"><Input defaultValue="Founder" /></Field>
            </div>
            <Field label="Draw Signature">
              <div style={{ height: 120, border: '1px dashed var(--border)', background: 'var(--paper)', display: 'grid', placeItems: 'center', borderRadius: 4 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 28, color: 'var(--ink-4)' }}>Sign here</span>
              </div>
            </Field>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
              <Btn variant="ember" size="lg" onClick={() => setSigned(true)}>I Agree and Sign</Btn>
            </div>
          </Card>
        ) : (
          <Card style={{ padding: 24, borderColor: 'var(--positive)' }}>
            <Eyebrow style={{ color: 'var(--positive)' }}>Signed & Secured</Eyebrow>
            <Serif size={24} italic style={{ marginTop: 6 }}>Document signed by Eva Marín.</Serif>
            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)' }}>Reference #4F2A9C8E · 12 Sept 2025, 14:32</span>
              <Btn variant="primary" icon={<Icon name="download" size={12} color="var(--paper)" />}>Download Signed PDF</Btn>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

Object.assign(window, { ContractsLog, PortalSign });
