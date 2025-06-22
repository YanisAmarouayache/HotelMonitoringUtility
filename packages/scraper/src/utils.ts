// Global URL type for Node.js
declare global {
  var URL: typeof URL;
}

/**
 * Parse price string like "€1.6K" to number
 */
export function parsePrice(priceStr: string): number {
  if (!priceStr) return 0;
  
  // Remove currency symbols and spaces
  const cleanPrice = priceStr.replace(/[€$£¥\s]/g, '');
  
  // Handle K suffix (thousands)
  if (cleanPrice.includes('K')) {
    const num = parseFloat(cleanPrice.replace('K', ''));
    return num * 1000;
  }
  
  // Handle M suffix (millions)
  if (cleanPrice.includes('M')) {
    const num = parseFloat(cleanPrice.replace('M', ''));
    return num * 1000000;
  }
  
  // Handle regular numbers
  return parseFloat(cleanPrice) || 0;
}

/**
 * Extract hotel ID from Booking.com URL
 */
export function extractHotelId(url: string): string | null {
  const match = url.match(/hotel\/([^\/]+)\/([^\/]+)\.html/);
  if (match) {
    return match[2];
  }
  
  // Try to extract from query parameters
  try {
    const urlObj = new URL(url);
    const highlightedHotels = urlObj.searchParams.get('highlighted_hotels');
    if (highlightedHotels) {
      return highlightedHotels;
    }
  } catch {
    // Invalid URL, continue with other methods
  }
  
  return null;
}

/**
 * Format date to YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get date range for scraping
 */
export function getDateRange(months: number = 2): { startDate: string; endDate: string } {
  const startDate = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + months);
  
  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate)
  };
}

/**
 * Validate Booking.com URL
 */
export function isValidBookingUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname === 'www.booking.com' && urlObj.pathname.includes('/hotel/');
  } catch {
    return false;
  }
} 