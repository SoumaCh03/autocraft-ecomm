import { Routes, Route, useLocation } from 'react-router-dom'
import { useTheme } from './context/ThemeContext'
import { useEffect, lazy, Suspense } from 'react'

// Static layout components & guards
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import CustomCursor from "./components/ui/CustomCursor"
import ProtectedRoute from './components/ui/ProtectedRoute'
import AdminRoute from './components/ui/AdminRoute'
import WhatsAppButton from './components/ui/WhatsAppButton'

// Lazy-loaded page components for route splitting & bundle optimization
const HomePage       = lazy(() => import('./pages/HomePage'))
const ShopPage       = lazy(() => import('./pages/ShopPage'))
const ProductPage    = lazy(() => import('./pages/ProductPage'))
const CartPage       = lazy(() => import('./pages/CartPage'))
const CheckoutPage   = lazy(() => import('./pages/CheckoutPage'))
const OrderSuccess   = lazy(() => import('./pages/OrderSuccess'))
const LoginPage      = lazy(() => import('./pages/LoginPage'))
const RegisterPage   = lazy(() => import('./pages/RegisterPage'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword  = lazy(() => import('./pages/ResetPassword'))
const ProfilePage    = lazy(() => import('./pages/ProfilePage'))
const OrdersPage     = lazy(() => import('./pages/OrdersPage'))
const OrderDetailPage = lazy(() => import('./pages/OrderDetailPage'))
const NotFoundPage   = lazy(() => import('./pages/NotFoundPage'))
const Wishlist       = lazy(() => import('./pages/Wishlist'))

// Lazy-loaded Admin page components
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminProducts  = lazy(() => import('./pages/admin/AdminProducts'))
const AdminOrders    = lazy(() => import('./pages/admin/AdminOrders'))

// Premium Glassmorphic Loading Screen
const LoadingFallback = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark-bg/80 backdrop-blur-md">
    <div className="relative flex flex-col items-center gap-4 p-8 rounded-2xl border border-dark-border/40 bg-dark-card/60 shadow-2xl glass animate-fade-in">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 border-4 border-primary-500/20 rounded-full" />
        <div className="absolute inset-0 border-4 border-transparent border-t-primary-500 border-l-primary-500 rounded-full animate-spin" />
      </div>
      <div className="flex flex-col items-center text-center">
        <h2 className="font-display font-bold text-lg text-dark-text tracking-wide bg-gradient-to-r from-primary-500 to-accent-400 bg-clip-text text-transparent">
          AUTOCRAFT
        </h2>
        <p className="text-[10px] text-dark-muted mt-1 tracking-widest uppercase animate-pulse font-medium">
          Loading Premium Interface...
        </p>
      </div>
    </div>
  </div>
)

const ScrollToHash = () => {
  const location = useLocation()

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '')
      const element = document.getElementById(id)
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          })
        }, 100)
      }
    } else {
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      })
    }
  }, [location])

  return null
}

export default function App() {
  const { isDark } = useTheme()
  const location = useLocation()

  const validRoutes = [
    '/',
    '/shop',
    '/cart',
    '/login',
    '/register',
    '/forgot-password',
    '/checkout',
    '/order-success',
    '/profile',
    '/my-orders',
    '/wishlist',
    '/admin',
    '/admin/products',
    '/admin/orders',
  ]

  const is404 =
    !validRoutes.includes(location.pathname) &&
    !location.pathname.startsWith('/product/') &&
    !location.pathname.startsWith('/shop/') &&
    !location.pathname.startsWith('/order/') &&
    !location.pathname.startsWith('/reset-password/')

  return (
    <div className={isDark ? 'dark' : ''}>
      <div className="min-h-screen bg-dark-bg dark:bg-dark-bg text-dark-text">
        {/* Scroll Fix */}
        <ScrollToHash />

        {/* Custom Cursor */}
        <CustomCursor />

        {!is404 && <Navbar />}

        <main>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              {/* Public */}
              <Route path="/" element={<HomePage />} />
              <Route path="/shop" element={<ShopPage />} />
              <Route path="/shop/:category" element={<ShopPage />} />
              <Route path="/product/:id" element={<ProductPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password/:token" element={<ResetPassword />} />

              {/* Protected */}
              <Route element={<ProtectedRoute />}>
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/order-success" element={<OrderSuccess />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/my-orders" element={<OrdersPage />} />
                <Route path="/order/:id" element={<OrderDetailPage />} />
                <Route path="/wishlist" element={<Wishlist />} />
              </Route>

              {/* Admin */}
              <Route element={<AdminRoute />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/products" element={<AdminProducts />} />
                <Route path="/admin/orders" element={<AdminOrders />} />
              </Route>

              {/* 404 */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </main>

        {!is404 && <Footer />}
        {!is404 && <WhatsAppButton />}
      </div>
    </div>
  )
}
