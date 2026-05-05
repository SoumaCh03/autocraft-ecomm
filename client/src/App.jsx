import { Routes, Route } from 'react-router-dom'
import { useTheme } from './context/ThemeContext'

// Layout
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'

// Pages
import HomePage        from './pages/HomePage'
import ShopPage        from './pages/ShopPage'
import ProductPage     from './pages/ProductPage'
import CartPage        from './pages/CartPage'
import CheckoutPage    from './pages/CheckoutPage'
import OrderSuccess    from './pages/OrderSuccess'
import LoginPage       from './pages/LoginPage'
import RegisterPage    from './pages/RegisterPage'
import ForgotPassword  from './pages/ForgotPassword'
import ResetPassword   from './pages/ResetPassword'
import ProfilePage     from './pages/ProfilePage'
import OrdersPage      from './pages/OrdersPage'
import OrderDetailPage from './pages/OrderDetailPage'

// Admin Pages
import AdminDashboard  from './pages/admin/AdminDashboard'
import AdminProducts   from './pages/admin/AdminProducts'
import AdminOrders     from './pages/admin/AdminOrders'

// Guards
import ProtectedRoute  from './components/ui/ProtectedRoute'
import AdminRoute      from './components/ui/AdminRoute'

// UI Components
import WhatsAppButton from './components/ui/WhatsAppButton'

export default function App() {
  const { isDark } = useTheme()

  return (
    <div className={isDark ? 'dark' : ''}>
      <div className="min-h-screen bg-dark-bg dark:bg-dark-bg text-dark-text">
        <Navbar />
        <main>
          <Routes>
            {/* Public */}
            <Route path="/"                    element={<HomePage />} />
            <Route path="/shop"                element={<ShopPage />} />
            <Route path="/shop/:category"      element={<ShopPage />} />
            <Route path="/product/:id"         element={<ProductPage />} />
            <Route path="/cart"                element={<CartPage />} />
            <Route path="/login"               element={<LoginPage />} />
            <Route path="/register"            element={<RegisterPage />} />
            <Route path="/forgot-password"     element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />

            {/* Protected (logged in customers) */}
            <Route element={<ProtectedRoute />}>
              <Route path="/checkout"          element={<CheckoutPage />} />
              <Route path="/order-success"     element={<OrderSuccess />} />
              <Route path="/profile"           element={<ProfilePage />} />
              <Route path="/my-orders"         element={<OrdersPage />} />
              <Route path="/order/:id" element={<OrderDetailPage />} />
            </Route>

            {/* Admin only */}
            <Route element={<AdminRoute />}>
              <Route path="/admin"             element={<AdminDashboard />} />
              <Route path="/admin/products"    element={<AdminProducts />} />
              <Route path="/admin/orders"      element={<AdminOrders />} />
            </Route>
          </Routes>
        </main>
        <Footer />
        <WhatsAppButton />
      </div>
    </div>
  )
}

