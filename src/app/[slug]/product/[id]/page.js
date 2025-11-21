import { notFound } from 'next/navigation';
import ProductDetailsClient from '@/components/product/ProductDetailsClient';
import connectDB from '@/lib/mongodb';
import Store from '@/models/Store';
import Inventory from '@/models/Inventory';

// Generate metadata for SEO and social sharing
export async function generateMetadata({ params }) {
  try {
    await connectDB();
    const { slug, id } = await params;
    
    // Fetch store
    const store = await Store.findOne({ 
      'ivmaWebsite.websitePath': slug 
    }).lean();

    if (!store) {
      return { title: 'Product Not Found' };
    }

    // Fetch product
    const product = await Inventory.findOne({
      _id: id,
      userId: store.userId,
      status: 'Active'
    }).lean();

    if (!product) {
      return { title: 'Product Not Found' };
    }

    const title = `${product.productName} - ${store.storeName}`;
    const description = product.description || `Buy ${product.productName} at ${store.storeName}. Category: ${product.category}.`;
    const productImageUrl = product.image || store.branding?.logo || '/og-image.jpg';

    return {
      title,
      description,
      keywords: [product.productName, product.category, product.brand, store.storeName, 'buy online'].filter(Boolean).join(', '),
      icons: {
        icon: product.image || store.branding?.logo || '/favicon.ico',
        apple: product.image || store.branding?.logo || '/favicon.ico',
      },
      openGraph: {
        title,
        description,
        images: [
          {
            url: productImageUrl,
            width: 1200,
            height: 630,
            alt: product.productName,
          }
        ],
        siteName: store.storeName,
        locale: 'en_US',
        type: 'website', // Changed from 'product' to 'website'
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [productImageUrl],
      },
      other: {
        // Product-specific meta tags (for other crawlers that support them)
        'product:price:amount': product.sellingPrice?.toString(),
        'product:price:currency': store.settings?.currency || 'NGN',
        'product:availability': product.quantityInStock > 0 ? 'in stock' : 'out of stock',
        'product:category': product.category,
        'product:brand': product.brand || store.storeName,
        'og:type': 'product', // Add this for social media crawlers
      }
    };
  } catch (error) {
    console.error('Error generating product metadata:', error);
    return { title: 'Product' };
  }
}

// Server Component
export default async function ProductPage({ params }) {
  const { slug, id } = await params;
  
  await connectDB();
  
  const store = await Store.findOne({ 
    'ivmaWebsite.websitePath': slug 
  }).lean();

  if (!store) {
    notFound();
  }

  const product = await Inventory.findOne({
    _id: id,
    userId: store.userId,
    status: 'Active'
  }).lean();

  if (!product) {
    notFound();
  }

  // Convert to plain objects
  const storeData = JSON.parse(JSON.stringify(store));
  const productData = JSON.parse(JSON.stringify(product));

  return <ProductDetailsClient store={storeData} product={productData} slug={slug} />;
}
