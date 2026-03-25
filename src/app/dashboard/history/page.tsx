'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import styles from './page.module.css'

interface Operation {
  id: string
  type: string
  filters: string
  emailCount: number
  createdAt: string
}

export default function History() {
  const { data: session } = useSession()
  const [operations, setOperations] = useState<Operation[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'search' | 'delete'>('all')

  useEffect(() => {
    fetchHistory()
  }, [session])

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/user/history')
      const data = await res.json()
      setOperations(data.operations || [])
    } catch (error) {
      console.error('Failed to fetch history:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredOps = operations.filter(op => {
    if (filter === 'all') return true
    return op.type === filter
  })

  const parseFilters = (filtersStr: string) => {
    try {
      const filters = JSON.parse(filtersStr)
      const parts: string[] = []
      
      if (filters.isMarketing) {
        parts.push('Marketing Emails')
      } else if (filters.from) {
        parts.push(filters.from)
      }
      
      if (filters.dateFrom) {
        parts.push(`After: ${filters.dateFrom}`)
      }
      if (filters.dateTo) {
        parts.push(`Before: ${filters.dateTo}`)
      }
      
      return parts.join(', ') || 'All Mail'
    } catch {
      return filtersStr
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading history...</div>
      </div>
    )
  }

  const totalFreed = operations
    .filter(op => op.type === 'delete')
    .reduce((sum, op) => sum + op.emailCount, 0)

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Operation History</h1>
          <p className={styles.subtitle}>
            A detailed log of all automated and manual cleanup operations performed by TrashFlow.
          </p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.filterBtn} onClick={() => setFilter(filter === 'all' ? 'delete' : filter === 'delete' ? 'search' : 'all')}>
            <span className="material-symbols-outlined">filter_list</span>
            {filter === 'all' ? 'Filter' : `${filter.charAt(0).toUpperCase() + filter.slice(1)}`}
          </button>
          <button className={styles.exportBtn}>
            <span className="material-symbols-outlined">download</span>
            Export
          </button>
        </div>
      </header>

      {/* Stats Bento */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Total Freed</span>
          <div className={styles.statValue}>
            <span className={styles.statNumber}>{Math.round(totalFreed * 0.015)} GB</span>
            <span className={styles.statMeta}>this month</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Cleanup Count</span>
          <div className={styles.statValue}>
            <span className={styles.statNumber}>{operations.length}</span>
            <span className={styles.statMeta}>operations</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Efficiency</span>
          <div className={styles.statValue}>
            <span className={styles.statNumber}>99.2%</span>
            <span className={styles.statMeta}>success rate</span>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className={styles.tableContainer}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Sender / Criteria</th>
                <th>Count</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOps.length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.emptyRow}>
                    <div className={styles.emptyState}>
                      <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--on-surface-variant)', opacity: 0.5 }}>
                        history
                      </span>
                      <h3>No operations found</h3>
                      <p>Start by running a cleanup rule.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOps.map((op) => {
                  const { date, time } = formatDate(op.createdAt)
                  const filters = parseFilters(op.filters)
                  
                  return (
                    <tr key={op.id}>
                      <td>
                        <div className={styles.dateCell}>
                          <span className={styles.dateMain}>{date}</span>
                          <span className={styles.dateTime}>{time}</span>
                        </div>
                      </td>
                      <td>
                        <div className={styles.senderCell}>
                          <div className={styles.senderIcon}>
                            <span className="material-symbols-outlined">
                              {op.type === 'delete' ? 'delete_sweep' : 'search'}
                            </span>
                          </div>
                          <div>
                            <span className={styles.senderEmail}>{filters}</span>
                            <span className={styles.senderMeta}>
                              {op.type === 'delete' ? 'Manual Execution' : 'Search Operation'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={styles.countBadge}>{op.emailCount.toLocaleString()} items</span>
                      </td>
                      <td>
                        <div className={styles.statusCell}>
                          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", color: 'var(--primary)' }}>
                            check_circle
                          </span>
                          <span className={styles.statusText}>Success</span>
                        </div>
                      </td>
                      <td>
                        <div className={styles.actionButtons}>
                          <button className={styles.actionBtn} title="View Details">
                            <span className="material-symbols-outlined">visibility</span>
                          </button>
                          <button className={styles.actionBtn} title="Undo Operation">
                            <span className="material-symbols-outlined">undo</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className={styles.pagination}>
          <span className={styles.paginationText}>Showing {filteredOps.length} of {operations.length} operations</span>
          <div className={styles.paginationButtons}>
            <button className={styles.pageBtn}>
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <button className={styles.pageBtnActive}>1</button>
            <button className={styles.pageBtn}>2</button>
            <button className={styles.pageBtn}>3</button>
            <button className={styles.pageBtn}>
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* Warning Banner */}
      <div className={styles.warningBanner}>
        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", fontSize: '32px', color: 'var(--tertiary)' }}>
          warning
        </span>
        <div>
          <h4 className={styles.warningTitle}>Undo Policy Notice</h4>
          <p className={styles.warningText}>
            Cleanup operations can be undone within 48 hours of execution. After this window, data is permanently purged from TrashFlow's local recovery buffer to maintain your privacy.
          </p>
        </div>
      </div>
    </div>
  )
}
