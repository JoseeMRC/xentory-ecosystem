import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../../context/LanguageContext';

export function PrivacyPage() {
  const { lang } = useLang();
  const isEs = lang === 'es';

  useEffect(() => {
    document.title = isEs ? 'Política de Privacidad · Xentory' : 'Privacy Policy · Xentory';
  }, [isEs]);

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: 'clamp(3rem,8vw,5rem) clamp(1.2rem,5vw,2.5rem)' }}>

      {/* Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.75rem' }}>
          {isEs ? 'Legal' : 'Legal'}
        </div>
        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 'clamp(1.8rem,5vw,2.6rem)', margin: '0 0 0.6rem', letterSpacing: '-0.03em' }}>
          {isEs ? 'Política de Privacidad' : 'Privacy Policy'}
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.83rem' }}>
          {isEs ? 'Última actualización: abril 2026' : 'Last updated: April 2026'}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', color: 'var(--text2)', lineHeight: 1.8, fontSize: '0.9rem' }}>

        {/* Intro */}
        <section>
          <p>
            {isEs
              ? 'En Xentory respetamos tu privacidad y nos comprometemos a proteger los datos personales que compartes con nosotros. Esta política describe qué datos recopilamos, cómo los usamos y cuáles son tus derechos conforme al Reglamento General de Protección de Datos (RGPD) de la UE y la normativa española vigente.'
              : 'At Xentory we respect your privacy and are committed to protecting the personal data you share with us. This policy describes what data we collect, how we use it, and your rights under the EU General Data Protection Regulation (GDPR) and applicable Spanish law.'}
          </p>
        </section>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border)' }} />

        {/* Responsible */}
        <section>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.05rem', color: 'var(--text)', marginBottom: '0.6rem' }}>
            {isEs ? '1. Responsable del tratamiento' : '1. Data Controller'}
          </h2>
          <p>
            {isEs
              ? 'El responsable del tratamiento de sus datos es Xentory (en adelante, "nosotros"), con correo de contacto legal@xentory.io. Jurisdicción: España (Madrid).'
              : 'The data controller is Xentory (hereinafter "we"), reachable at legal@xentory.io. Jurisdiction: Spain (Madrid).'}
          </p>
        </section>

        {/* Data collected */}
        <section>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.05rem', color: 'var(--text)', marginBottom: '0.6rem' }}>
            {isEs ? '2. Datos que recopilamos' : '2. Data We Collect'}
          </h2>
          <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {(isEs ? [
              'Datos de registro: nombre, correo electrónico y contraseña (o datos de inicio de sesión con Google).',
              'Datos de uso: páginas visitadas, preferencias de idioma y moneda, sesiones activas.',
              'Datos de suscripción: plan contratado, historial de pagos procesado por Stripe.',
              'Datos técnicos: dirección IP, tipo de dispositivo y navegador (únicamente con fines de seguridad y antifraude).',
            ] : [
              'Registration data: name, email address and password (or Google sign-in data).',
              'Usage data: pages visited, language and currency preferences, active sessions.',
              'Subscription data: active plan, payment history processed by Stripe.',
              'Technical data: IP address, device type and browser (for security and anti-fraud purposes only).',
            ]).map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>

        {/* Purpose */}
        <section>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.05rem', color: 'var(--text)', marginBottom: '0.6rem' }}>
            {isEs ? '3. Finalidad del tratamiento' : '3. Purpose of Processing'}
          </h2>
          <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {(isEs ? [
              'Prestar el servicio de análisis financiero y deportivo con IA.',
              'Gestionar tu cuenta y suscripción.',
              'Enviarte comunicaciones relacionadas con el servicio (no marketing sin consentimiento).',
              'Cumplir con obligaciones legales y prevenir el fraude.',
            ] : [
              'Provide the AI-powered financial and sports analysis service.',
              'Manage your account and subscription.',
              'Send you service-related communications (no marketing without consent).',
              'Comply with legal obligations and prevent fraud.',
            ]).map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
          <p style={{ marginTop: '0.75rem' }}>
            {isEs
              ? 'Base legal: ejecución de contrato (art. 6.1.b RGPD) y cumplimiento de obligaciones legales (art. 6.1.c RGPD).'
              : 'Legal basis: performance of a contract (Art. 6.1.b GDPR) and compliance with legal obligations (Art. 6.1.c GDPR).'}
          </p>
        </section>

        {/* Retention */}
        <section>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.05rem', color: 'var(--text)', marginBottom: '0.6rem' }}>
            {isEs ? '4. Plazos de conservación' : '4. Retention Periods'}
          </h2>
          <p>
            {isEs
              ? 'Tus datos se conservan mientras mantengas una cuenta activa. Tras la cancelación de la cuenta, los datos se eliminan en un plazo máximo de 30 días, salvo obligación legal de conservarlos por un período mayor (p. ej., datos de facturación: 5 años según la normativa tributaria española).'
              : 'Your data is retained while you maintain an active account. After account deletion, data is erased within 30 days unless a longer retention period is legally required (e.g. invoicing data: 5 years under Spanish tax law).'}
          </p>
        </section>

        {/* Third parties */}
        <section>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.05rem', color: 'var(--text)', marginBottom: '0.6rem' }}>
            {isEs ? '5. Transferencias a terceros' : '5. Third-Party Transfers'}
          </h2>
          <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {(isEs ? [
              'Supabase (base de datos y autenticación) — USA, cubierto por cláusulas contractuales tipo de la UE.',
              'Stripe (pagos) — USA, cubierto por el marco de transferencia UE–USA.',
              'Google (autenticación OAuth) — cuando eliges iniciar sesión con Google.',
              'No vendemos ni cedemos tus datos a terceros con fines comerciales.',
            ] : [
              'Supabase (database & authentication) — USA, covered by EU Standard Contractual Clauses.',
              'Stripe (payments) — USA, covered by the EU–US data transfer framework.',
              'Google (OAuth sign-in) — when you choose to sign in with Google.',
              'We never sell or share your data with third parties for commercial purposes.',
            ]).map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>

        {/* Rights */}
        <section>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.05rem', color: 'var(--text)', marginBottom: '0.6rem' }}>
            {isEs ? '6. Tus derechos' : '6. Your Rights'}
          </h2>
          <p>{isEs ? 'Como usuario tienes derecho a:' : 'As a user you have the right to:'}</p>
          <ul style={{ paddingLeft: '1.25rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {(isEs ? [
              'Acceder a tus datos personales.',
              'Rectificar datos inexactos o incompletos.',
              'Solicitar la eliminación de tus datos (derecho al olvido).',
              'Limitar u oponerte al tratamiento de tus datos.',
              'Portabilidad de datos en formato legible por máquina.',
              'Presentar una reclamación ante la AEPD (aepd.es).',
            ] : [
              'Access your personal data.',
              'Rectify inaccurate or incomplete data.',
              'Request erasure of your data (right to be forgotten).',
              'Restrict or object to the processing of your data.',
              'Data portability in machine-readable format.',
              'Lodge a complaint with the AEPD (aepd.es).',
            ]).map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
          <p style={{ marginTop: '0.75rem' }}>
            {isEs
              ? 'Puedes ejercer tus derechos enviando un correo a legal@xentory.io con el asunto "Derechos RGPD". Responderemos en un plazo máximo de 30 días.'
              : 'You may exercise your rights by emailing legal@xentory.io with the subject line "GDPR Rights". We will respond within 30 days.'}
          </p>
        </section>

        {/* Cookies */}
        <section>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.05rem', color: 'var(--text)', marginBottom: '0.6rem' }}>
            {isEs ? '7. Cookies' : '7. Cookies'}
          </h2>
          <p>
            {isEs
              ? 'Utilizamos cookies técnicas estrictamente necesarias para el funcionamiento del servicio (sesión de usuario, preferencias de idioma y moneda). No utilizamos cookies de rastreo publicitario. Para más información consulta nuestra '
              : 'We use technically necessary cookies for service operation (user session, language and currency preferences). We do not use advertising tracking cookies. For more information see our '}
            <Link to="/terminos" style={{ color: 'var(--gold)' }}>
              {isEs ? 'Términos de Uso' : 'Terms of Use'}
            </Link>.
          </p>
        </section>

        {/* Changes */}
        <section>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.05rem', color: 'var(--text)', marginBottom: '0.6rem' }}>
            {isEs ? '8. Cambios en esta política' : '8. Changes to This Policy'}
          </h2>
          <p>
            {isEs
              ? 'Podemos actualizar esta política periódicamente. Te notificaremos por correo electrónico en caso de cambios significativos. La fecha de "última actualización" al inicio del documento refleja siempre la versión vigente.'
              : 'We may update this policy periodically. You will be notified by email if significant changes are made. The "last updated" date at the top of this page always reflects the current version.'}
          </p>
        </section>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border)' }} />

        {/* Contact */}
        <section style={{ background: 'var(--card)', borderRadius: 14, padding: '1.25rem 1.5rem', border: '1px solid var(--border)' }}>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1rem', color: 'var(--text)', marginBottom: '0.5rem' }}>
            {isEs ? 'Contacto' : 'Contact'}
          </h2>
          <p style={{ margin: 0 }}>
            {isEs ? 'Para cualquier consulta sobre privacidad: ' : 'For any privacy enquiry: '}
            <a href="mailto:legal@xentory.io" style={{ color: 'var(--gold)' }}>legal@xentory.io</a>
          </p>
        </section>

        <div style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Link to="/terminos" style={{ color: 'var(--muted)', textDecoration: 'underline' }}>
            {isEs ? 'Términos de Uso' : 'Terms of Use'}
          </Link>
          <Link to="/" style={{ color: 'var(--muted)', textDecoration: 'underline' }}>
            {isEs ? 'Volver al inicio' : 'Back to home'}
          </Link>
        </div>
      </div>
    </div>
  );
}
