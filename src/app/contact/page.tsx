'use client'

import Link from 'next/link'
import { useState } from 'react'
import styles from '../page.module.css'

export default function Contact() {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' })
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // For now, just show success - can integrate email service later
    setSubmitted(true)
  }

  return (
    <div className={styles.page}>
      <header className="header">
        <div className="container header-content">
          <Link href="/" className={styles.logoSection}>
            <div className={styles.logoIcon}>
              <span className="material-symbols-outlined">auto_delete</span>
            </div>
            <div>
              <div className={styles.logoText}>TrashFlow</div>
              <div className={styles.logoSubtext}>Precision Trashing</div>
            </div>
          </Link>
        </div>
      </header>

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 20px' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'center' }}>
          <div className="card" style={{ maxWidth: '600px', width: '100%' }}>
          <h1 className={styles.title}>Contact Us</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>We'd love to hear from you!</p>

          {submitted ? (
            <div style={{ padding: '24px', background: 'rgba(46, 125, 50, 0.1)', borderRadius: '8px', textAlign: 'center' }}>
              <p style={{ color: 'var(--primary)', fontWeight: '600' }}>Thank you for your message!</p>
              <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>We'll get back to you within 24-48 hours.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--on-surface)'
                  }}
                  placeholder="Your name"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--on-surface)'
                  }}
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Message</label>
                <textarea
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={5}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--on-surface)',
                    resize: 'vertical'
                  }}
                  placeholder="How can we help you?"
                />
              </div>

              <button
                type="submit"
                style={{
                  background: 'var(--primary)',
                  color: 'white',
                  border: 'none',
                  padding: '14px 24px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  marginTop: '8px'
                }}
              >
                Send Message
              </button>
            </form>
          )}

          <div style={{ marginTop: '40px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
            <h3 style={{ marginBottom: '16px' }}>Other ways to reach us:</h3>
            <p style={{ color: 'var(--text-secondary)' }}>
              <strong>Email:</strong> reach@pendura.in
            </p>
            <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
              <strong>Response Time:</strong> 24-48 hours on business days
            </p>
          </div>
          </div>
        </div>
      </main>
    </div>
  )
}