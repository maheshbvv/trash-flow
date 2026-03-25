'use client'

import Link from 'next/link'
import styles from '../page.module.css'

export default function Terms() {
  return (
    <div className={styles.page}>
      <header className="header">
        <div className="container header-content">
          <Link href="/" className="logo">
            <svg className="logo-icon" viewBox="0 0 24 24" fill="none">
              <path d="M19 4H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zM5 8l7 5 7-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            TrashFlow
          </Link>
        </div>
      </header>

      <main className={styles.main}>
        <div className="card" style={{ maxWidth: '800px' }}>
          <h1 className={styles.title}>Terms of Service</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Last updated: March 2026</p>

          <section style={{ marginBottom: '24px' }}>
            <h2>1. Acceptance of Terms</h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              By accessing and using TrashFlow, you accept and agree to be bound by 
              the terms and provision of this agreement.
            </p>
          </section>

          <section style={{ marginBottom: '24px' }}>
            <h2>2. Description of Service</h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              TrashFlow is a web application that allows users to manage their Gmail inbox 
              by bulk deleting emails based on sender, date range, or marketing categorization. 
              The service requires Google OAuth authentication and access to the Gmail API.
            </p>
          </section>

          <section style={{ marginBottom: '24px' }}>
            <h2>3. User Responsibilities</h2>
            <ul style={{ marginLeft: '24px', marginTop: '12px', color: 'var(--text-secondary)' }}>
              <li>You must have a valid Gmail account to use this service</li>
              <li>You are responsible for maintaining the confidentiality of your account</li>
              <li>You agree to use the service in compliance with applicable laws</li>
              <li>You understand that deleted emails cannot be recovered</li>
            </ul>
          </section>

          <section style={{ marginBottom: '24px' }}>
            <h2>4. Payment Terms</h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              TrashFlow is available for a one-time payment of $9.99. This payment is 
              non-refundable and grants lifetime access to the service. No subscription 
              or recurring fees apply.
            </p>
          </section>

          <section style={{ marginBottom: '24px' }}>
            <h2>5. Limitation of Liability</h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              TrashFlow is provided "as is" without warranty of any kind. We are not 
              responsible for any data loss, including emails accidentally deleted. 
              Users are encouraged to review emails before permanent deletion.
            </p>
          </section>

          <section style={{ marginBottom: '24px' }}>
            <h2>6. Intellectual Property</h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              The TrashFlow application, including its design, code, and branding, 
              is the intellectual property of TrashFlow. Users may not copy, modify, 
              or distribute our property without explicit permission.
            </p>
          </section>

          <section style={{ marginBottom: '24px' }}>
            <h2>7. Termination</h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              We reserve the right to terminate or suspend access to our service 
              without notice for any violation of these terms or for any other 
              reason at our sole discretion.
            </p>
          </section>

          <section>
            <h2>8. Contact</h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              For questions about these Terms of Service, please contact us.
            </p>
          </section>
        </div>
      </main>

      <footer className="footer">
        <div className="container footer-content">
          <span className="footer-text">© 2026 TrashFlow. All rights reserved.</span>
          <div className="footer-links">
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
