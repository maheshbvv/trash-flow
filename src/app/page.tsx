'use client'

import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect } from 'react'
import styles from './page.module.css'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (session) {
      router.push('/dashboard')
    }
  }, [session, router])

  if (status === 'loading') {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <header className="header">
        <div className="container header-content">
          <div className="logo">
            <svg className="logo-icon" viewBox="0 0 24 24" fill="none">
              <path d="M19 4H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zM5 8l7 5 7-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            TrashFlow
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <div className="card">
          <h1 className={styles.title}>TrashFlow</h1>
          <p className={styles.subtitle}>
            Clean your Gmail inbox in seconds. Remove emails from specific senders or date ranges with precision.
          </p>

          <div className="warning-box">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", marginTop: '4px' }}>
              warning
            </span>
            <div>
              <div className="warning-title">Important Notice</div>
              <p className="warning-text">
                This app requires access to your Gmail account to search and move emails to trash. 
                We only store your email address for account purposes - we do not read or collect 
                any emails from your inbox.
              </p>
            </div>
          </div>

          <button 
            onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '32px', fontSize: '16px', padding: '16px 32px' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>

          <div className={styles.features}>
            <div className={styles.feature}>
              <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--primary)' }}>
                mail
              </span>
              <h3>Filter by Sender</h3>
              <p>Delete all emails from specific email addresses</p>
            </div>
            <div className={styles.feature}>
              <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--primary)' }}>
                calendar_month
              </span>
              <h3>Filter by Date</h3>
              <p>Delete emails from specific date ranges</p>
            </div>
            <div className={styles.feature}>
              <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--primary)' }}>
                tune
              </span>
              <h3>Combine Filters</h3>
              <p>Use sender + date together for precision</p>
            </div>
          </div>

          <div className={styles.pricing}>
            <h2>Pricing (INR)</h2>
            <div className={styles.priceRow}>
              <div className={styles.priceCard}>
                <h3>Free Trial</h3>
                <p className={styles.price}>₹0</p>
                <p>500 deletions</p>
              </div>
              <div className={styles.priceCard}>
                <h3>Yearly</h3>
                <p className={styles.price}>₹1,499<span>/year</span></p>
                <p>Unlimited</p>
              </div>
              <div className={styles.priceCard}>
                <h3>Lifetime</h3>
                <p className={styles.price}>₹3,000</p>
                <p>One-time</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="footer">
        <div className="container footer-content">
          <span className="footer-text">© 2026 TrashFlow. All rights reserved.</span>
          <div className="footer-links">
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Service</Link>
            <Link href="/refunds">Refunds</Link>
            <Link href="/contact">Contact Us</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
