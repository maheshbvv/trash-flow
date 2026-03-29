'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import styles from './page.module.css'

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
  isPaid: boolean
  isTester: boolean
  isExpired: boolean
}

interface EmailCountResponse {
  count: number
  query?: string
}

interface TrashResponse {
  success: boolean
  trashed: number
  message: string
  upgradeRequired?: boolean
}

export default function TrashRules() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [mode, setMode] = useState<'sender' | 'marketing' | 'schedules'>('sender')
  const [from, setFrom] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [emailCount, setEmailCount] = useState<number | null>(null)
  const [isLoadingCount, setIsLoadingCount] = useState(false)
  const [trashResult, setTrashResult] = useState<TrashResponse | null>(null)
  const [showWarning1, setShowWarning1] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | React.ReactNode>('')
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [scheduleType, setScheduleType] = useState<'sender' | 'marketing' | null>(null)
  const [scheduleEmail, setScheduleEmail] = useState('')
  const [scheduleFrequency, setScheduleFrequency] = useState('weekly')
  const [creatingSchedule, setCreatingSchedule] = useState(false)
  const [scheduleError, setScheduleError] = useState('')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [deleteScheduleId, setDeleteScheduleId] = useState<string | null>(null)
  const [isDeletingSchedule, setIsDeletingSchedule] = useState(false)

  useEffect(() => {
    const type = searchParams.get('type')
    if (type === 'marketing') {
      setMode('marketing')
    }
  }, [searchParams])

  useEffect(() => {
    if (session?.user) {
      fetchSchedules()
      fetchSubscription()
    }
  }, [session])

  const fetchSchedules = async () => {
    try {
      const res = await fetch('/api/user/schedules')
      const data = await res.json()
      setSchedules(data.schedules || [])
    } catch (error) {
      console.error('Failed to fetch schedules:', error)
    }
  }

  const fetchSubscription = async () => {
    try {
      const res = await fetch('/api/user/subscription')
      const data = await res.json()
      setSubscription({
        isPaid: data.isPaid || false,
        isTester: data.isTester || false,
        isExpired: data.isExpired || false
      })
    } catch (error) {
      console.error('Failed to fetch subscription:', error)
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

  const getFrequencyLabel = (freq: string) => {
    const labels: Record<string, string> = {
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly'
    }
    return labels[freq] || freq
  }

  const handleCreateSchedule = async () => {
    if (scheduleType === 'sender' && !scheduleEmail) {
      setScheduleError('Please enter an email address')
      return
    }
    
    setScheduleError('')
    setCreatingSchedule(true)

    try {
      const name = scheduleType === 'marketing' 
        ? `Marketing Cleanup (${scheduleFrequency === 'weekly' ? 'Weekly' : 'Monthly'})`
        : `From ${scheduleEmail} (${scheduleFrequency === 'weekly' ? 'Weekly' : 'Monthly'})`

      const res = await fetch('/api/user/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          fromEmail: scheduleType === 'sender' ? scheduleEmail : null,
          isMarketing: scheduleType === 'marketing',
          frequency: scheduleFrequency
        })
      })

      const data = await res.json()

      if (res.ok) {
        setShowScheduleModal(false)
        setScheduleType(null)
        setScheduleEmail('')
        setScheduleFrequency('weekly')
        fetchSchedules()
      } else if (data.upgradeRequired) {
        setScheduleError('Scheduling requires a paid subscription')
      } else {
        setScheduleError(data.error || 'Failed to create schedule')
      }
    } catch (error) {
      setScheduleError('Failed to create schedule')
    } finally {
      setCreatingSchedule(false)
    }
  }

  const resetScheduleModal = () => {
    setShowScheduleModal(false)
    setScheduleType(null)
    setScheduleEmail('')
    setScheduleFrequency('weekly')
    setScheduleError('')
  }

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const canAccessSchedules = subscription && (subscription.isTester || (subscription.isPaid && !subscription.isExpired))

  const checkEmailCount = async () => {
    if (mode === 'sender' && !from && !dateFrom && !dateTo) {
      setError('Please add at least one filter')
      return
    }

    if (mode === 'marketing' && !dateFrom && !dateTo) {
      setError('Please select a date range for marketing emails')
      return
    }

    setError('')
    setIsLoadingCount(true)
    setEmailCount(null)
    setTrashResult(null)

    try {
      const res = await fetch('/api/emails/count', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sender: mode === 'sender' ? from : undefined,
          after: dateFrom,
          before: dateTo,
          isMarketing: mode === 'marketing'
        })
      })
      
      const data: EmailCountResponse = await res.json()
      
      if (!res.ok) {
        throw new Error(data.count ? String(data.count) : 'Failed to count emails')
      }
      
      setEmailCount(data.count)
      
      await fetch('/api/user/operation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'search',
          filters: JSON.stringify({ from, dateFrom, dateTo, isMarketing: mode === 'marketing' }),
          emailCount: data.count
        })
      })
    } catch (err) {
      setError('Failed to count emails. Please try again.')
    } finally {
      setIsLoadingCount(false)
    }
  }

  const handleTrash = async () => {
    setShowWarning1(false)
    setIsDeleting(true)
    setTrashResult(null)
    setError('')

    try {
      const res = await fetch('/api/emails/trash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sender: mode === 'sender' ? from : undefined,
          after: dateFrom,
          before: dateTo,
          isMarketing: mode === 'marketing'
        })
      })
      
      const data: TrashResponse = await res.json()
      
      if (!res.ok) {
        if (data.upgradeRequired) {
          throw new Error(data.message + '|' + 'upgrade')
        }
        throw new Error(data.message || 'Failed to trash emails')
      }
      
      setTrashResult(data)
      setEmailCount(null)

      await fetch('/api/user/operation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'delete',
          filters: JSON.stringify({ from, dateFrom, dateTo, isMarketing: mode === 'marketing' }),
          emailCount: data.trashed
        })
      })
      
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err: any) {
      console.error("Trash error:", err)
      const errMsg = err?.message || 'Failed to trash emails. Please try again.'
      const isUpgradeRequired = errMsg.includes('|upgrade')
      const cleanMsg = errMsg.replace('|upgrade', '')
      
      if (isUpgradeRequired) {
        setError(
          <div>
            <p>{cleanMsg}</p>
            <button
              onClick={() => router.push('/dashboard/settings')}
              style={{
                marginTop: '12px',
                background: 'var(--primary)',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Upgrade Now
            </button>
          </div>
        )
      } else {
        setError(cleanMsg)
      }
    } finally {
      setIsDeleting(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
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

      <div className={styles.header}>
        <h1 className={styles.title}>Bulk Trash Emails</h1>
        <p className={styles.subtitle}>
          Effortlessly declutter your inbox by purging unwanted messages.
        </p>
      </div>

      {trashResult && (
        <div className="success-banner" style={{ marginBottom: '32px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#10b981' }}>check_circle</span>
          <div>
            <p><strong>Successfully trashed {trashResult.trashed} emails</strong></p>
            <p style={{ opacity: 0.8, fontSize: '14px' }}>
              {mode === 'marketing' ? 'Marketing emails' : from ? `from '${from}'` : ''} deleted successfully
            </p>
          </div>
        </div>
      )}

      <div className={styles.modeToggle}>
        <button 
          className={`${styles.modeBtn} ${mode === 'sender' ? styles.active : ''}`}
          onClick={() => { setMode('sender'); setEmailCount(null); setTrashResult(null); }}
        >
          <span className="material-symbols-outlined">person</span>
          By Sender
        </button>
        <button 
          className={`${styles.modeBtn} ${mode === 'marketing' ? styles.active : ''}`}
          onClick={() => { setMode('marketing'); setEmailCount(null); setTrashResult(null); }}
        >
          <span className="material-symbols-outlined">campaign</span>
          Marketing Emails
        </button>
        {canAccessSchedules && (
          <button 
            className={`${styles.modeBtn} ${mode === 'schedules' ? styles.active : ''}`}
            onClick={() => { setMode('schedules'); setEmailCount(null); setTrashResult(null); }}
          >
            <span className="material-symbols-outlined">schedule</span>
            Schedules
          </button>
        )}
      </div>

      <div className="warning-box">
        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", marginTop: '4px' }}>
          warning
        </span>
        <div>
          <div className="warning-title">Important Safety Notice</div>
          <p className="warning-text">
            Emails moved to Trash will be <strong>permanently deleted by Google after 30 days</strong>. 
            Please verify your search criteria before executing.
          </p>
        </div>
      </div>

      <div className="card">
        <div className={styles.form}>
          {mode === 'sender' && (
            <div className="form-group">
              <label className="label">From (Sender Email)</label>
              <input
                type="email"
                className="input"
                placeholder="example@newsletter.com"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
          )}

          {mode === 'marketing' && (
            <div className={styles.marketingInfo}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#E65100' }}>campaign</span>
              <h3>Delete Marketing Emails</h3>
              <p>We detect marketing emails based on:</p>
              <ul>
                <li>Subject lines containing: promotion, sale, discount, offer, deal, free, shop</li>
                <li>Sender addresses containing: newsletter, marketing, promo, offers</li>
                <li>Emails categorized as &quot;Promotions&quot; by Gmail</li>
              </ul>
            </div>
          )}

          {mode === 'schedules' && (
            <div className={styles.marketingInfo}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#005bbf' }}>schedule</span>
              <h3>Scheduled Cleanups</h3>
              <p>Your automated email cleanup schedules</p>
            </div>
          )}

          {mode === 'schedules' && canAccessSchedules && (
            <div style={{ marginTop: '24px' }}>
              <button
                onClick={() => setShowScheduleModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '14px',
                  background: 'var(--primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '15px'
                }}
              >
                <span className="material-symbols-outlined">add</span>
                Add New Schedule
              </button>
            </div>
          )}

          {mode === 'schedules' && schedules.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              {schedules.map((schedule) => (
                <div key={schedule.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px',
                  background: 'var(--surface-container-low)',
                  borderRadius: '12px',
                  marginBottom: '12px'
                }}>
                  <div>
                    <div style={{ fontWeight: '600' }}>{schedule.name}</div>
                    <div style={{ fontSize: '13px', color: 'var(--on-surface-variant)', marginTop: '4px' }}>
                      {getFrequencyLabel(schedule.frequency)}
                      {schedule.lastRunAt && <> · Last run: {new Date(schedule.lastRunAt).toLocaleDateString()}</>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleRunNow(schedule.id)}
                      style={{
                        padding: '8px 16px',
                        background: 'var(--primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '13px'
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px', verticalAlign: 'middle' }}>play_arrow</span>
                      Run
                    </button>
                    <button
                      onClick={() => setDeleteScheduleId(schedule.id)}
                      style={{
                        padding: '8px 16px',
                        background: 'var(--error-container)',
                        color: 'var(--error)',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '13px'
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px', verticalAlign: 'middle' }}>delete</span>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {mode === 'schedules' && schedules.length === 0 && (
            <div style={{ marginTop: '24px', textAlign: 'center', color: 'var(--on-surface-variant)' }}>
              <p>No scheduled cleanups yet.</p>
              <p style={{ fontSize: '13px' }}>Create schedules in Settings to automate your email cleanup.</p>
            </div>
          )}

          <div className="date-grid">
            <div className="form-group">
              <label className="label">Date From (Optional)</label>
              <input
                type="date"
                className="input"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="label">Date To (Optional)</label>
              <input
                type="date"
                className="input"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className="cta-section">
            <div className="cta-info">
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>info</span>
              <span>Scan results will appear below before final confirmation</span>
            </div>
            <button
              onClick={checkEmailCount}
              disabled={isLoadingCount || isDeleting}
              className="btn btn-primary"
            >
              {isLoadingCount ? (
                <>
                  <span className="spinner"></span>
                  Counting...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">search</span>
                  Check Email Count
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {emailCount !== null && (
        <div className={styles.result}>
          <p className={styles.countResult}>
            Found <strong>{emailCount}</strong> email{emailCount !== 1 ? 's' : ''} matching your criteria
          </p>
          
          <div className="warning-box">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", marginTop: '4px', color: 'var(--tertiary)' }}>
              warning
            </span>
            <div>
              <div className="warning-title" style={{ color: 'var(--tertiary)' }}>Warning</div>
              <p className="warning-text">
                You are about to move <strong>{emailCount}</strong> email{emailCount !== 1 ? 's' : ''} to trash.
                {mode === 'sender' && from && <><br /><strong>From:</strong> {from}</>}
                {mode === 'marketing' && <><br /><strong>Type:</strong> Marketing Emails</>}
                {dateFrom && <><br /><strong>From Date:</strong> {dateFrom}</>}
                {dateTo && <><br /><strong>To Date:</strong> {dateTo}</>}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowWarning1(true)}
            disabled={isDeleting}
            className="btn btn-tertiary"
            style={{ width: '100%', marginTop: '24px' }}
          >
            <span className="material-symbols-outlined">delete</span>
            Trash {emailCount} Email{emailCount !== 1 ? 's' : ''}
          </button>
        </div>
      )}

      {showWarning1 && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className="warning-box">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", fontSize: '28px' }}>
                warning
              </span>
              <div>
                <div className="warning-title">Final Confirmation</div>
                <p className="warning-text">
                  Are you sure you want to move <strong>{emailCount}</strong> email{emailCount !== 1 ? 's' : ''} to trash?
                  <br /><br />
                  This action <strong>cannot be undone</strong> from this app.
                </p>
              </div>
            </div>
            <div className={styles.modalActions}>
              <button 
                onClick={() => {
                  setShowWarning1(false)
                  handleTrash()
                }} 
                className="btn btn-tertiary"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <span className="spinner"></span>
                    Trashing...
                  </>
                ) : (
                  'Yes, Trash Emails'
                )}
              </button>
              <button 
                onClick={() => setShowWarning1(false)} 
                className="btn btn-outline"
                disabled={isDeleting}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {isDeleting && (
        <div className={styles.modal}>
          <div className={styles.progressModal}>
            <div className={styles.circularSpinner}>
              <div className={styles.spinnerCircle}></div>
            </div>
            <h2 className={styles.progressTitle}>Trashing Your Emails</h2>
            <p className={styles.progressMessage}>
              <strong>Do not close this window</strong> until the operation is complete.
            </p>
            <p className={styles.progressSubMessage}>
              Processing {emailCount} email{emailCount !== 1 ? 's' : ''}...
            </p>
          </div>
        </div>
      )}

      {showScheduleModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            {!scheduleType ? (
              <>
                <h2 style={{ fontSize: '20px', marginBottom: '24px', textAlign: 'center' }}>Create New Schedule</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <button
                    onClick={() => setScheduleType('sender')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      padding: '20px',
                      background: 'var(--surface-container-high)',
                      border: '1px solid var(--outline)',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--primary)' }}>person</span>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '16px' }}>By Sender</div>
                      <div style={{ color: 'var(--on-surface-variant)', fontSize: '14px' }}>Schedule cleanup for emails from a specific sender</div>
                    </div>
                  </button>
                  <button
                    onClick={() => setScheduleType('marketing')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      padding: '20px',
                      background: 'var(--surface-container-high)',
                      border: '1px solid var(--outline)',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#E65100' }}>campaign</span>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '16px' }}>Marketing</div>
                      <div style={{ color: 'var(--on-surface-variant)', fontSize: '14px' }}>Schedule cleanup for marketing and promotional emails</div>
                    </div>
                  </button>
                </div>
                <button 
                  onClick={resetScheduleModal}
                  className="btn btn-outline"
                  style={{ marginTop: '20px', width: '100%' }}
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <h2 style={{ fontSize: '20px', marginBottom: '24px', textAlign: 'center' }}>
                  {scheduleType === 'sender' ? 'Schedule By Sender' : 'Schedule Marketing Cleanup'}
                </h2>
                
                {scheduleType === 'sender' && (
                  <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label className="label">Sender Email</label>
                    <input
                      type="email"
                      className="input"
                      placeholder="example@newsletter.com"
                      value={scheduleEmail}
                      onChange={(e) => setScheduleEmail(e.target.value)}
                    />
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="label">Frequency</label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={() => setScheduleFrequency('weekly')}
                      style={{
                        flex: 1,
                        padding: '14px',
                        background: scheduleFrequency === 'weekly' ? 'var(--primary)' : 'var(--surface-container-high)',
                        color: scheduleFrequency === 'weekly' ? 'white' : 'var(--on-surface)',
                        border: `1px solid ${scheduleFrequency === 'weekly' ? 'var(--primary)' : 'var(--outline)'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '600'
                      }}
                    >
                      Weekly
                    </button>
                    <button
                      onClick={() => setScheduleFrequency('monthly')}
                      style={{
                        flex: 1,
                        padding: '14px',
                        background: scheduleFrequency === 'monthly' ? 'var(--primary)' : 'var(--surface-container-high)',
                        color: scheduleFrequency === 'monthly' ? 'white' : 'var(--on-surface)',
                        border: `1px solid ${scheduleFrequency === 'monthly' ? 'var(--primary)' : 'var(--outline)'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '600'
                      }}
                    >
                      Monthly
                    </button>
                  </div>
                </div>

                {scheduleError && (
                  <div style={{ 
                    marginBottom: '16px', 
                    padding: '12px', 
                    border: '1px solid var(--error)', 
                    borderRadius: '8px', 
                    background: 'var(--error-container)',
                    color: 'var(--error)',
                    fontSize: '14px'
                  }}>
                    {scheduleError}
                  </div>
                )}

                <button
                  onClick={handleCreateSchedule}
                  disabled={creatingSchedule}
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                >
                  {creatingSchedule ? (
                    <>
                      <span className="spinner"></span>
                      Creating...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined">schedule</span>
                      Create Schedule
                    </>
                  )}
                </button>
                <button 
                  onClick={() => { setScheduleType(null); setScheduleError(''); }}
                  className="btn btn-outline"
                  style={{ marginTop: '12px', width: '100%' }}
                >
                  Back
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {deleteScheduleId && (
        <div className={styles.modal}>
          <div className={styles.modalContent} style={{ textAlign: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--error)', marginBottom: '16px' }}>delete_warning</span>
            <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>Delete Schedule?</h2>
            <p style={{ color: 'var(--on-surface-variant)', marginBottom: '24px' }}>
              Are you sure you want to delete this schedule? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleDelete}
                disabled={isDeletingSchedule}
                style={{
                  flex: 1,
                  padding: '14px',
                  background: 'var(--error)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                {isDeletingSchedule ? (
                  <>
                    <span className="spinner"></span>
                    Deleting...
                  </>
                ) : (
                  'Delete Schedule'
                )}
              </button>
              <button
                onClick={() => setDeleteScheduleId(null)}
                disabled={isDeletingSchedule}
                className="btn btn-outline"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
