import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import BASE_URL from '../utils/api'
import { useAuth } from './AuthContext'

const WishlistContext = createContext()
const API = BASE_URL

export const WishlistProvider = ({ children }) => {
  const { user } = useAuth()
  const [wishlist, setWishlist] = useState([])
  const [loading, setLoading] = useState(false)

  const wishlistIds = useMemo(() => new Set(wishlist.map((item) => item._id)), [wishlist])

  useEffect(() => {
    const fetchWishlist = async () => {
      if (!user) {
        setWishlist([])
        return
      }

      setLoading(true)
      try {
        const { data } = await axios.get(`${API}/auth/wishlist`, { withCredentials: true })
        setWishlist(data.wishlist || [])
      } catch {
        setWishlist([])
      } finally {
        setLoading(false)
      }
    }

    fetchWishlist()
  }, [user])

  const isWishlisted = (productId) => wishlistIds.has(productId)

  const toggleWishlist = async (product) => {
    if (!user) {
      toast.error('Please login to use wishlist')
      return false
    }

    try {
      if (isWishlisted(product._id)) {
        const { data } = await axios.delete(`${API}/auth/wishlist/${product._id}`, { withCredentials: true })
        setWishlist(data.wishlist || [])
        toast.success('Removed from wishlist')
        return false
      }

      const { data } = await axios.post(`${API}/auth/wishlist/${product._id}`, {}, { withCredentials: true })
      setWishlist(data.wishlist || [])
      toast.success('Added to wishlist')
      return true
    } catch (err) {
      toast.error(err.response?.data?.message || 'Wishlist update failed')
      return isWishlisted(product._id)
    }
  }

  return (
    <WishlistContext.Provider value={{ wishlist, wishlistIds, loading, isWishlisted, toggleWishlist }}>
      {children}
    </WishlistContext.Provider>
  )
}

export const useWishlist = () => useContext(WishlistContext)
