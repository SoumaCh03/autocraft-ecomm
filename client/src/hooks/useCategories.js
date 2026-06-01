import { useEffect, useState } from 'react'
import axios from 'axios'
import BASE_URL from '../utils/api'
import { FALLBACK_CATEGORIES, normalizeCategories } from '../utils/categories'

const API = BASE_URL

export default function useCategories() {
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true

    const fetchCategories = async () => {
      setLoading(true)

      try {
        const { data } = await axios.get(`${API}/categories`)
        if (active) {
          const normalized = normalizeCategories(data.categories || [])
          setCategories(normalized.length ? normalized : FALLBACK_CATEGORIES)
        }
      } catch {
        if (active) setCategories(FALLBACK_CATEGORIES)
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchCategories()

    return () => {
      active = false
    }
  }, [])

  return { categories, loading }
}
