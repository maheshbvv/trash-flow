'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import styles from './page.module.css'
import Link from 'next/link'

interface VolumeData {
  date: string
  day: string
  count: number
}

interface Schedule {
  id: string
  name: string
  fromEmail: string | null
  isMarketing: boolean
  frequency: string
  isActive: boolean
}

interface Stats {
  totalDeleted: number
  totalOperations: number
  searchCount: number
  deleteCount: number
  recentOperations: any[]
  volumeData: VolumeData[]
  peakDay: string | null
}

export default function Dashboard() {
  const { data: session } = useSession()
  const [stats, setStats] = useState<Stats | null>(null)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const orderStatus = params.get('order_status')
    const orderId = params.get('order_id')

    const verifyAndUpdateSubscription = async () => {
      try {
        // Use subscription API to verify and activate
        const res = await fetch('/api/user/subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ verifySubscription: true })
        })
        const data = await res.json()
        
        if (data.success) {
          setShowSuccess(true)
          // Refresh page after short delay
          setTimeout(() => window.location.reload(), 1500)
        }
      } catch (error) {
        console.error('Payment verification failed:', error)
      }
      // Always clean up URL
      window.history.replaceState({}, '', '/dashboard')
    }

    // If there's an order_status or order_id, verify subscription
    if (orderStatus === 'PAID' || orderId) {
      verifyAndUpdateSubscription()
    }
  }, [])

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/user/stats')
        const data = await res.json()
        setStats(data)
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      } finally {
        setLoading(false)
      }
    }

    async function fetchSchedules() {
      try {
        const res = await fetch('/api/user/schedules')
        const data = await res.json()
        setSchedules(data.schedules || [])
      } catch (error) {
        console.error('Failed to fetch schedules:', error)
      }
    }
    
    if (session) {
      fetchStats()
      fetchSchedules()
    }
  }, [session])

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading stats...</div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {showSuccess && (
        <div className="success-banner" style={{ marginBottom: '24px' }}>
          <span style={{ fontSize: '24px' }}>🎉</span>
          <div>
            <p><strong>Payment successful!</strong></p>
            <p style={{ opacity: 0.8, fontSize: '14px' }}>Your subscription is now active. Enjoy unlimited deletions!</p>
          </div>
        </div>
      )}

      {/* Hero Stats / Bento Grid */}
      <div className={styles.statsGrid}>
        {/* Main Metric - Efficiency Rating */}
        <div className={styles.mainMetric}>
          <div className={styles.metricContent}>
            <p className={styles.metricLabel}>Efficiency Rating</p>
            <h3 className={styles.metricValue}>{(stats?.totalDeleted || 0) > 0 ? '98.4%' : 'N/A'}</h3>
            <p className={styles.metricDesc}>
              {(stats?.totalDeleted || 0) > 0 
                ? 'Your workspace is currently maintained at peak editorial standards.'
                : 'Start using TrashFlow to see your efficiency rating.'}
            </p>
          </div>
          <div className={styles.metricFooter}>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: (stats?.totalDeleted || 0) > 0 ? '98.4%' : '0%' }}></div>
            </div>
            <span className={styles.optimizedBadge}>OPTIMIZED</span>
          </div>
          <div className={styles.decorative}></div>
        </div>

        {/* Metric Card 1 - Total Emails Trashed */}
        <div className={styles.metricCard}>
          <div className={styles.metricIcon} style={{ background: 'rgba(187, 23, 18, 0.1)' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--tertiary)' }}>delete_sweep</span>
          </div>
          <p className={styles.metricCardLabel}>Total Emails Trashed</p>
          <h4 className={styles.metricCardValue}>{stats?.totalDeleted?.toLocaleString() || 0}</h4>
          <p className={styles.metricCardMeta}>+{stats?.deleteCount || 0} operations</p>
        </div>

        {/* Metric Card 2 - Storage Reclaimed */}
        <div className={styles.metricCard}>
          <div className={styles.metricIcon} style={{ background: 'rgba(0, 91, 191, 0.1)' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>hard_drive</span>
          </div>
          <p className={styles.metricCardLabel}>Storage Reclaimed</p>
          <h4 className={styles.metricCardValue}>{Math.round((stats?.totalDeleted || 0) * 0.015)} MB</h4>
          <p className={styles.metricCardMeta}>Estimated space saved</p>
        </div>

        {/* Metric Card 3 - Active Rules */}
        <div className={styles.metricCardSmall}>
          <div>
            <p className={styles.metricCardLabel}>Active Rules</p>
            <h4 className={styles.metricCardValue}>{schedules.length}</h4>
          </div>
          {schedules.length > 0 ? (
            <div className={styles.avatarStack}>
              {schedules.slice(0, 3).map((schedule) => (
                <div 
                  key={schedule.id} 
                  className={styles.avatarStackItem} 
                  style={{ background: schedule.isMarketing ? '#FFEBEE' : '#E3F2FD' }}
                  title={schedule.name}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '14px', color: schedule.isMarketing ? '#C62828' : '#1976D2' }}>
                    {schedule.isMarketing ? 'campaign' : 'mail'}
                  </span>
                </div>
              ))}
              {schedules.length > 3 && (
                <div className={styles.avatarStackItem} style={{ background: '#F5F5F5' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#616161' }}>+{schedules.length - 3}</span>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.avatarStack}>
              <div className={styles.avatarStackItem} style={{ background: '#F5F5F5' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#616161' }}>add</span>
              </div>
            </div>
          )}
        </div>

        {/* Volume Chart */}
        <div className={styles.volumeChart}>
          <div className={styles.chartHeader}>
            <p className={styles.metricCardLabel}>Volume Over Time</p>
            <div className={styles.chartBars}>
              {stats?.volumeData?.map((vol, i) => {
                const maxCount = Math.max(...(stats?.volumeData?.map(v => v.count) || [1]), 1)
                const height = maxCount > 0 ? (vol.count / maxCount) * 100 : 0
                return (
                  <div 
                    key={i} 
                    className={styles.chartBar} 
                    style={{ 
                      height: `${Math.max(height, 4)}%`,
                      background: height > 0 ? 'var(--primary)' : 'var(--outline-variant)'
                    }}
                    title={`${vol.day}: ${vol.count} emails`}
                  ></div>
                )
              })}
              {(!stats?.volumeData || stats.volumeData.length === 0) && (
                <>
                  <div className={styles.chartBar} style={{ height: '4%' }}></div>
                  <div className={styles.chartBar} style={{ height: '4%' }}></div>
                  <div className={styles.chartBar} style={{ height: '4%' }}></div>
                  <div className={styles.chartBar} style={{ height: '4%' }}></div>
                  <div className={styles.chartBar} style={{ height: '4%' }}></div>
                  <div className={styles.chartBar} style={{ height: '4%' }}></div>
                  <div className={styles.chartBar} style={{ height: '4%' }}></div>
                </>
              )}
            </div>
          </div>
          <div className={styles.chartSidebar}>
            <p className={styles.metricCardLabel}>Peak Cleanup Day</p>
            <p className={styles.peakDay}>{stats?.peakDay || 'N/A'}</p>
            <p className={styles.chartMeta}>
              {stats?.totalDeleted ? `Total: ${stats.totalDeleted.toLocaleString()} deleted` : 'No data yet'}
            </p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <section className={styles.activitySection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Recent Activity</h2>
          <Link href="/dashboard/history" className={styles.viewHistoryBtn}>View History</Link>
        </div>
        
        <div className={styles.activityTable}>
          <div className={styles.tableHeader}>
            <div className={styles.colOperation}>Operation</div>
            <div className={styles.colSource}>Source</div>
            <div className={styles.colItems}>Items</div>
            <div className={styles.colReduction}>Reduction</div>
            <div className={styles.colStatus}>Status</div>
          </div>
          
          <div className={styles.tableBody}>
            {(!stats?.recentOperations || stats.recentOperations.length === 0) ? (
              <div className={styles.emptyState}>
                <p>No operations yet. Start by creating a cleanup rule!</p>
              </div>
            ) : (
              stats.recentOperations.slice(0, 5).map((op: any) => (
                <div key={op.id} className={styles.tableRow}>
                  <div className={styles.colOperation}>
                    <div className={styles.opIcon}>
                      <span className="material-symbols-outlined">
                        {op.type === 'delete' ? 'delete_sweep' : 'search'}
                      </span>
                    </div>
                    <div>
                      <p className={styles.opTitle}>
                        {op.type === 'delete' ? 'Bulk Delete' : 'Search'}
                      </p>
                      <p className={styles.opMeta}>
                        {op.type === 'delete' ? 'Manual execution' : 'Search operation'}
                      </p>
                    </div>
                  </div>
                  <div className={styles.colSource}>
                    {JSON.parse(op.filters || '{}').from || JSON.parse(op.filters || '{}').isMarketing ? 'Filtered' : 'All Mail'}
                  </div>
                  <div className={styles.colItems}>{op.emailCount.toLocaleString()}</div>
                  <div className={styles.colReduction}>{Math.round(op.emailCount * 0.015)} MB</div>
                  <div className={styles.colStatus}>
                    <span className={styles.statusBadge}>COMPLETED</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
