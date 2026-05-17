import { Routes, Route, useLocation } from 'react-router-dom'
import { useTheme } from './context/ThemeContext'
import { useEffect } from 'react'

// Layout
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'

// Pages
import CustomCursor from "./components/ui/CustomCursor"
import HomePage from './pages/HomePage'
import ShopPage from './pages/ShopPage'
import ProductPage from './pages/ProductPage'
import CartPage from './pages/CartPage'
import CheckoutPage from './pages/CheckoutPage'
import OrderSuccess from './pages/OrderSuccess'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import ProfilePage from './pages/ProfilePage'
import OrdersPage from './pages/OrdersPage'
import OrderDetailPage from './pages/OrderDetailPage'
import NotFoundPage from './pages/NotFoundPage'
import Wishlist from './pages/Wishlist'

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminProducts from './pages/admin/AdminProducts'
import AdminOrders from './pages/admin/AdminOrders'

// Guards
import ProtectedRoute from './components/ui/ProtectedRoute'
import AdminRoute from './components/ui/AdminRoute'

// UI Components
import WhatsAppButton from './components/ui/WhatsAppButton'

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

  // Valid routes
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
            <Route
              path="/reset-password/:token"
              element={<ResetPassword />}
            />

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
        </main>

        {!is404 && <Footer />}
        {!is404 && <WhatsAppButton />}
      </div>
    </div>
  )
}
