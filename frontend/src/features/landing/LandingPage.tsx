import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../core/auth-store'
import { LandingFooter } from './LandingFooter'
import { LandingHero } from './LandingHero'
import { LandingModulesTabs } from './LandingModulesTabs'
import { LandingNavbar } from './LandingNavbar'
import { LandingPlansPlaceholder } from './LandingPlansPlaceholder'
import { LandingProCarousel } from './LandingProCarousel'
import { LandingSocialProof } from './LandingSocialProof'
import { LandingSplitSection } from './LandingSplitSection'
import { WhatsAppFab } from './WhatsAppFab'

export function LandingPage() {
  const token = useAuthStore((s) => s.token)
  if (token) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div id="top" className="min-h-screen landing-page-bg">
      <LandingNavbar />
      <main>
        <LandingHero />
        <LandingSocialProof />
        <LandingSplitSection />
        <LandingModulesTabs />
        <LandingProCarousel />
        <LandingPlansPlaceholder />
      </main>
      <LandingFooter />
      <WhatsAppFab />
    </div>
  )
}
