'use client'

import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import styles from './page.module.css'

const features = [
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 6v6l4 2"/>
      </svg>
    ),
    title: 'Bulk Delete',
    description: 'Delete thousands of emails in seconds. No more clicking one by one.'
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
        <polyline points="22,6 12,13 2,6"/>
      </svg>
    ),
    title: 'Filter by Sender',
    description: 'Remove all emails from specific senders or entire domains at once.'
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
    title: 'Filter by Date',
    description: 'Clean up old emails from specific date ranges. Last month, last year, or custom.'
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    ),
    title: 'Smart Filters',
    description: 'One-click removal of promotions, newsletters, and social media emails.'
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
    title: 'Privacy First',
    description: 'We never read your emails. Your data stays private and secure.'
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
    ),
    title: 'Scheduled Cleanup',
    description: 'Set up automatic rules to keep your inbox clean forever.'
  }
]

const pricingPlans = [
  {
    name: 'Free Trial',
    price: '₹0',
    description: 'Perfect for trying out',
    features: ['500 email deletions', 'Filter by sender', 'Filter by date', 'Marketing email filter'],
    cta: 'Start Free',
    popular: false
  },
  {
    name: 'Yearly',
    price: '₹1,499',
    period: '/year',
    description: 'Best for regular users',
    features: ['Unlimited deletions', 'All filters', 'Scheduled cleanup', 'Priority support', 'Marketing emails'],
    cta: 'Get Started',
    popular: true
  },
  {
    name: 'Lifetime',
    price: '₹3,000',
    description: 'One-time payment',
    features: ['Unlimited forever', 'All features included', 'Priority support', 'Early access to new features'],
    cta: 'Get Lifetime',
    popular: false
  }
]

function AnimatedSection({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    gsap.fromTo(el,
      { opacity: 0, y: 40 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        delay,
        ease: 'power3.out'
      }
    )
  }, [delay])

  return <div ref={ref}>{children}</div>
}

export default function Landing() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const heroRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (session) {
      router.push('/dashboard')
    }
  }, [session, router])

  useEffect(() => {
    const el = heroRef.current
    if (!el) return

    gsap.fromTo(el,
      { opacity: 0 },
      { opacity: 1, duration: 1 }
    )
  }, [])

  if (status === 'loading') {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.backgroundGradient} />
      <div className={styles.backgroundOrbs}>
        <div className={styles.orb1} />
        <div className={styles.orb2} />
      </div>

      <header className="header">
        <div className="container header-content">
          <div className="logo">
            <svg className="logo-icon" viewBox="0 0 24 24" fill="none">
              <path d="M19 4H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zM5 8l7 5 7-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            TrashFlow
          </div>
          <nav className={styles.nav}>
            <Link href="#features">Features</Link>
            <Link href="#pricing">Pricing</Link>
            <button onClick={() => signIn('google', { callbackUrl: '/dashboard' })} className="btn btn-primary">
              Sign In
            </button>
          </nav>
        </div>
      </header>

      <main>
        <section className={styles.hero} ref={heroRef}>
          <div className="container">
            <AnimatedSection>
              <div className={styles.heroBadge}>
                <span className={styles.badgeDot} />
                Now with AI-powered filtering
              </div>
            </AnimatedSection>
            
            <AnimatedSection delay={0.1}>
              <h1 className={styles.heroTitle}>
                Clean Your Gmail Inbox
                <span className={styles.heroHighlight}> In Seconds</span>
              </h1>
            </AnimatedSection>
            
            <AnimatedSection delay={0.2}>
              <p className={styles.heroSubtitle}>
                Bulk delete emails from specific senders or date ranges. 
                Reclaim your inbox and productivity with precision filtering.
              </p>
            </AnimatedSection>
            
            <AnimatedSection delay={0.3}>
              <div className={styles.heroCta}>
                <button onClick={() => signIn('google', { callbackUrl: '/dashboard' })} className="btn btn-primary btn-large">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Start Free Trial
                </button>
                <Link href="#features" className="btn btn-outline btn-large">
                  Learn More
                </Link>
              </div>
            </AnimatedSection>

            <AnimatedSection delay={0.4}>
              <div className={styles.heroStats}>
                <div className={styles.stat}>
                  <span className={styles.statNumber}>500K+</span>
                  <span className={styles.statLabel}>Emails Deleted</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statNumber}>50K+</span>
                  <span className={styles.statLabel}>Happy Users</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statNumber}>4.9</span>
                  <span className={styles.statLabel}>Rating</span>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </section>

        <section id="features" className={styles.features}>
          <div className="container">
            <AnimatedSection>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Everything You Need to Clean Your Inbox</h2>
                <p className={styles.sectionSubtitle}>
                  Powerful features designed to make email management effortless
                </p>
              </div>
            </AnimatedSection>

            <div className={styles.featureGrid}>
              {features.map((feature, i) => (
                <AnimatedSection key={i} delay={i * 0.1}>
                  <div className={styles.featureCard}>
                    <div className={styles.featureIcon}>{feature.icon}</div>
                    <h3 className={styles.featureTitle}>{feature.title}</h3>
                    <p className={styles.featureDescription}>{feature.description}</p>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.howItWorks}>
          <div className="container">
            <AnimatedSection>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>How It Works</h2>
                <p className={styles.sectionSubtitle}>
                  Clean your inbox in three simple steps
                </p>
              </div>
            </AnimatedSection>

            <div className={styles.steps}>
              <AnimatedSection delay={0.1}>
                <div className={styles.step}>
                  <div className={styles.stepNumber}>1</div>
                  <h3>Connect Your Gmail</h3>
                  <p>Sign in with your Google account securely via OAuth</p>
                </div>
              </AnimatedSection>
              <AnimatedSection delay={0.2}>
                <div className={styles.step}>
                  <div className={styles.stepNumber}>2</div>
                  <h3>Set Your Filters</h3>
                  <p>Choose senders, date ranges, or use smart filters</p>
                </div>
              </AnimatedSection>
              <AnimatedSection delay={0.3}>
                <div className={styles.step}>
                  <div className={styles.stepNumber}>3</div>
                  <h3>Delete in Bulk</h3>
                  <p>Remove thousands of emails with a single click</p>
                </div>
              </AnimatedSection>
            </div>
          </div>
        </section>

        <section id="pricing" className={styles.pricing}>
          <div className="container">
            <AnimatedSection>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Simple, Transparent Pricing</h2>
                <p className={styles.sectionSubtitle}>
                  Start free, upgrade when you're ready
                </p>
              </div>
            </AnimatedSection>

            <div className={styles.pricingGrid}>
              {pricingPlans.map((plan, i) => (
                <AnimatedSection key={i} delay={i * 0.1}>
                  <div className={`${styles.pricingCard} ${plan.popular ? styles.pricingCardPopular : ''}`}>
                    {plan.popular && <div className={styles.popularBadge}>Most Popular</div>}
                    <h3 className={styles.planName}>{plan.name}</h3>
                    <div className={styles.planPrice}>
                      <span className={styles.priceAmount}>{plan.price}</span>
                      {plan.period && <span className={styles.pricePeriod}>{plan.period}</span>}
                    </div>
                    <p className={styles.planDescription}>{plan.description}</p>
                    <ul className={styles.planFeatures}>
                      {plan.features.map((feature, j) => (
                        <li key={j}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <button onClick={() => signIn('google', { callbackUrl: '/dashboard' })} className={`btn ${plan.popular ? 'btn-primary' : 'btn-outline'} btn-large`}>
                      {plan.cta}
                    </button>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.cta}>
          <div className="container">
            <AnimatedSection>
              <div className={styles.ctaCard}>
                <h2>Ready to Clean Your Inbox?</h2>
                <p>Join thousands of users who have reclaimed their Gmail productivity</p>
                <button onClick={() => signIn('google', { callbackUrl: '/dashboard' })} className="btn btn-primary btn-large">
                  Get Started Free
                </button>
              </div>
            </AnimatedSection>
          </div>
        </section>

        <section className={styles.newsletter}>
          <div className="container">
            <AnimatedSection>
              <div className={styles.newsletter}>
                <script async data-uid="7aa23f5a1a" data-format="inline" />
              </div>
            </AnimatedSection>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container footer-content">
          <div className={styles.footerBrand}>
            <div className="logo">
              <svg className="logo-icon" viewBox="0 0 24 24" fill="none">
                <path d="M19 4H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zM5 8l7 5 7-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              TrashFlow
            </div>
            <p className={styles.footerTagline}>Clean your Gmail inbox in seconds</p>
          </div>
          <div className={styles.footerLinks}>
            <div className={styles.footerColumn}>
              <h4>Product</h4>
              <Link href="#features">Features</Link>
              <Link href="#pricing">Pricing</Link>
            </div>
            <div className={styles.footerColumn}>
              <h4>Legal</h4>
              <Link href="/privacy">Privacy Policy</Link>
              <Link href="/terms">Terms of Service</Link>
            </div>
            <div className={styles.footerColumn}>
              <h4>Support</h4>
              <Link href="/contact">Contact Us</Link>
              <Link href="/refunds">Refunds</Link>
            </div>
          </div>
          <div className={styles.footerBottom}>
            <span>© 2026 TrashFlow. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
