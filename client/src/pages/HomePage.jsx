import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Star, Shield, Truck, Headphones } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import toast from 'react-hot-toast'

const FEATURES = [
  { icon: Truck,      title: 'Free Shipping', desc: 'On orders above ₹999' },
  { icon: Shield,     title: '100% Genuine',  desc: 'Certified products only' },
  { icon: Star,       title: 'Top Rated',     desc: '5,000+ happy customers' },
  { icon: Headphones, title: '24/7 Support',  desc: 'Always here to help' },
]

const CATEGORIES = [
  { name: 'Exterior',    emoji: '🚗', slug: 'exterior',    desc: 'Body kits, wraps & more' },
  { name: 'Interior',    emoji: '🪑', slug: 'interior',    desc: 'Seat covers, mats & more' },
  { name: 'Lighting',    emoji: '💡', slug: 'lighting',    desc: 'LED, HID & ambient lights' },
  { name: 'Electronics', emoji: '📱', slug: 'electronics', desc: 'Cameras, GPS & more' },
  { name: 'Car Care',    emoji: '🧴', slug: 'car-care',    desc: 'Polish, wax & cleaners' },
  { name: 'Dashboard',   emoji: '🎛️', slug: 'dashboard',   desc: 'Mounts, trims & gauges' },
]

const CAR_BRANDS = [
  'Maruti Suzuki',
  'Hyundai',
  'Tata',
  'Mahindra',
  'Toyota',
  'Kia',
  'Honda',
  'MG',
  'Renault',
  'Skoda',
  'Volkswagen',
]

const REVIEWS = [
  { name: 'Saumyadeep Chakraborty',  rating: 5, text: 'Visited Autocraft with my car and had a great experience!The quality is excellent and everything was fitted perfectly. The owners are very friendly and helpful—highly recommended!', city: 'Cooch Behar' },
  { name: 'Subhasis Mallick',  rating: 5, text: 'Superb place to modify your vehicle...Technician did a wonderful job!', city: 'Cooch Behar' },
  { name: 'Avi Chowdhury',  rating: 4, text: 'Huge range of android available with warranty. Bought Diamond 2k Android. They provide free installation', city: 'Cooch Behar' },
  { name: 'Rajat Shil',  rating: 5, text: 'Good behaviour but opens late in morning.', city: 'Cooch Behar' },
  { name: 'Dip Raj Barman', rating: 5, text: 'Dokandar ar bebohar valo.Spikar ar dam kom.', city: 'Cooch Behar' },
  { name: 'Rajdeep Barman',  rating: 4, text: 'Best car accessory shop in coochbehar with huge stock. Owner and staff behavior is good', city: 'Cooch Behar' },
  { name: 'Ornitho Mántrã', rating: 5, text: 'Service was top class. Product price was reasonable.', city: 'Cooch Behar' },
  { name: 'Biswanath Das', rating: 5, text: 'Good.', city: 'Cooch Behar' },
  { name: 'Mubarak Mandal', rating: 4, text: 'Good store.', city: 'Cooch Behar' },
  { name: 'Arpita Barman', rating: 5, text: 'Good price.', city: 'Cooch Behar' },
]

const fadeUp = {
  hidden:  { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
}

export default function HomePage() {
  const [searchParams] = useSearchParams()
  const navigate       = useNavigate()
  const [brandOpen, setBrandOpen] = useState(false)

  useEffect(() => {
    const loginStatus = searchParams.get('login')
    const errorStatus = searchParams.get('error')
    if (loginStatus === 'success') {
      toast.success('Welcome! Logged in with Google!')
      navigate('/', { replace: true })
    } else if (errorStatus === 'google') {
      toast.error('Google login failed. Please try again.')
      navigate('/login', { replace: true })
    }
  }, [searchParams, navigate])

  return (
    <>
      <Helmet>
        <title>AUTOCRAFT — Premium Car Accessories India</title>
        <meta name="description" content="Shop premium car accessories for all Indian car brands. Exterior, interior, lighting, electronics and more. Free shipping above ₹999." />
        <meta property="og:title" content="AUTOCRAFT — Premium Car Accessories India" />
        <meta property="og:description" content="Shop premium car accessories for every Indian car brand." />
        <meta name="keywords" content="car accessories india, seat covers, car lights, maruti accessories, hyundai accessories" />
      </Helmet>

      {/* HERO */}
      <section className="relative min-h-screen flex items-center justify-center overflow-x-clip overflow-y-visible pt-20">
        <div className="absolute inset-0 bg-grid-pattern opacity-40" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-accent-400/5 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block px-3 py-1.5 rounded-full border border-primary-500/40 bg-primary-500/10 text-primary-500 text-xs font-medium tracking-wide uppercase mb-6 max-w-xs text-center">
              India's Premium Car Accessories Store
            </span>
          </motion.div>

          <motion.h1
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display text-5xl sm:text-6xl md:text-7xl font-bold text-dark-text leading-tight mb-6"
          >
            Upgrade Your Ride.<br />
            <span className="gradient-text">Elevate Your Drive.</span>
          </motion.h1>

          <motion.p
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-dark-muted text-lg sm:text-xl max-w-2xl mx-auto mb-10"
          >
            Discover premium accessories crafted for every Indian car. From Maruti to Mahindra — find the perfect fit.
          </motion.p>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link to="/shop" className="btn-primary flex items-center justify-center gap-2 text-base">
              Shop Now <ArrowRight size={18} />
            </Link>

            <div className="relative">
              <button
                type="button"
                onClick={() => setBrandOpen((p) => !p)}
                className="btn-outline flex items-center justify-center gap-2 text-base w-full sm:w-auto"
              >
                Shop by Car Brand
              </button>

              {brandOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-64 glass rounded-2xl p-3 shadow-2xl shadow-black/50 border border-dark-border z-20">
                  {CAR_BRANDS.map((brand) => (
                    <Link
                      key={brand}
                      to={`/shop?brand=${encodeURIComponent(brand)}`}
                      onClick={() => setBrandOpen(false)}
                      className="block px-3 py-2 text-sm text-dark-muted hover:text-dark-text hover:bg-dark-border/50 rounded-lg transition-colors text-left"
                    >
                      {brand}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-wrap justify-center gap-8 mt-16"
          >
            {[
              ['5,000+', 'Happy Customers'],
              ['500+',   'Products'],
              ['50+',    'Car Brands'],
              ['4.9★',   'Avg Rating'],
            ].map(([num, label]) => (
              <div key={label} className="text-center">
                <p className="font-display text-2xl font-bold gradient-text">{num}</p>
                <p className="text-dark-muted text-xs mt-0.5">{label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* FEATURES BAR */}
      <section className="border-y border-dark-border bg-dark-card/50">
        <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-500/10 rounded-xl flex items-center justify-center shrink-0">
                <Icon size={18} className="text-primary-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-dark-text">{title}</p>
                <p className="text-xs text-dark-muted">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="section-title mb-3">Shop by Category</h2>
          <p className="text-dark-muted">Everything your car needs, in one place</p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {CATEGORIES.map((cat, i) => (
            <motion.div
              key={cat.slug}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              transition={{ duration: 0.4, delay: i * 0.07 }}
            >
              <Link
                to={`/shop/${cat.slug}`}
                className="card p-5 text-center hover:border-primary-500/50 hover:bg-primary-500/5 transition-all duration-300 group block"
              >
                <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300">{cat.emoji}</div>
                <p className="font-semibold text-dark-text text-sm mb-1">{cat.name}</p>
                <p className="text-dark-muted text-xs">{cat.desc}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FEATURED PRODUCTS */}
      <section className="max-w-7xl mx-auto px-4 pb-20">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="section-title">Featured Products</h2>
            <p className="text-dark-muted mt-1">Best sellers this week</p>
          </div>
          <Link to="/shop" className="btn-outline text-sm py-2 flex items-center gap-2">
            View All <ArrowRight size={15} />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <motion.div
              key={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              transition={{ duration: 0.4, delay: (i % 4) * 0.08 }}
              className="card overflow-hidden group hover:border-primary-500/30 transition-all duration-300"
            >
              <div className="aspect-square bg-dark-border/50 relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center text-dark-muted/30 font-display text-4xl font-bold">AC</div>
                <div className="absolute inset-0 bg-gradient-to-t from-dark-card/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              <div className="p-4">
                <p className="text-xs text-primary-500 mb-1">Exterior</p>
                <p className="font-medium text-dark-text text-sm mb-1 line-clamp-2">Premium Car Accessory Product Name</p>
                <div className="flex items-center gap-1 mb-2">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} size={10} className="fill-yellow-400 text-yellow-400" />
                  ))}
                  <span className="text-xs text-dark-muted ml-1">(24)</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-dark-text">₹{(999 + i * 200).toLocaleString()}</span>
                    <span className="text-xs text-dark-muted line-through ml-2">₹{(1499 + i * 200).toLocaleString()}</span>
                  </div>
                </div>
                <Link
                  to="/shop"
                  className="mt-3 w-full btn-primary py-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-300 block text-center"
                >
                  Shop Now
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* REVIEWS CAROUSEL */}
      <section className="border-y border-dark-border bg-dark-card/30 py-16 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 mb-10 text-center">
          <h2 className="section-title">What Our Customers Say</h2>
          <p className="text-dark-muted mt-2">Trusted by car enthusiasts across India</p>
        </div>

        <div className="flex gap-6 animate-marquee w-max">
          {[...REVIEWS, ...REVIEWS].map((review, i) => (
            <div key={i} className="card p-5 w-72 shrink-0">
              <div className="flex items-center gap-1 mb-3">
                {[...Array(review.rating)].map((_, j) => (
                  <Star key={j} size={12} className="fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-dark-muted text-sm leading-relaxed mb-4">"{review.text}"</p>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary-500/20 rounded-full flex items-center justify-center text-primary-500 text-xs font-bold">
                  {review.name[0]}
                </div>
                <div>
                  <p className="text-dark-text text-xs font-semibold">{review.name}</p>
                  <p className="text-dark-muted text-xs">{review.city}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="relative rounded-3xl overflow-hidden border border-primary-500/20 bg-gradient-to-br from-primary-500/10 via-dark-card to-accent-400/5 p-10 sm:p-16 text-center"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-1 bg-gradient-to-r from-transparent via-primary-500 to-transparent" />
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-dark-text mb-4">
            Ready to Transform Your Car?
          </h2>
          <p className="text-dark-muted mb-8 max-w-xl mx-auto">
            Browse premium accessories for every Indian car brand. Fast delivery. Genuine products. Great prices.
          </p>
          <Link to="/shop" className="btn-primary inline-flex items-center gap-2 text-base px-8 py-4">
            Start Shopping <ArrowRight size={18} />
          </Link>
        </motion.div>
      </section>
    </>
  )
}
