// ============================================================================
// Pipeline — kanban with editorial column headers and ink-line accents.
// ============================================================================

const STAGES = [
  { id: 'intake', label: 'Intake', tone: 'neutral' },
  { id: 'call', label: 'Call Booked', tone: 'info' },
  { id: 'proposal', label: 'Proposal Sent', tone: 'cau' },
  { id: 'signed', label: 'Contracts Signed', tone: 'pos' },
  { id: 'paid', label: 'Invoice Paid', tone: 'pos' },
  { id: 'followup', label: 'Follow Up', tone: 'cau' },
  { id: 'churn', label: 'Churn', tone: 'crit' },
];

const SEED = [
  { id: 1, stage: 'intake', client: 'North Bay Bakers', title: 'Brand identity & web', value: 14000, tier: 'Early-stage', date: '12 Sept' },
  { id: 2, stage: 'intake', client: 'Pueblo Rugs', title: 'E-commerce relaunch', value: 28000, tier: 'Established', date: '11 Sept' },
  { id: 3, stage: 'call', client: 'Verde Hospitality', title: 'Multi-property rollout', value: 64000, tier: 'High-value', date: '09 Sept' },
  { id: 4, stage: 'call', client: 'Astra Architects', title: 'Brand refresh', value: 22000, tier: 'Established', date: '08 Sept' },
  { id: 5, stage: 'proposal', client: 'Catalina Beach Studio', title: 'Identity + packaging', value: 24800, tier: 'Established', date: '05 Sept' },
  { id: 6, stage: 'proposal', client: 'Bramble & Sons', title: 'Editorial site', value: 18500, tier: 'Early-stage', date: '03 Sept' },
  { id: 7, stage: 'signed', client: 'Marin Holdings', title: 'Annual report', value: 48000, tier: 'High-value', date: '02 Sept' },
  { id: 8, stage: 'paid', client: 'Lila & Cline', title: 'Brand book', value: 12000, tier: 'Established', date: '28 Aug' },
  { id: 9, stage: 'followup', client: 'Hightide Spirits', title: 'Bottle & brand', value: 36000, tier: 'High-value', date: '20 Aug' },
  { id: 10, stage: 'churn', client: 'North & Field Co.', title: 'Identity system', value: 0, tier: 'Early-stage', date: '15 Aug', reason: 'Budget' },
];

const Pipeline = ({ onOpen }) => {
  const byStage = id => SEED.filter(p => p.stage === id);

  return (
    <div style={{ padding: '24px 32px 48px', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 24, alignItems: 'stretch' }}>
        {STAGES.map(stage => {
          const items = byStage(stage.id);
          return (
            <div key={stage.id} style={{ minWidth: 280, width: 280, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
              {/* Column header */}
              <div style={{
                padding: '10px 12px 12px', borderTop: '1px solid var(--ink)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
              }}>
                <Eyebrow>{stage.label}</Eyebrow>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>{items.length}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                {items.map(p => (
                  <Card key={p.id} onClick={() => onOpen?.(p)} style={{ padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{
                          fontFamily: 'var(--font-display)', fontStyle: 'italic',
                          fontSize: 16, color: 'var(--ink)', lineHeight: 1.3,
                        }}>{p.client}</div>
                        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 8, lineHeight: 1.4 }}>{p.title}</div>
                      </div>
                      {p.value > 0 && <div style={{
                        fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
                        color: 'var(--ink)', whiteSpace: 'nowrap',
                      }}>${(p.value / 1000).toFixed(p.value % 1000 === 0 ? 0 : 1)}k</div>}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--border-soft)' }}>
                      <Chip tone={p.tier === 'High-value' ? 'ink' : 'neutral'} dot={false} style={{ fontSize: 9, padding: '3px 6px' }}>{p.tier}</Chip>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-4)' }}>{p.date}</span>
                    </div>
                    {p.reason && <div style={{ marginTop: 8, fontSize: 11, color: 'var(--critical)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>— {p.reason}</div>}
                  </Card>
                ))}
                {items.length === 0 && (
                  <div style={{
                    padding: 18, textAlign: 'center',
                    fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase',
                    color: 'var(--ink-4)',
                  }}>Empty</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

Object.assign(window, { Pipeline });
