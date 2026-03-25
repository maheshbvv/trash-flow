'use client'

import Link from 'next/link'
import styles from '../page.module.css'

export default function Privacy() {
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
          <h1 className={styles.title}>Privacy Policy</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Last updated: March 2026</p>

          <section style={{ marginBottom: '24px' }}>
            <h2>1. Information We Collect</h2>
            <p>We collect minimal information necessary to provide our services:</p>
            <ul style={{ marginLeft: '24px', marginTop: '12px', color: 'var(--text-secondary)' }}>
              <li><strong>Email Address:</strong> Used for account identification and licensing</li>
              <li><strong>Google OAuth Token:</strong> Used to access Gmail API on your behalf</li>
              <li><strong>Operation History:</strong> We log operations you perform (emails trashed, storage reclaimed)</li>
            </ul>
          </section>

          <section style={{ marginBottom: '24px' }}>
            <h2>2. What We DON'T Collect</h2>
            <ul style={{ marginLeft: '24px', marginTop: '12px', color: 'var(--text-secondary)' }}>
              <li>Email content from your inbox</li>
              <li>Email attachments</li>
              <li>Contacts or address book</li>
              <li>Any personal data beyond your email address</li>
            </ul>
          </section>

          <section style={{ marginBottom: '24px' }}>
            <h2>3. How We Use Your Data</h2>
            <ul style={{ marginLeft: '24px', marginTop: '12px', color: 'var(--text-secondary)' }}>
              <li>To authenticate your account via Google OAuth</li>
              <li>To display your operation history and statistics</li>
              <li>To manage scheduled cleanup tasks</li>
            </ul>
          </section>

          <section style={{ marginBottom: '24px' }}>
            <h2>4. Data Storage</h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              Your data is stored in Supabase, our cloud database provider. 
              We implement industry-standard security measures to protect your data.
            </p>
          </section>

          <section style={{ marginBottom: '24px' }}>
            <h2>5. Data Deletion</h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              You can request deletion of your account and all associated data at any time 
              by contacting us. Your OAuth tokens are revoked when you sign out or disconnect.
            </p>
          </section>

          <section>
            <h2>6. Contact Us</h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              If you have questions about this Privacy Policy, please reach out to us.
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
