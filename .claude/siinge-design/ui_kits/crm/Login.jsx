// ============================================================================
// Login — full-screen brand entry. Matches the existing Login.vue intent.
// ============================================================================

const Login = ({ onSignIn }) => {
  const [email, setEmail] = React.useState('admin@siinge.studio');
  const [password, setPassword] = React.useState('');

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--paper)',
      display: 'grid', placeItems: 'center', position: 'relative', overflow: 'hidden',
    }}>
      {/* Watermark mark */}
      <div style={{
        position: 'absolute', right: -120, bottom: -120, opacity: 0.05, pointerEvents: 'none',
      }}>
        <SiingeMark size={620} color="var(--ink)" strokeWidth={0.6} />
      </div>

      <div style={{ width: 420, position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 36 }}>
          <SiingeMark size={56} color="var(--ink)" strokeWidth={1.1} />
        </div>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <Eyebrow style={{ marginBottom: 10 }}>Internal CRM Access</Eyebrow>
          <Serif size={36} as="h1">SIINGE Studio</Serif>
        </div>

        <Card style={{ padding: 32 }}>
          <form onSubmit={e => { e.preventDefault(); onSignIn(); }} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <Field label="Email Address">
              <Input value={email} onChange={e => setEmail(e.target.value)} type="email" required />
            </Field>
            <Field label="Password">
              <Input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="••••••••" required />
            </Field>
            <Btn type="submit" variant="primary" size="lg" style={{ justifyContent: 'center', width: '100%', marginTop: 8 }}>Sign In</Btn>
          </form>
          <div style={{ borderTop: '1px solid var(--border-soft)', marginTop: 28, paddingTop: 18, textAlign: 'center' }}>
            <Eyebrow style={{ fontSize: 9, color: 'var(--ink-4)' }}>Authorized personnel only</Eyebrow>
          </div>
        </Card>
      </div>
    </div>
  );
};

Object.assign(window, { Login });
