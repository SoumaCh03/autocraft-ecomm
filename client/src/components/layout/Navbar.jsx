import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingCart, User, Sun, Moon, Menu, X, ChevronDown, Search } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { motion, AnimatePresence } from 'framer-motion'
import logo from '../../assets/logo.png'

const CAR_BRANDS = {
  'Maruti Suzuki': ['Swift', 'Baleno', 'Brezza', 'Ertiga', 'Fronx', 'Wagon R' , 'Grand Vitara', 'Jimny', 'Ignis' , 'XL6'],
  'Hyundai':       ['Creta', 'Venue', 'i20', 'Alcazar', 'Exter', 'Tucson', 'Aura', 'Verna', 'Kona', 'Staria'],
  'Tata':          ['Nexon', 'Harrier', 'Safari', 'Punch', 'Altroz', 'Tiago', 'Curvv', 'Sierra', 'Hexa', 'H2X'],
  'Mahindra':      ['Thar', 'Scorpio N', 'XUV700', 'XUV3XO', 'Bolero', 'Scorpio (legacy)' , 'BE6', 'BE 9ev' , 'Marazzo', 'KUV100', 'Alturas G4'],
  'Toyota':        ['Fortuner', 'Innova Crysta', 'Innova Hycross', 'Urban Cruiser', 'Glanza' , 'Yaris', 'Camry',],
  'Kia':           ['Seltos', 'Sonet', 'Carens', 'EV6' , 'Carnival', 'K5', 'Niro', 'Soul'],
  'Honda':         ['City', 'Amaze', 'Elevate', 'WR-V', 'CR-V', 'Civic', 'Jazz', 'Vezel', 'BR-V', 'Amaze'],
  'MG':            ['Hector', 'Astor', 'Gloster', 'Windsor', 'Comet', 'Marvel R', 'ZS EV'],
  'Renault':       ['Kiger', 'Triber', 'Duster', 'Kwid', 'Captur', 'Alaskan'],
  'Skoda':         ['Octavia', 'Kushaq', 'Slavia', 'Rapid', 'Superb', 'Enyaq'],
  'Volkswagen':    ['Taigun', 'Polo', 'Vento', 'T-Roc', 'Passat', 'Tiguan'],
}

const CATEGORIES = [
  { label: 'Exterior',    slug: 'exterior' },
  { label: 'Interior',    slug: 'interior' },
  { label: 'Lighting',    slug: 'lighting' },
  { label: 'Electronics', slug: 'electronics' },
  { label: 'Car Care',    slug: 'car-care' },
  { label: 'Dashboard',   slug: 'dashboard' },
]

export default function Navbar() {
  const { isDark, toggleTheme } = useTheme()
  const { user, logout }        = useAuth()
  const { cartCount }           = useCart()
  const navigate                = useNavigate()

  const [scrolled,      setScrolled]      = useState(false)
  const [mobileOpen,    setMobileOpen]    = useState(false)
  const [brandMenuOpen, setBrandMenuOpen] = useState(false)
  const [catMenuOpen,   setCatMenuOpen]   = useState(false)
  const [userMenuOpen,  setUserMenuOpen]  = useState(false)
  const [searchOpen,    setSearchOpen]    = useState(false)
  const [searchQuery,   setSearchQuery]   = useState('')

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleLogout = async () => {
    await logout()
    setUserMenuOpen(false)
    navigate('/')
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`)
      setSearchOpen(false)
      setSearchQuery('')
    }
  }

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'glass shadow-lg shadow-black/20' : 'bg-transparent'
      }`}>

        {/* Announcement bar */}
        <div className="bg-primary-500/10 border-b border-primary-500/20 text-center py-1.5 text-xs text-primary-500 font-medium tracking-wide px-4">
          <span className="hidden sm:inline">Free Shipping on orders above Rs.999 &nbsp;|&nbsp; Flat 5% off on prepaid orders</span>
          <span className="sm:hidden">Free Shipping above Rs.999 · 5% off on prepaid</span>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link to="/" className="flex items-center group">
              <img
                src={logo}
                alt="AUTOCRAFT"
                className="h-10 w-auto object-contain group-hover:scale-105 transition-transform duration-200"
              />
            </Link>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-1">

              {/* Shop by Car Brand */}
              <div
                className="relative"
                onMouseEnter={() => setBrandMenuOpen(true)}
                onMouseLeave={() => setBrandMenuOpen(false)}
              >
                <button className="flex items-center gap-1 px-4 py-2 text-sm text-dark-muted hover:text-dark-text transition-colors rounded-lg hover:bg-dark-card">
                  Shop by Car <ChevronDown size={14} className={`transition-transform ${brandMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {brandMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full left-0 mt-1 w-[680px] glass rounded-2xl p-6 shadow-2xl shadow-black/50 border border-dark-border"
                    >
                      <p className="text-xs text-dark-muted uppercase tracking-widest mb-4 font-medium">
                        Select Your Car Brand
                      </p>
                      <div className="grid grid-cols-8 gap-4">
                        {Object.entries(CAR_BRANDS).map(([brand, models]) => (
                          <div key={brand}>
                            <Link
                              to={`/shop?brand=${encodeURIComponent(brand)}`}
                              className="block text-sm font-semibold text-dark-text hover:text-primary-500 transition-colors mb-2"
                            >
                              {brand}
                            </Link>
                            {models.slice(0, 8).map((model) => (
                              <Link
                                key={model}
                                to={`/shop?brand=${encodeURIComponent(brand)}&model=${encodeURIComponent(model)}`}
                                className="block text-xs text-dark-muted hover:text-accent-400 transition-colors py-0.5"
                              >
                                {model}
                              </Link>
                            ))}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Categories */}
              <div
                className="relative"
                onMouseEnter={() => setCatMenuOpen(true)}
                onMouseLeave={() => setCatMenuOpen(false)}
              >
                <button className="flex items-center gap-1 px-4 py-2 text-sm text-dark-muted hover:text-dark-text transition-colors rounded-lg hover:bg-dark-card">
                  Categories <ChevronDown size={14} className={`transition-transform ${catMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {catMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full left-0 mt-1 w-48 glass rounded-2xl p-3 shadow-2xl shadow-black/50 border border-dark-border"
                    >
                      {CATEGORIES.map((cat) => (
                        <Link
                          key={cat.slug}
                          to={`/shop/${cat.slug}`}
                          className="block px-3 py-2 text-sm text-dark-muted hover:text-dark-text hover:bg-dark-border/50 rounded-lg transition-colors"
                        >
                          {cat.label}
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Link
                to="/shop"
                className="px-4 py-2 text-sm text-dark-muted hover:text-dark-text transition-colors rounded-lg hover:bg-dark-card"
              >
                All Products
              </Link>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2">

              <button
                onClick={() => setSearchOpen(true)}
                className="p-2 text-dark-muted hover:text-dark-text transition-colors rounded-lg hover:bg-dark-card"
              >
                <Search size={18} />
              </button>

              <button
                onClick={toggleTheme}
                className="p-2 text-dark-muted hover:text-dark-text transition-colors rounded-lg hover:bg-dark-card"
              >
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              <Link
                to="/cart"
                className="relative p-2 text-dark-muted hover:text-dark-text transition-colors rounded-lg hover:bg-dark-card"
              >
                <ShoppingCart size={18} />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {cartCount}
                  </span>
                )}
              </Link>

              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen((p) => !p)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-dark-card transition-colors"
                  >
                    <div className="w-7 h-7 bg-primary-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {user.name?.[0]?.toUpperCase()}
                    </div>
                    <ChevronDown size={14} className="text-dark-muted hidden sm:block" />
                  </button>
                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className="absolute right-0 top-full mt-1 w-48 glass rounded-2xl p-2 shadow-2xl shadow-black/50 border border-dark-border"
                      >
                        <p className="px-3 py-2 text-xs text-dark-muted">{user.email}</p>
                        <hr className="border-dark-border my-1" />
                        <Link to="/profile"   onClick={() => setUserMenuOpen(false)} className="block px-3 py-2 text-sm text-dark-text hover:bg-dark-border/50 rounded-lg transition-colors">My Profile</Link>
                        <Link to="/my-orders" onClick={() => setUserMenuOpen(false)} className="block px-3 py-2 text-sm text-dark-text hover:bg-dark-border/50 rounded-lg transition-colors">My Orders</Link>
                        {user.role === 'admin' && (
                          <Link to="/admin" onClick={() => setUserMenuOpen(false)} className="block px-3 py-2 text-sm text-accent-400 hover:bg-dark-border/50 rounded-lg transition-colors">Admin Panel</Link>
                        )}
                        <hr className="border-dark-border my-1" />
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-dark-border/50 rounded-lg transition-colors"
                        >
                          Logout
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <Link to="/login" className="hidden sm:flex items-center gap-2 btn-primary py-2 px-4 text-sm">
                  <User size={15} /> Login
                </Link>
              )}

              <button
                onClick={() => setMobileOpen((p) => !p)}
                className="lg:hidden p-2 text-dark-muted hover:text-dark-text transition-colors"
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden glass border-t border-dark-border px-4 py-4 space-y-2"
            >
              <Link to="/shop" onClick={() => setMobileOpen(false)} className="block py-2 text-dark-muted hover:text-dark-text">All Products</Link>
              <hr className="border-dark-border" />
              <p className="text-xs text-dark-muted uppercase tracking-widest pt-1">By Category</p>
              {CATEGORIES.map((cat) => (
                <Link
                  key={cat.slug}
                  to={`/shop/${cat.slug}`}
                  onClick={() => setMobileOpen(false)}
                  className="block py-1.5 text-sm text-dark-muted hover:text-dark-text pl-2"
                >
                  {cat.label}
                </Link>
              ))}
              <hr className="border-dark-border" />
              <p className="text-xs text-dark-muted uppercase tracking-widest pt-1">By Car Brand</p>
              {Object.keys(CAR_BRANDS).map((brand) => (
                <Link
                  key={brand}
                  to={`/shop?brand=${encodeURIComponent(brand)}`}
                  onClick={() => setMobileOpen(false)}
                  className="block py-1.5 text-sm text-dark-muted hover:text-dark-text pl-2"
                >
                  {brand}
                </Link>
              ))}
              {!user && (
                <>
                  <hr className="border-dark-border" />
                  <Link to="/login"    onClick={() => setMobileOpen(false)} className="block btn-primary text-center text-sm">Login</Link>
                  <Link to="/register" onClick={() => setMobileOpen(false)} className="block btn-outline text-center text-sm mt-2">Register</Link>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Search Overlay */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-start justify-center pt-24 px-4"
            onClick={(e) => e.target === e.currentTarget && setSearchOpen(false)}
          >
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="w-full max-w-2xl"
            >
              <form onSubmit={handleSearch} className="relative">
                <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" />
                <input
                  autoFocus
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search car accessories, brands, models..."
                  className="w-full glass border border-dark-border text-dark-text placeholder-dark-muted rounded-2xl pl-12 pr-4 py-4 text-lg focus:outline-none focus:border-primary-500"
                />
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-muted hover:text-dark-text"
                >
                  <X size={20} />
                </button>
              </form>
              <p className="text-center text-dark-muted text-sm mt-3">Press Enter to search</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

