import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Cookie, Shield, X, Settings } from 'lucide-react'

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [preferences, setPreferences] = useState({
    essential: true,
    functional: false,
    analytics: false,
    marketing: false
  })

  useEffect(() => {
    const consent = localStorage.getItem('autocraft_cookie_consent')
    if (!consent) {
      setShowBanner(true)
    } else {
      try {
        setPreferences(JSON.parse(consent))
      } catch {
        // Fallback if malformed
      }
    }

    // Set up global listener to open preferences modal from Footer/account page link
    const handleOpenPreferences = () => {
      const current = localStorage.getItem('autocraft_cookie_consent')
      if (current) {
        try {
          setPreferences(JSON.parse(current))
        } catch {}
      }
      setShowModal(true)
    }

    window.addEventListener('open-cookie-preferences', handleOpenPreferences)
    return () => {
      window.removeEventListener('open-cookie-preferences', handleOpenPreferences)
    }
  }, [])

  const saveConsent = (updatedPrefs) => {
    localStorage.setItem('autocraft_cookie_consent', JSON.stringify(updatedPrefs))
    setPreferences(updatedPrefs)
    setShowBanner(false)
    setShowModal(false)
    // Trigger custom event so analytics utility or other parts can react instantly
    window.dispatchEvent(new Event('autocraft_consent_changed'))
  }

  const handleAcceptAll = () => {
    const allAccepted = {
      essential: true,
      functional: true,
      analytics: true,
      marketing: true
    }
    saveConsent(allAccepted)
  }

  const handleRejectOptional = () => {
    const allRejected = {
      essential: true,
      functional: false,
      analytics: false,
      marketing: false
    }
    saveConsent(allRejected)
  }

  const handleSavePreferences = () => {
    saveConsent(preferences)
  }

  return (
    <>
      {/* Banner at the bottom */}
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-6 left-6 right-6 md:left-auto md:max-w-md z-[100] glass border border-dark-border/60 shadow-2xl p-6 rounded-2xl flex flex-col gap-4 text-left"
          >
            <div className="flex gap-3 items-start">
              <div className="p-2.5 bg-primary-500/10 text-primary-500 rounded-xl shrink-0">
                <Cookie size={20} className="animate-spin-slow" />
              </div>
              <div>
                <h4 className="font-display font-bold text-sm text-dark-text tracking-wide">
                  Cookie Preferences & Privacy
                </h4>
                <p className="text-xs text-dark-muted mt-1 leading-relaxed">
                  We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic. By clicking "Accept All", you consent to our use of all cookies.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 mt-2">
              <button
                onClick={handleAcceptAll}
                className="btn-primary text-xs py-2 px-4 flex-1 text-center font-semibold"
              >
                Accept All
              </button>
              <button
                onClick={handleRejectOptional}
                className="btn-outline border-dark-border hover:bg-dark-border text-xs py-2 px-4 flex-1 text-center"
              >
                Reject Optional
              </button>
            </div>
            
            <button
              onClick={() => setShowModal(true)}
              className="text-[10px] text-primary-400 hover:text-primary-300 font-bold uppercase tracking-wider text-center flex items-center justify-center gap-1 mt-1"
            >
              <Settings size={10} /> Customize Cookie Choices
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preferences Customization Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="card w-full max-w-lg bg-dark-card border-dark-border shadow-2xl p-6 flex flex-col gap-5 text-left"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-dark-border/40 pb-3">
                <div className="flex items-center gap-2.5">
                  <Shield size={18} className="text-primary-500" />
                  <h3 className="font-display text-base font-bold text-dark-text">Cookie Settings</h3>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 text-dark-muted hover:text-dark-text hover:bg-dark-border/30 rounded-lg"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Preferences List */}
              <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
                {/* Essential Category */}
                <div className="flex items-start justify-between gap-4 p-3 rounded-xl border border-dark-border/40 bg-dark-bg/20">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-dark-text">Essential Cookies</span>
                      <span className="text-[9px] bg-primary-500/10 text-primary-400 px-1.5 py-0.5 rounded font-mono uppercase font-semibold">Required</span>
                    </div>
                    <p className="text-[10px] text-dark-muted mt-1 leading-relaxed">
                      Necessary for core features like authentication, secure transactions, user sessions, CSRF safety, and load balance performance. Cannot be disabled.
                    </p>
                  </div>
                  <div className="text-xs text-primary-500 font-semibold uppercase font-mono px-2.5 py-1">
                    Always Active
                  </div>
                </div>

                {/* Functional Category */}
                <div className="flex items-start justify-between gap-4 p-3 rounded-xl border border-dark-border/40 hover:bg-dark-border/10 transition-colors">
                  <div className="flex-1">
                    <span className="text-xs font-semibold text-dark-text">Functional Cookies</span>
                    <p className="text-[10px] text-dark-muted mt-1 leading-relaxed">
                      Enable persistent website preferences such as custom themes, layout configs, and selected regional options.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer mt-1 shrink-0">
                    <input
                      type="checkbox"
                      checked={preferences.functional}
                      onChange={(e) => setPreferences({ ...preferences, functional: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4.5 bg-dark-border rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-primary-500"></div>
                  </label>
                </div>

                {/* Analytics Category */}
                <div className="flex items-start justify-between gap-4 p-3 rounded-xl border border-dark-border/40 hover:bg-dark-border/10 transition-colors">
                  <div className="flex-1">
                    <span className="text-xs font-semibold text-dark-text">Analytics Cookies</span>
                    <p className="text-[10px] text-dark-muted mt-1 leading-relaxed">
                      Track visitor traffic analytics, scroll depth, page duration logs, and device environments to help us optimize UI speeds.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer mt-1 shrink-0">
                    <input
                      type="checkbox"
                      checked={preferences.analytics}
                      onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4.5 bg-dark-border rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-primary-500"></div>
                  </label>
                </div>

                {/* Marketing Category */}
                <div className="flex items-start justify-between gap-4 p-3 rounded-xl border border-dark-border/40 hover:bg-dark-border/10 transition-colors">
                  <div className="flex-1">
                    <span className="text-xs font-semibold text-dark-text">Marketing Cookies</span>
                    <p className="text-[10px] text-dark-muted mt-1 leading-relaxed">
                      Allow us to serve relevant advertisements, display catalog suggestions, and manage trackable affiliate coupon referrals.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer mt-1 shrink-0">
                    <input
                      type="checkbox"
                      checked={preferences.marketing}
                      onChange={(e) => setPreferences({ ...preferences, marketing: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4.5 bg-dark-border rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-primary-500"></div>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-3 border-t border-dark-border/40">
                <button
                  onClick={handleRejectOptional}
                  className="btn-outline text-xs py-2 px-4"
                >
                  Reject All
                </button>
                <button
                  onClick={handleAcceptAll}
                  className="btn-outline text-xs py-2 px-4 text-primary-400 border-primary-500/30 hover:bg-primary-500/10"
                >
                  Accept All
                </button>
                <button
                  onClick={handleSavePreferences}
                  className="btn-primary text-xs py-2 px-4"
                >
                  Save Choices
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
