'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import styles from './page.module.css'

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
  
  const [mode, setMode] = useState<'sender' | 'marketing'>('sender')
  const [from, setFrom] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [emailCount, setEmailCount] = useState<number | null>(null)
  const [isLoadingCount, setIsLoadingCount] = useState(false)
  const [trashResult, setTrashResult] = useState<TrashResponse | null>(null)
  const [showWarning1, setShowWarning1] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | React.ReactNode>('')

  useEffect(() => {
    const type = searchParams.get('type')
    if (type === 'marketing') {
      setMode('marketing')
    }
  }, [searchParams])

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
      <div className={styles.header}>
        <h1 className={styles.title}>Bulk Trash Emails</h1>
        <p className={styles.subtitle}>
          Effortlessly declutter your inbox by purging unwanted messages.
        </p>
      </div>

      {trashResult && (
        <div className="success-banner">
          <span style={{ fontSize: '24px' }}>✅</span>
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
                <li>Subject lines containing: promotion, sale, discount, offer, deal, free, shop, order</li>
                <li>Sender addresses containing: newsletter, marketing, promo, offers</li>
                <li>Emails categorized as &quot;Promotions&quot; by Gmail</li>
              </ul>
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
    </div>
  )
}
