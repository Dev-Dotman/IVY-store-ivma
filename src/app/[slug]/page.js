import { notFound } from 'next/navigation';
import StoreWebsite from "@/components/StoreWebsite";
import connectDB from '@/lib/mongodb';
import Store from '@/models/Store';

// Generate metadata for SEO and social sharing
export async function generateMetadata({ params }) {
  try {
    await connectDB();
    const { slug } = await params;
    
    // Fetch store by slug
    const store = await Store.findOne({ 
      'ivmaWebsite.websitePath': slug,
      'ivmaWebsite.isEnabled': true 
    }).lean();

    if (!store) {
      return {
        title: 'Store Not Found',
        description: 'The store you are looking for does not exist.'
      };
    }

    const seoSettings = store.ivmaWebsite?.seoSettings || {};
    
    return {
      title: seoSettings.metaTitle || `${store.storeName} - Quality Products Online`,
      description: seoSettings.metaDescription || `Shop quality products at ${store.storeName}. ${store.storeDescription}`,
      keywords: seoSettings.keywords?.join(', ') || '',
      icons: {
        icon: store.branding?.logo || '/favicon.ico',
        apple: store.branding?.logo || '/favicon.ico',
      },
      openGraph: {
        title: seoSettings.metaTitle || `${store.storeName} - Quality Products Online`,
        description: seoSettings.metaDescription || `Shop quality products at ${store.storeName}`,
        images: [store.branding?.banner || store.branding?.logo || '/og-image.jpg'],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: seoSettings.metaTitle || `${store.storeName} - Quality Products Online`,
        description: seoSettings.metaDescription || `Shop quality products at ${store.storeName}`,
        images: [store.branding?.banner || store.branding?.logo || '/og-image.jpg'],
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'IVMA Store',
      description: 'Your marketplace for artisan products'
    };
  }
}

// Make this a Server Component
export default async function StorePage({ params }) {
  const { slug } = await params;
  
  await connectDB();
  
  const store = await Store.findOne({ 
    'ivmaWebsite.websitePath': slug,
    'ivmaWebsite.isEnabled': true 
  }).lean();

  if (!store) {
    notFound();
  }

  // Convert MongoDB ObjectId to string
  const storeData = JSON.parse(JSON.stringify(store));

  return <StoreWebsite store={storeData} />;
}
