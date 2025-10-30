import { notFound } from 'next/navigation';
import StoreWebsite from '../../components/StoreWebsite';

async function getStoreData(slug) {
  try {
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? process.env.NEXTAUTH_URL || 'https://ivma.ng'
      : 'http://localhost:3001';
    
    const response = await fetch(`${baseUrl}/api/store/${slug}`, {
      cache: 'no-store'
    });
    
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching store data:', error);
    return null;
  }
}

export default async function StorePage({ params }) {
  const { slug } = await params;
  const storeData = await getStoreData(slug);
  
  if (!storeData) {
    notFound();
  }
  
  return <StoreWebsite store={storeData} />;
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const storeData = await getStoreData(slug);
  
  if (!storeData) {
    return {
      title: 'Store Not Found',
      description: 'The requested store could not be found.'
    };
  }
  
  return {
    title: `${storeData.storeName} - IVMA Store`,
    description: storeData.storeDescription || `Shop at ${storeData.storeName}`,
  };
}
