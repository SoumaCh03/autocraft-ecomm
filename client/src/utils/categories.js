export const FALLBACK_CATEGORIES = [
  {
    name: 'Exterior',
    label: 'Exterior',
    slug: 'exterior',
    description: 'Body kits, wraps & more',
    icon: '\u{1F697}',
  },
  {
    name: 'Interior',
    label: 'Interior',
    slug: 'interior',
    description: 'Seat covers, mats & more',
    icon: '\u{1FA91}',
  },
  {
    name: 'Lighting',
    label: 'Lighting',
    slug: 'lighting',
    description: 'LED, HID & ambient lights',
    icon: '\u{1F4A1}',
  },
  {
    name: 'Electronics',
    label: 'Electronics',
    slug: 'electronics',
    description: 'Cameras, GPS & more',
    icon: '\u{1F4F1}',
  },
  {
    name: 'Car Care',
    label: 'Car Care',
    slug: 'car-care',
    description: 'Polish, wax & cleaners',
    icon: '\u{1F9F4}',
  },
  {
    name: 'Dashboard',
    label: 'Dashboard',
    slug: 'dashboard',
    description: 'Mounts, trims & gauges',
    icon: '\u{1F39B}\uFE0F',
  },
]

export const normalizeCategories = (categories = []) =>
  categories
    .filter((category) => category?.slug)
    .map((category) => ({
      ...category,
      name: category.name || category.label || category.slug,
      label: category.label || category.name || formatCategoryName(category.slug),
      description: category.description || category.desc || '',
      desc: category.desc || category.description || '',
      icon: category.icon || 'AC',
    }))

export const formatCategoryName = (slug = '') =>
  String(slug)
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

export const getCategoryDisplayName = (slug, categories = []) => {
  const match = categories.find((category) => category.slug === slug)
  return match?.label || match?.name || formatCategoryName(slug)
}
