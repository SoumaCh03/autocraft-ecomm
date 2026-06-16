import React from 'react';
import { Helmet } from 'react-helmet-async';

const SEO = ({ 
  title, 
  description, 
  keywords, 
  url, 
  image = 'https://autocraft.in/logo.png',
  type = 'website',
  schemaList = []
}) => {
  const siteName = "AUTOCRAFT Cooch Behar";
  const defaultDescription = "AUTOCRAFT Cooch Behar is a premium car accessories, car decoration and car modification shop serving Cooch Behar, North Bengal and all over India.";
  const defaultKeywords = "Autocraft, Autocraft Cooch Behar, Autocraft Koch Bihar, Car Modification Cooch Behar, Car Accessories Cooch Behar, Best Car Modification in Cooch Behar, Car Customization";

  const finalTitle = title ? `${title} | ${siteName}` : siteName;
  const finalDescription = description || defaultDescription;
  const finalKeywords = keywords || defaultKeywords;
  
  // Use the current window URL or fallback to vercel domain
  const canonicalUrl = url || (typeof window !== 'undefined' ? window.location.href.split('?')[0] : 'https://autocraftcob.vercel.app');

  // Base Organization and LocalBusiness Schema for Every Page
  const baseSchema = {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "AutoPartsStore", "Store"],
    "@id": "https://autocraft.in/#business",
    "name": "AUTOCRAFT",
    "alternateName": [
      "Autocraft Cooch Behar",
      "Autocraft Koch Bihar",
      "Auto Craft Cooch Behar",
      "Autocraft Anupam",
      "Autocraft Pom",
      "Autocraft Sayan"
    ],
    "url": "https://autocraftcob.vercel.app/",
    "logo": "https://autocraftcob.vercel.app/logo.png",
    "image": "https://autocraftcob.vercel.app/logo.png",
    "description": finalDescription,
    "email": "hello@autocraft.in",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Old Military Hospital Road, Gowala Patti",
      "addressLocality": "Cooch Behar",
      "addressRegion": "West Bengal",
      "postalCode": "736101",
      "addressCountry": "IN"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": "26.3262", 
      "longitude": "89.4533" 
    },
    "areaServed": [
      { "@type": "Place", "name": "Cooch Behar" },
      { "@type": "Place", "name": "Koch Bihar" },
      { "@type": "Place", "name": "Dinhata" },
      { "@type": "Place", "name": "Falakata" },
      { "@type": "Place", "name": "Jalpaiguri" },
      { "@type": "Place", "name": "Siliguri" }
    ],
    "priceRange": "₹₹",
    "knowsAbout": [
      "Car Modification",
      "Car Accessories",
      "Vehicle Styling",
      "Car Customization",
      "Seat Covers",
      "Android Screens"
    ]
  };

  return (
    <Helmet>
      {/* Standard Metadata */}
      <title>{finalTitle}</title>
      <meta name="description" content={finalDescription} />
      <meta name="keywords" content={finalKeywords} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={image} />
      <meta property="og:locale" content="en_IN" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={finalTitle} />
      <meta name="twitter:description" content={finalDescription} />
      <meta name="twitter:image" content={image} />

      {/* Additional Signals */}
      <meta name="application-name" content="AUTOCRAFT" />
      <meta name="geo.region" content="IN-WB" />
      <meta name="geo.placename" content="Cooch Behar, West Bengal" />

      {/* Core Schema Injection */}
      <script type="application/ld+json">
        {JSON.stringify(baseSchema)}
      </script>

      {/* Additional Page-Specific Schemas */}
      {schemaList.map((schema, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
};

export default SEO;
