'use client'

import Link from 'next/link'
import styles from '../page.module.css'

export default function Refunds() {
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
          <h1 className={styles.title}>Cancellation & Subscription</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Last updated: March 2026</p>

          <section style={{ marginBottom: '24px' }}>
            <h2>1. Free Trial</h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              Users get 100 free deletions to test the service before subscribing. 
              This allows users to verify the app works as expected before making a payment.
            </p>
          </section>

          <section style={{ marginBottom: '24px' }}>
            <h2>2. No Refund Policy</h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              <strong>All sales are final.</strong> Once a payment is processed, we do not offer refunds. 
              Users can test the service using the free trial (100 deletions) to ensure it meets their needs 
              before subscribing.
            </p>
          </section>

          <section style={{ marginBottom: '24px' }}>
            <h2>3. Cancellation</h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              <strong>Yearly Subscriptions:</strong> You can cancel your subscription at any time from your account settings. 
              Upon cancellation, you will continue to have access to paid features until the end of your billing period.
            </p>
            <p style={{ color: 'var(--text-secondary)', marginTop: '12px' }}>
              <strong>Lifetime Licenses:</strong> Lifetime purchases are one-time payments with no recurring charges.
            </p>
          </section>

          <section style={{ marginBottom: '24px' }}>
            <h2>4. Why No Refunds?</h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              Our service allows users to delete hundreds or thousands of emails in a short time. 
              Once emails are deleted, they cannot be recovered. This means users can fully test and use 
              the service within their free trial limit before deciding to pay.
            </p>
            <p style={{ color: 'var(--text-secondary)', marginTop: '12px' }}>
              Given the nature of our product (bulk email deletion), we cannot offer refunds after payment 
              as users have already received and used the service.
            </p>
          </section>

          <section style={{ marginBottom: '24px' }}>
            <h2>5. Contact Us</h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              For subscription inquiries, contact us at: <strong>reach@pendura.in</strong>
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}