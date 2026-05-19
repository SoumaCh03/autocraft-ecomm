import { Helmet } from 'react-helmet-async'

export default function ProductSEO({ product, displayProduct, isOutOfStock }) {
  const productUrl = `${window.location.origin}/product/${product._id}`
  const productImage = displayProduct.images?.[0] || `${window.location.origin}/logo.png`
  const seoDescription = product.description?.slice(0, 155) || `${product.name} by AUTOCRAFT`

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
    <Helmet>
      <title>{product.name} - AUTOCRAFT</title>
      <meta name="description" content={seoDescription} />
      <meta name="keywords" content={[product.name, product.category, ...(product.tags || []), ...(product.carBrands || []), 'AUTOCRAFT', 'car accessories india'].join(', ')} />
      <meta property="og:type" content="product" />
      <meta property="og:title" content={`${product.name} - AUTOCRAFT`} />
      <meta property="og:description" content={seoDescription} />
      <meta property="og:image" content={productImage} />
      <meta property="og:url" content={productUrl} />
      <meta property="product:price:amount" content={String(displayProduct.price)} />
      <meta property="product:price:currency" content="INR" />
      <meta property="product:availability" content={isOutOfStock ? 'out of stock' : 'in stock'} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={`${product.name} - AUTOCRAFT`} />
      <meta name="twitter:description" content={seoDescription} />
      <meta name="twitter:image" content={productImage} />
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
      <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
    </Helmet>
  )
}
