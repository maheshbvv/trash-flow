'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import styles from './layout.module.css'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    }
  }, [status, router])

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  if (status === 'loading') {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        Loading...
      </div>
    )
  }

  if (!session) {
    return null
  }

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { href: '/dashboard/trash-rules', label: 'Trash Rules', icon: 'auto_delete' },
    { href: '/dashboard/history', label: 'History', icon: 'history' },
    { href: '/dashboard/settings', label: 'Settings', icon: 'settings' },
  ]

  return (
    <div className={styles.layout}>
      {/* Mobile Header */}
      <header className={styles.mobileHeader}>
        <button 
          className={styles.menuBtn} 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <span className="material-symbols-outlined">
            {mobileMenuOpen ? 'close' : 'menu'}
          </span>
        </button>
        <div className={styles.mobileLogo}>
          <span className="material-symbols-outlined">auto_delete</span>
          TrashFlow
        </div>
        <div className={styles.mobileSpacer}></div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className={styles.overlay} 
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside className={`${styles.sidebar} ${mobileMenuOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarTop}>
          <div className={styles.logoSection}>
            <div className={styles.logoIcon}>
              <img src="/trashflow-icon.svg" alt="TrashFlow" width="34" height="34" style={{ display: 'block' }} />
            </div>
            <div>
              <div className={styles.logoText}>TrashFlow</div>
              <div className={styles.logoSubtext}>Precision Trashing</div>
            </div>
          </div>

          <nav className={styles.nav}>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${pathname === item.href ? styles.active : ''}`}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>

          <Link href="/dashboard/trash-rules" className={styles.newCleanupBtn}>
            <span className="material-symbols-outlined">add</span>
            New Cleanup
          </Link>
        </div>

        <div className={styles.sidebarFooter}>
          <div className={styles.userInfo}>
            <div className={styles.avatar}>
              {session.user?.email?.charAt(0).toUpperCase()}
            </div>
            <div className={styles.userDetails}>
              <div className={styles.userName}>{session.user?.name || 'User'}</div>
              <div className={styles.userPlan}>Free Plan</div>
            </div>
          </div>
          <button onClick={() => signOut({ callbackUrl: '/' })} className={styles.signOutBtn}>
            Sign Out
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        {children}
      </main>
    </div>
  )
}
