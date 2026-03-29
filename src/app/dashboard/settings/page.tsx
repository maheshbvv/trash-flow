'use client'

import { useSession, signOut } from 'next-auth/react'
import { useEffect, useState, useRef } from 'react'
import styles from './page.module.css'
import { load } from '@cashfreepayments/cashfree-js'

interface Schedule {
  id: string
  name: string
  fromEmail: string | null
  dateFrom: string | null
  dateTo: string | null
  isMarketing: boolean
  frequency: string
  isActive: boolean
  createdAt: string
  lastRunAt: string | null
}

interface Subscription {
  subscriptionType: string
  isPaid: boolean
  isTester: boolean
  isExpired: boolean
  deletionsUsed: number
  maxDeletions: number
  planName: string
  subscriptionStartDate: string | null
  subscriptionExpiryDate: string | null
  amountPaid: number | null
}

export default function Settings() {
  const { data: session } = useSession()
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    fromEmail: '',
    dateFrom: '',
    dateTo: '',
    isMarketing: false,
    frequency: 'weekly'
  })
  const [saving, setSaving] = useState(false)
  const [dailyReport, setDailyReport] = useState(true)
  const [criticalAlerts, setCriticalAlerts] = useState(true)
  const [showPricing, setShowPricing] = useState(false)
  const [upgrading, setUpgrading] = useState(false)
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null)
  const [cashfreeSdk, setCashfreeSdk] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [deleteScheduleId, setDeleteScheduleId] = useState<string | null>(null)
  const [isDeletingSchedule, setIsDeletingSchedule] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)

  useEffect(() => {
    fetchSchedules()
    fetchSubscription()
    initCashfree()
  }, [session])

  const initCashfree = async () => {
    try {
      const cf = await load({ mode: 'production' })
      setCashfreeSdk(cf)
    } catch (error) {
      console.error('Failed to load Cashfree SDK:', error)
    }
  }

  const fetchSubscription = async () => {
    try {
      const res = await fetch('/api/user/subscription')
      const data = await res.json()
      setSubscription(data)
    } catch (error) {
      console.error('Failed to fetch subscription:', error)
    }
  }

  const handlePayment = async (planId: string) => {
    setUpgrading(true)
    setError(null)
    try {
      const res = await fetch('/api/user/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId })
      })
      const data = await res.json()
      
      if (data.paymentSessionId && cashfreeSdk) {
        await cashfreeSdk.checkout({
          paymentSessionId: data.paymentSessionId,
          redirectTarget: '_self'
        })
      } else if (data.paymentLink) {
        window.location.href = data.paymentLink
      } else {
        const errorMsg = data.details || data.error || 'Failed to create payment order'
        setError(errorMsg + (data.debug ? ` (${JSON.stringify(data.debug)})` : ''))
        console.error('Payment error response:', data)
      }
    } catch (error) {
      console.error('Payment error:', error)
      setError('Failed to initiate payment')
    } finally {
      setUpgrading(false)
    }
  }

  const fetchSchedules = async () => {
    try {
      const res = await fetch('/api/user/schedules')
      const data = await res.json()
      setSchedules(data.schedules || [])
    } catch (error) {
      console.error('Failed to fetch schedules:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await fetch('/api/user/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await res.json()
      
      if (res.ok) {
        setShowForm(false)
        setFormData({
          name: '',
          fromEmail: '',
          dateFrom: '',
          dateTo: '',
          isMarketing: false,
          frequency: 'weekly'
        })
        fetchSchedules()
      } else if (data.upgradeRequired) {
        setToast({ message: 'Scheduling requires a paid subscription', type: 'error' })
        setShowPricing(true)
      } else {
        setToast({ message: data.error || 'Failed to save schedule', type: 'error' })
      }
    } catch (error) {
      console.error('Failed to save schedule:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteScheduleId) return
    setIsDeletingSchedule(true)
    try {
      await fetch(`/api/user/schedules?id=${deleteScheduleId}`, { method: 'DELETE' })
      setDeleteScheduleId(null)
      fetchSchedules()
    } catch (error) {
      console.error('Failed to delete schedule:', error)
      setToast({ message: 'Failed to delete schedule', type: 'error' })
    } finally {
      setIsDeletingSchedule(false)
    }
  }

  const handleRunNow = async (id: string) => {
    try {
      const res = await fetch('/api/user/schedules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleId: id })
      })
      const data = await res.json()
      if (data.success) {
        setToast({ message: `Successfully trashed ${data.trashed} emails!`, type: 'success' })
        fetchSchedules()
      } else {
        setToast({ message: data.error || 'Failed to run schedule', type: 'error' })
      }
    } catch (error) {
      console.error('Failed to run schedule:', error)
      setToast({ message: 'Failed to run schedule', type: 'error' })
    }
  }

  const getFrequencyLabel = (freq: string) => {
    const labels: Record<string, string> = {
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly'
    }
    return labels[freq] || freq
  }

  const handleVerifySubscription = async () => {
    setIsVerifying(true)
    try {
      const res = await fetch('/api/user/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verifySubscription: true })
      })
      const data = await res.json()
      
      if (data.success) {
        setToast({ message: `Subscription activated: ${data.subscription.subscriptionType}`, type: 'success' })
        // Fetch subscription multiple times to ensure update
        fetchSubscription()
        setTimeout(() => fetchSubscription(), 500)
      } else {
        setToast({ message: data.message || data.error || 'Verification failed', type: 'error' })
      }
    } catch (error) {
      setToast({ message: 'Failed to verify subscription', type: 'error' })
    } finally {
      setIsVerifying(false)
    }
  }

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading settings...</div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {toast && (
        <div className={`${styles.toast} ${toast.type === 'success' ? styles.toastSuccess : styles.toastError}`}>
          {toast.type === 'success' ? (
            <span className="material-symbols-outlined">check_circle</span>
          ) : (
            <span className="material-symbols-outlined">error</span>
          )}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Configuration Panel</h1>
        <p className={styles.subtitle}>
          Fine-tune your email preservation engine and security protocols.
        </p>
      </div>

      {/* Account Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionIcon}>
            <span className="material-symbols-outlined">account_circle</span>
          </div>
          <h2 className={styles.sectionTitle}>Account</h2>
        </div>
        
        <div className={styles.accountCard}>
          <div className={styles.accountInfo}>
            <div className={styles.avatarWrap}>
              <div className={styles.avatar}>
                <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>mail</span>
              </div>
            </div>
            <div>
              <p className={styles.accountLabel}>Connected Gmail</p>
              <p className={styles.accountEmail}>{session?.user?.email}</p>
              <p className={styles.accountMeta}>Last synced: Just now</p>
            </div>
          </div>
          <button onClick={() => signOut({ callbackUrl: '/' })} className={styles.switchBtn}>
            Switch Account
          </button>
        </div>
      </section>

      {/* Subscription Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionIcon}>
            <span className="material-symbols-outlined">workspace_premium</span>
          </div>
          <h2 className={styles.sectionTitle}>Subscription</h2>
        </div>
        
        <div className={styles.formCard}>
          {subscription?.isPaid && !subscription?.isExpired ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <p style={{ fontSize: '20px', fontWeight: '700', color: 'var(--primary)' }}>
                      {subscription?.planName}
                    </p>
                    <span style={{ 
                      background: '#10b981', 
                      color: 'white', 
                      fontSize: '11px', 
                      padding: '4px 10px', 
                      borderRadius: '20px',
                      fontWeight: '600'
                    }}>
                      ACTIVE
                    </span>
                  </div>
                  <p style={{ color: '#10b981', fontWeight: '500', marginTop: '6px' }}>
                    Unlimited deletions
                  </p>
                </div>
              </div>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
                gap: '12px',
                marginTop: '8px',
                padding: '16px',
                background: 'var(--surface-container-high)',
                borderRadius: '12px'
              }}>
                <div>
                  <p style={{ color: 'var(--on-surface-variant)', fontSize: '12px', marginBottom: '4px' }}>Amount Paid</p>
                  <p style={{ fontWeight: '600' }}>₹{subscription.amountPaid || 0}</p>
                </div>
                <div>
                  <p style={{ color: 'var(--on-surface-variant)', fontSize: '12px', marginBottom: '4px' }}>Start Date</p>
                  <p style={{ fontWeight: '600' }}>{subscription.subscriptionStartDate ? new Date(subscription.subscriptionStartDate).toLocaleDateString() : '-'}</p>
                </div>
                <div>
                  <p style={{ color: 'var(--on-surface-variant)', fontSize: '12px', marginBottom: '4px' }}>{subscription.planName === 'Lifetime' ? 'Valid Till' : 'Expires On'}</p>
                  <p style={{ fontWeight: '600' }}>{subscription.subscriptionExpiryDate ? new Date(subscription.subscriptionExpiryDate).toLocaleDateString() : '-'}</p>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <p style={{ fontSize: '20px', fontWeight: '700' }}>
                    {subscription?.maxDeletions === -1 ? 'Free Plan' : 'Free Trial'}
                  </p>
                  {subscription?.isExpired && (
                    <span style={{ 
                      background: 'var(--error)', 
                      color: 'white', 
                      fontSize: '11px', 
                      padding: '4px 10px', 
                      borderRadius: '20px',
                      fontWeight: '600'
                    }}>
                      EXPIRED
                    </span>
                  )}
                </div>
                <p style={{ color: 'var(--on-surface-variant)', marginTop: '6px' }}>
                  {subscription?.maxDeletions === -1 
                    ? 'Unlimited deletions (tester)' 
                    : `${subscription?.deletionsUsed || 0} / ${subscription?.maxDeletions || 100} deletions used`}
                </p>
              </div>
              {(!subscription?.isPaid || subscription?.isExpired) && (
                <button 
                  onClick={() => setShowPricing(true)}
                  style={{
                    background: 'var(--primary)',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {subscription?.isExpired ? 'Renew' : 'Upgrade'}
                </button>
              )}
              {subscription?.isPaid && !subscription?.isExpired && (
                <button 
                  onClick={handleVerifySubscription}
                  disabled={isVerifying}
                  style={{
                    background: 'var(--surface-container-high)',
                    color: 'var(--on-surface)',
                    border: '1px solid var(--outline)',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    cursor: isVerifying ? 'not-allowed' : 'pointer',
                    fontWeight: '500',
                    fontSize: '14px'
                  }}
                >
                  {isVerifying ? 'Verifying...' : 'Verify'}
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Pricing Modal */}
      {showPricing && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'var(--surface)',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '420px',
            width: '90%'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>Choose Your Plan</h2>
              <button 
                onClick={() => {
                  setShowPricing(false)
                  setCheckoutUrl(null)
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  color: 'var(--on-surface-variant)'
                }}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            {error && (
              <div style={{ 
                marginBottom: '16px', 
                padding: '12px', 
                border: '1px solid var(--error)', 
                borderRadius: '8px', 
                background: 'var(--error-container)',
                color: 'var(--error)',
                fontSize: '14px'
              }}>
                {error}
              </div>
            )}
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div 
                style={{ 
                  padding: '20px', 
                  border: '1px solid var(--outline)', 
                  borderRadius: '16px',
                  background: 'var(--surface-container-high)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div>
                    <p style={{ fontWeight: '600', fontSize: '16px' }}>Free Trial</p>
                    <p style={{ color: 'var(--on-surface-variant)', fontSize: '13px', marginTop: '4px' }}>500 deletions total</p>
                  </div>
                  <span style={{ fontWeight: '600', color: 'var(--on-surface-variant)', fontSize: '14px' }}>Free</span>
                </div>
              </div>

              <div 
                onClick={() => handlePayment('yearly')}
                style={{ 
                  padding: '20px', 
                  border: '2px solid var(--primary)', 
                  borderRadius: '16px',
                  background: 'rgba(187, 134, 252, 0.08)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <p style={{ fontWeight: '600', fontSize: '16px', color: 'var(--primary)' }}>Yearly</p>
                      <span style={{ 
                        background: 'var(--primary)', 
                        color: 'white', 
                        fontSize: '10px', 
                        padding: '2px 8px', 
                        borderRadius: '10px',
                        fontWeight: '600'
                      }}>POPULAR</span>
                    </div>
                    <p style={{ color: 'var(--on-surface-variant)', fontSize: '13px', marginTop: '4px' }}>Unlimited deletions for 1 year</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontWeight: '700', color: 'var(--primary)', fontSize: '18px' }}>₹1,499</span>
                    <p style={{ color: 'var(--on-surface-variant)', fontSize: '12px' }}>/year</p>
                  </div>
                </div>
              </div>

              <div 
                onClick={() => handlePayment('lifetime')}
                style={{ 
                  padding: '20px', 
                  border: '1px solid var(--primary)', 
                  borderRadius: '16px',
                  background: 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontWeight: '600', fontSize: '16px' }}>Lifetime</p>
                    <p style={{ color: 'var(--on-surface-variant)', fontSize: '13px', marginTop: '4px' }}>Pay once, use forever</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontWeight: '700', fontSize: '18px' }}>₹4,499</span>
                    <p style={{ color: 'var(--on-surface-variant)', fontSize: '12px' }}>one-time</p>
                  </div>
                </div>
              </div>
            </div>

            <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--on-surface-variant)', marginTop: '20px' }}>
              Secure payment powered by Cashfree
            </p>

            {checkoutUrl && (
              <div style={{ marginTop: '20px', height: '400px' }}>
                <iframe 
                  src={checkoutUrl}
                  style={{ width: '100%', height: '100%', border: 'none', borderRadius: '8px' }}
                  title="Checkout"
                  onLoad={() => {
                    // Listen for success redirect
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notification Preferences */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionIcon}>
            <span className="material-symbols-outlined">notifications_active</span>
          </div>
          <h2 className={styles.sectionTitle}>Notification Preferences</h2>
        </div>

        <div className={styles.toggleGrid}>
          <div className={styles.toggleCard}>
            <div>
              <h4 className={styles.toggleTitle}>Daily Report</h4>
              <p className={styles.toggleDesc}>Receive a morning summary of all curated and trashed emails.</p>
            </div>
            <label className={styles.toggle}>
              <input 
                type="checkbox" 
                checked={dailyReport}
                onChange={(e) => setDailyReport(e.target.checked)}
              />
              <span className={styles.toggleSlider}></span>
            </label>
          </div>

          <div className={styles.toggleCard}>
            <div>
              <h4 className={styles.toggleTitle}>Critical Alerts</h4>
              <p className={styles.toggleDesc}>Instant alerts when system detects high-value data at risk.</p>
            </div>
            <label className={styles.toggle}>
              <input 
                type="checkbox" 
                checked={criticalAlerts}
                onChange={(e) => setCriticalAlerts(e.target.checked)}
              />
              <span className={styles.toggleSlider}></span>
            </label>
          </div>
        </div>
      </section>

      {/* Danger Zone */}
      <section className={styles.dangerZone}>
        <div className={styles.dangerHeader}>
          <span className="material-symbols-outlined">warning</span>
          <h3>Danger Zone</h3>
        </div>
        <div className={styles.dangerContent}>
          <div>
            <p className={styles.dangerTitle}>Deactivate Account</p>
            <p className={styles.dangerDesc}>This will clear all operations, schedules, and history. Your account and subscription remain active.</p>
          </div>
            <button 
            className={styles.dangerBtn}
            onClick={async () => {
              const res = await fetch('/api/user/delete', { method: 'DELETE' })
              if (res.ok) {
                setToast({ message: 'All data cleared. Your account remains active.', type: 'success' })
                window.location.reload()
              } else {
                setToast({ message: 'Failed to delete data', type: 'error' })
              }
            }}
          >
            Clear All Data
          </button>
        </div>
      </section>
    </div>
  )
}
