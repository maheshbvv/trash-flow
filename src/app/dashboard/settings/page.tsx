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
  deletionsUsed: number
  maxDeletions: number
  planName: string
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
      }
    } catch (error) {
      console.error('Failed to save schedule:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return

    try {
      await fetch(`/api/user/schedules?id=${id}`, { method: 'DELETE' })
      fetchSchedules()
    } catch (error) {
      console.error('Failed to delete schedule:', error)
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

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading settings...</div>
      </div>
    )
  }

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toast])

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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <p style={{ fontSize: '18px', fontWeight: '600' }}>{subscription?.planName || 'Free Trial'}</p>
              <p style={{ color: 'var(--on-surface-variant)', marginTop: '4px' }}>
                {subscription?.maxDeletions === -1 
                  ? 'Unlimited deletions' 
                  : `${subscription?.deletionsUsed || 0} / ${subscription?.maxDeletions || 100} deletions used`}
              </p>
            </div>
            {!subscription?.isPaid && subscription?.maxDeletions !== -1 && (
              <button 
                onClick={() => setShowPricing(true)}
                style={{
                  background: 'var(--primary)',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Upgrade
              </button>
            )}
          </div>
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
            padding: '32px',
            maxWidth: '500px',
            width: '90%'
          }}>
            <h2 style={{ fontSize: '24px', marginBottom: '24px', textAlign: 'center' }}>Choose Your Plan</h2>
            
            {error && (
              <div style={{ 
                marginBottom: '16px', 
                padding: '12px', 
                border: '1px solid #dc2626', 
                borderRadius: '8px', 
                background: '#fef2f2',
                color: '#dc2626',
                fontSize: '14px'
              }}>
                {error}
              </div>
            )}
            
            <div style={{ marginBottom: '16px', padding: '16px', border: '1px solid var(--outline)', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontWeight: '600' }}>Free Trial</p>
                  <p style={{ color: 'var(--on-surface-variant)', fontSize: '14px' }}>100 deletions total</p>
                </div>
                <span style={{ fontWeight: '600', color: 'var(--primary)' }}>Free</span>
              </div>
            </div>

            <div style={{ marginBottom: '16px', padding: '16px', border: '1px solid var(--primary)', borderRadius: '12px', background: 'rgba(187,23,18,0.05)', cursor: 'pointer' }} onClick={() => handlePayment('yearly')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontWeight: '600' }}>Yearly</p>
                  <p style={{ color: 'var(--on-surface-variant)', fontSize: '14px' }}>Unlimited deletions</p>
                </div>
                <span style={{ fontWeight: '600', color: 'var(--primary)' }}>₹1,499/year</span>
              </div>
            </div>

            <div style={{ marginBottom: '24px', padding: '16px', border: '1px solid var(--primary)', borderRadius: '12px', background: 'rgba(187,23,18,0.05)', cursor: 'pointer' }} onClick={() => handlePayment('lifetime')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontWeight: '600' }}>Lifetime</p>
                  <p style={{ color: 'var(--on-surface-variant)', fontSize: '14px' }}>One-time payment</p>
                </div>
                <span style={{ fontWeight: '600', color: 'var(--primary)' }}>₹3,000</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                onClick={() => {
                  setShowPricing(false)
                  setCheckoutUrl(null)
                }}
                style={{
                  background: 'transparent',
                  color: 'var(--on-surface)',
                  border: '1px solid var(--outline)',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>

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

      {/* Scheduled Cleanups */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionIcon}>
            <span className="material-symbols-outlined">schedule</span>
          </div>
          <h2 className={styles.sectionTitle}>Scheduled Cleanups</h2>
        </div>

        {showForm && (
          <div className={styles.formCard}>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="label">Schedule Name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g., Weekly Newsletter Cleanup"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>

              <div className={styles.formRow}>
                <div className="form-group">
                  <label className="label">Type</label>
                  <select 
                    className="input"
                    value={formData.isMarketing ? 'marketing' : 'sender'}
                    onChange={(e) => setFormData({...formData, isMarketing: e.target.value === 'marketing'})}
                  >
                    <option value="sender">By Sender</option>
                    <option value="marketing">Marketing Emails</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="label">Frequency</label>
                  <select 
                    className="input"
                    value={formData.frequency}
                    onChange={(e) => setFormData({...formData, frequency: e.target.value})}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>

              {!formData.isMarketing && (
                <div className="form-group">
                  <label className="label">Sender Email (Optional)</label>
                  <input
                    type="email"
                    className="input"
                    placeholder="e.g., newsletter@example.com"
                    value={formData.fromEmail}
                    onChange={(e) => setFormData({...formData, fromEmail: e.target.value})}
                  />
                </div>
              )}

              <div className={styles.formRow}>
                <div className="form-group">
                  <label className="label">Date From</label>
                  <input
                    type="date"
                    className="input"
                    value={formData.dateFrom}
                    onChange={(e) => setFormData({...formData, dateFrom: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="label">Date To</label>
                  <input
                    type="date"
                    className="input"
                    value={formData.dateTo}
                    onChange={(e) => setFormData({...formData, dateTo: e.target.value})}
                  />
                </div>
              </div>

              <div className={styles.formActions}>
                <button 
                  type="button" 
                  onClick={() => setShowForm(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Schedule'}
                </button>
              </div>
            </form>
          </div>
        )}

        {!showForm && (
          <button onClick={() => setShowForm(true)} className={styles.addScheduleBtn}>
            <span className="material-symbols-outlined">add</span>
            Add Schedule
          </button>
        )}

        {schedules.length > 0 && (
          <div className={styles.scheduleList}>
            {schedules.map((schedule) => (
              <div key={schedule.id} className={styles.scheduleItem}>
                <div className={styles.scheduleIcon}>
                  <span className="material-symbols-outlined">
                    {schedule.isMarketing ? 'campaign' : 'auto_delete'}
                  </span>
                </div>
                <div className={styles.scheduleContent}>
                  <div className={styles.scheduleName}>{schedule.name}</div>
                  <div className={styles.scheduleMeta}>
                    {getFrequencyLabel(schedule.frequency)}
                    {schedule.lastRunAt && <> · Last run: {new Date(schedule.lastRunAt).toLocaleDateString()}</>}
                  </div>
                </div>
                <button 
                  onClick={() => handleRunNow(schedule.id)}
                  className={styles.runNowBtn}
                  title="Run now"
                >
                  <span className="material-symbols-outlined">play_arrow</span>
                </button>
                <button 
                  onClick={() => handleDelete(schedule.id)}
                  className={styles.deleteBtn}
                >
                  <span className="material-symbols-outlined">delete</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

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
