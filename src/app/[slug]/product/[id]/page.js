import { notFound } from 'next/navigation';
import ProductDetailsClient from '@/components/product/ProductDetailsClient';
import connectDB from '@/lib/mongodb';
import Store from '@/models/Store';
import Inventory from '@/models/Inventory';
import InventoryBatch from '@/models/InventoryBatch';

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

    // Fetch product with batch pricing
    const product = await Inventory.findOne({
      _id: id,
      userId: store.userId,
      status: 'Active'
    }).lean();

    if (!product) {
      return { title: 'Product Not Found' };
    }

    // Get batches for accurate pricing
    const batches = await InventoryBatch.find({
      productId: id,
      status: 'active'
    }).sort({ dateReceived: 1 }).lean();

    // Calculate actual remaining quantities
    const batchesWithActualRemaining = batches.map(batch => {
      const actualQuantityRemaining = (batch.quantityIn || 0) - (batch.quantitySold || 0);
      return {
        ...batch,
        actualQuantityRemaining: Math.max(0, actualQuantityRemaining)
      };
    });

    // Filter to only batches with stock
    const activeBatches = batchesWithActualRemaining.filter(batch => batch.actualQuantityRemaining > 0);
    const currentActiveBatch = activeBatches.length > 0 ? activeBatches[0] : null;

    // Use batch pricing if available
    const currentPrice = currentActiveBatch ? currentActiveBatch.sellingPrice : product.sellingPrice;
    const totalAvailableQuantity = activeBatches.length > 0 
      ? activeBatches.reduce((sum, batch) => sum + batch.actualQuantityRemaining, 0)
      : product.quantityInStock || 0;

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
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [productImageUrl],
      },
      other: {
        'product:price:amount': currentPrice?.toString(),
        'product:price:currency': store.settings?.currency || 'NGN',
        'product:availability': totalAvailableQuantity > 0 ? 'in stock' : 'out of stock',
        'product:category': product.category,
        'product:brand': product.brand || store.storeName,
        'og:type': 'product',
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

  // Get ALL batches for this product, sorted by FIFO (dateReceived ascending)
  const batches = await InventoryBatch.find({
    productId: id,
    status: 'active'
  }).sort({ dateReceived: 1 }).lean(); // FIFO order - oldest first

  // Calculate actual remaining quantities BEFORE filtering
  const batchesWithActualRemaining = batches.map(batch => {
    const actualQuantityRemaining = (batch.quantityIn || 0) - (batch.quantitySold || 0);
    return {
      ...batch,
      actualQuantityRemaining: Math.max(0, actualQuantityRemaining)
    };
  });

  // Filter to ONLY batches that have stock
  const activeBatches = batchesWithActualRemaining.filter(batch => batch.actualQuantityRemaining > 0);

  // Find the current active batch using FIFO logic (first batch with stock)
  const currentActiveBatch = activeBatches.length > 0 ? activeBatches[0] : null;

  // Calculate batch-based pricing and availability
  let currentPrice = product.sellingPrice; // fallback
  let totalAvailableQuantity = 0;
  let priceRange = { min: null, max: null };
  let hasBatches = activeBatches.length > 0;

  if (currentActiveBatch) {
    // Use the FIRST batch with stock (FIFO) for current pricing
    currentPrice = currentActiveBatch.sellingPrice;
    
    // Calculate total available quantity from all batches with stock
    totalAvailableQuantity = activeBatches.reduce((sum, batch) => sum + batch.actualQuantityRemaining, 0);
    
    // Calculate price range across all active batches
    const prices = activeBatches.map(batch => batch.sellingPrice);
    priceRange = {
      min: Math.min(...prices),
      max: Math.max(...prices)
    };
  } else {
    // No active batches with stock, use inventory stock if batch system not in use
    totalAvailableQuantity = product.quantityInStock || 0;
  }

  // Calculate weighted averages across all batches (for reference)
  const totalQuantityIn = batchesWithActualRemaining.reduce((sum, batch) => sum + (batch.quantityIn || 0), 0);
  const weightedSellingSum = batchesWithActualRemaining.reduce((sum, batch) => 
    sum + ((batch.sellingPrice || 0) * (batch.quantityIn || 0)), 0
  );
  const averageSellingPrice = totalQuantityIn > 0 ? weightedSellingSum / totalQuantityIn : currentPrice;

  // Prepare enhanced product data with batch pricing
  const enhancedProduct = {
    ...product,
    // Override pricing with CURRENT BATCH pricing (FIFO)
    sellingPrice: currentPrice,
    
    // Override quantity with total available from all batches
    quantityInStock: totalAvailableQuantity,
    
    // Include ALL category-specific details
    categoryDetails: {
      clothing: product.clothingDetails,
      shoes: product.shoesDetails,
      accessories: product.accessoriesDetails,
      perfume: product.perfumeDetails,
      food: product.foodDetails,
      beverages: product.beveragesDetails,
      electronics: product.electronicsDetails,
      books: product.booksDetails,
      homeGarden: product.homeGardenDetails,
      sports: product.sportsDetails,
      automotive: product.automotiveDetails,
      healthBeauty: product.healthBeautyDetails
    },
    
    // Batch information - only include batches with actual stock
    batches: activeBatches.map(batch => ({
      _id: batch._id,
      batchCode: batch.batchCode,
      quantityIn: batch.quantityIn,
      quantitySold: batch.quantitySold,
      quantityRemaining: batch.actualQuantityRemaining,
      sellingPrice: batch.sellingPrice,
      dateReceived: batch.dateReceived,
      expiryDate: batch.expiryDate,
      supplier: batch.supplier,
      isExpired: batch.expiryDate ? new Date() > batch.expiryDate : false,
      daysUntilExpiry: batch.expiryDate ? Math.ceil((batch.expiryDate - new Date()) / (1000 * 60 * 60 * 24)) : null,
      isCurrentBatch: currentActiveBatch ? batch._id.toString() === currentActiveBatch._id.toString() : false
    })),
    
    // Batch metadata
    batchInfo: {
      hasBatches: hasBatches,
      totalBatches: activeBatches.length,
      totalAvailableQuantity,
      currentBatchId: currentActiveBatch?._id,
      currentBatchCode: currentActiveBatch?.batchCode,
      currentBatchRemaining: currentActiveBatch ? currentActiveBatch.actualQuantityRemaining : 0,
      priceRange: activeBatches.length > 0 ? priceRange : null,
      oldestBatchDate: activeBatches.length > 0 ? activeBatches[0]?.dateReceived : null,
      newestBatchDate: activeBatches.length > 0 ? activeBatches[activeBatches.length - 1]?.dateReceived : null,
      averagePrice: averageSellingPrice,
      methodology: 'FIFO - First In, First Out (oldest batches sold first)'
    },
    
    // Pricing information
    pricing: {
      current: currentPrice, // Current selling price from FIFO batch
      average: averageSellingPrice, // Weighted average across all batches
      hasVariablePricing: priceRange && priceRange.min !== priceRange.max,
      range: priceRange
    }
  };

  // Convert to plain objects
  const storeData = JSON.parse(JSON.stringify(store));
  const productData = JSON.parse(JSON.stringify(enhancedProduct));

  return <ProductDetailsClient store={storeData} product={productData} slug={slug} />;
}
