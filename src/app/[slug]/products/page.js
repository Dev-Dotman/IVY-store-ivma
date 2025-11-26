import { notFound } from 'next/navigation';
import ProductsPageClient from '@/components/product/ProductsPageClient';
import connectDB from '@/lib/mongodb';
import Store from '@/models/Store';
import Inventory from '@/models/Inventory';

// Generate metadata
export async function generateMetadata({ params }) {
  try {
    await connectDB();
    const { slug } = await params;
    
    const store = await Store.findOne({ 
      'ivmaWebsite.websitePath': slug 
    }).lean();

    if (!store) {
      return { title: 'Products Not Found' };
    }

    return {
      title: `Products - ${store.storeName}`,
      description: `Browse all products at ${store.storeName}. ${store.storeDescription}`,
      icons: {
        icon: store.branding?.logo || '/favicon.ico',
        apple: store.branding?.logo || '/favicon.ico',
      },
    };
  } catch (error) {
    console.error('Error generating products metadata:', error);
    return { title: 'Products' };
  }
}

export default async function ProductsPage({ params }) {
  const { slug } = await params;
  
  await connectDB();
  
  const store = await Store.findOne({ 
    'ivmaWebsite.websitePath': slug 
  }).lean();

  if (!store) {
    notFound();
  }

  // Fetch all active products for this store
  const products = await Inventory.find({
    userId: store.userId,
    status: 'Active',
    webVisibility: true
  }).lean();

  const storeData = JSON.parse(JSON.stringify(store));
  const productsData = JSON.parse(JSON.stringify(products));

  return <ProductsPageClient store={storeData} products={productsData} slug={slug} />;
}
