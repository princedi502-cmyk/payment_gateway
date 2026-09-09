import { Helmet } from 'react-helmet-async'

const SITE_NAME = 'PaymentHub'
const DEFAULT_DESCRIPTION = 'Your trusted destination for quality products with secure, seamless payments powered by Stripe.'
const DEFAULT_IMAGE = '/og-image.png'
const SITE_URL = 'https://paymenthub.com'

function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_IMAGE,
  url,
  type = 'website',
  product = null,
}) {
  const pageTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME
  const pageUrl = url ? `${SITE_URL}${url}` : SITE_URL
  const pageImage = image.startsWith('http') ? image : `${SITE_URL}${image}`

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{pageTitle}</title>
      <meta name="description" content={description} />
      <meta name="robots" content="index, follow" />
      <link rel="canonical" href={pageUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={pageUrl} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={pageImage} />
      <meta property="og:site_name" content={SITE_NAME} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={pageUrl} />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={pageImage} />

      {/* Product-specific meta tags */}
      {product && (
        <>
          <meta property="og:type" content="product" />
          <meta property="product:price:amount" content={product.price} />
          <meta property="product:price:currency" content="USD" />
        </>
      )}

      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': type === 'product' ? 'Product' : 'WebSite',
          name: type === 'product' ? product?.title : SITE_NAME,
          description: description,
          url: pageUrl,
          ...(type === 'product' && product
            ? {
                image: pageImage,
                offers: {
                  '@type': 'Offer',
                  price: product.price,
                  priceCurrency: 'USD',
                  availability: 'https://schema.org/InStock',
                },
                aggregateRating: product.rating
                  ? {
                      '@type': 'AggregateRating',
                      ratingValue: product.rating,
                      reviewCount: product.reviews || 0,
                    }
                  : undefined,
              }
            : {
                potentialAction: {
                  '@type': 'SearchAction',
                  target: `${SITE_URL}/search?q={search_term_string}`,
                  'query-input': 'required name=search_term_string',
                },
              }),
        })}
      </script>
    </Helmet>
  )
}

export function BreadcrumbSchema({ items }) {
  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            item: item.href ? `${SITE_URL}${item.href}` : undefined,
          })),
        })}
      </script>
    </Helmet>
  )
}

export function OrganizationSchema() {
  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: SITE_NAME,
          url: SITE_URL,
          logo: `${SITE_URL}/logo.png`,
          sameAs: [
            'https://facebook.com/paymenthub',
            'https://twitter.com/paymenthub',
            'https://instagram.com/paymenthub',
          ],
        })}
      </script>
    </Helmet>
  )
}

export default SEO
