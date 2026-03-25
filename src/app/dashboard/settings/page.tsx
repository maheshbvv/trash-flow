'use client'

import { useSession, signOut } from 'next-auth/react'
import { useEffect, useState } from 'react'
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
}

export default function Settings() {
  const { data: session } = useSession()
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
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

  useEffect(() => {
    fetchSchedules()
  }, [session])

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

  return (
    <div className={styles.container}>
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
                  </div>
                </div>
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
            <p className={styles.dangerDesc}>This will stop all curation rules and purge your configuration data.</p>
          </div>
          <button className={styles.dangerBtn}>
            Delete All Data
          </button>
        </div>
      </section>
    </div>
  )
}
