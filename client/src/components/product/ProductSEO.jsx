import SEO from '../seo/SEO'

export default function ProductSEO({ product, displayProduct, isOutOfStock }) {
  const productUrl = `${window.location.origin}/product/${product._id}`
  const productImage = displayProduct.images?.[0] || `${window.location.origin}/logo.png`
  const seoDescription = product.description?.slice(0, 155) || `${product.name} available at AUTOCRAFT Cooch Behar. Premium car accessories and modification.`

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: displayProduct.images || [],
    description: product.description,
    sku: product._id,
    brand: { '@type': 'Brand', name: 'AUTOCRAFT' },
    category: product.category,
    offers: {
      '@type': 'Offer',
      url: productUrl,
      priceCurrency: 'INR',
      price: displayProduct.price,
      availability: isOutOfStock ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
    aggregateRating: product.numReviews > 0 ? {
      '@type': 'AggregateRating',
      ratingValue: product.rating,
      reviewCount: product.numReviews,
    } : undefined,
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: window.location.origin },
      { '@type': 'ListItem', position: 2, name: 'Shop', item: `${window.location.origin}/shop` },
      { '@type': 'ListItem', position: 3, name: product.name, item: productUrl },
    ],
  }

  return (
    <SEO
      title={product.name}
      description={seoDescription}
      keywords={[product.name, product.category, ...(product.tags || []), ...(product.carBrands || []), 'AUTOCRAFT Cooch Behar', 'car modification cooch behar', 'car accessories'].join(', ')}
      url={productUrl}
      image={productImage}
      type="product"
      schemaList={[schema, breadcrumbSchema]}
    />
  )
}
