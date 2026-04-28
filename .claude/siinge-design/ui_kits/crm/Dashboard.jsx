// ============================================================================
// Dashboard — KPIs, loss reasons, client tiers. Editorial reskin.
// ============================================================================

const KPI = ({ eyebrow, value, unit, sub, accent }) => (
  <Card style={{ padding: 22, position: 'relative', overflow: 'hidden' }}>
    <Eyebrow>{eyebrow}</Eyebrow>
    <div style={{
      fontFamily: 'var(--font-display)', fontSize: 52, lineHeight: 1,
      letterSpacing: '-0.03em', color: 'var(--ink)', marginTop: 10,
    }}>{value}{unit && <span style={{ fontSize: 18, color: 'var(--ink-3)', fontStyle: 'italic', marginLeft: 6 }}>{unit}</span>}</div>
    {sub && <div style={{
      marginTop: 10, fontFamily: 'var(--font-display)', fontStyle: 'italic',
      fontSize: 13, color: 'var(--ink-3)',
    }}>{sub}</div>}
    {accent && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: 'var(--ember)' }} />}
  </Card>
);

const Dashboard = () => {
  const lossReasons = [
    { reason: 'Out of budget', count: 6, pct: 46 },
    { reason: 'Timeline mismatch', count: 4, pct: 31 },
    { reason: 'Went with another studio', count: 2, pct: 15 },
    { reason: 'Strategy unclear', count: 1, pct: 8 },
  ];
  const tiers = [
    { name: 'High-value', count: 8, pct: 32, fill: 'var(--ink)' },
    { name: 'Established', count: 11, pct: 44, fill: 'var(--ink-3)' },
    { name: 'Early-stage', count: 6, pct: 24, fill: 'var(--ink-5)' },
  ];

  return (
    <div style={{ padding: '32px 40px 64px', display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <KPI eyebrow="Active Pipeline" value="$184k" sub="Open across 12 deals." accent />
        <KPI eyebrow="Win Rate" value="62" unit="%" sub="Of all closed deals." />
        <KPI eyebrow="Avg. Time to Close" value="14" unit="days" sub="Lead → signed contract." />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 }}>
            <Eyebrow>Why deals are lost</Eyebrow>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)' }}>13 churn records</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {lossReasons.map(r => (
              <div key={r.reason}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10, gap: 12 }}>
                  <span style={{ fontSize: 13, color: 'var(--ink-2)', fontFamily: 'var(--font-display)', fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.reason}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', flexShrink: 0 }}>{r.count} · {r.pct}%</span>
                </div>
                <div style={{ height: 2, background: 'var(--paper-2)' }}>
                  <div style={{ width: `${r.pct}%`, height: '100%', background: 'var(--ink)' }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 }}>
            <Eyebrow>Client demographics</Eyebrow>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)' }}>25 clients</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {tiers.map(t => (
              <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 100, fontSize: 11, fontWeight: 600, color: 'var(--ink-2)', textAlign: 'right', letterSpacing: '0.04em' }}>{t.name}</div>
                <div style={{ flex: 1, height: 22, background: 'var(--paper-2)', position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${t.pct}%`, background: t.fill }} />
                  <span style={{ position: 'relative', marginLeft: 10, fontFamily: 'var(--font-mono)', fontSize: 10, color: t.pct > 30 ? 'var(--paper)' : 'var(--ink-2)', fontWeight: 600 }}>{t.count} · {t.pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent activity feed — editorial timeline */}
      <Card style={{ padding: 24 }}>
        <Eyebrow style={{ marginBottom: 16 }}>Recent activity</Eyebrow>
        <div>
          {[
            { who: 'Catalina Beach Studio', what: 'opened the SOW.', when: '3 min ago', tone: 'live' },
            { who: 'Marin Holdings', what: 'signed the NDA.', when: '2 h', tone: 'pos' },
            { who: 'Verde Hospitality Group', what: 'moved to Proposal Sent.', when: 'Today, 10:14', tone: 'cau' },
            { who: 'North & Field Co.', what: 'churned — out of budget.', when: 'Yesterday', tone: 'crit' },
          ].map((r, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 16,
              padding: '14px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border-soft)',
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: 999, flexShrink: 0,
                background: { live: 'var(--info)', pos: 'var(--positive)', cau: 'var(--caution)', crit: 'var(--critical)' }[r.tone],
              }} />
              <div style={{ flex: 1, fontSize: 14, color: 'var(--ink-2)' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--ink)' }}>{r.who}</span>
                {' '}{r.what}
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)' }}>{r.when}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

Object.assign(window, { Dashboard });
