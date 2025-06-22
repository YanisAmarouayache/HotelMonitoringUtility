import { chromium, Browser, Page } from 'playwright';
import type { ScrapedHotelData, AvailabilityDay, ScraperConfig } from './types';

/**
 * Parse price string from Booking.com format to number
 * Examples: "€1.6K" -> 1600, "€150" -> 150, "$2.5K" -> 2500
 */
function parsePriceString(priceStr: string): number {
  if (!priceStr) return 0;
  
  // Remove currency symbols and spaces
  const cleanPrice = priceStr.replace(/[€$£¥\s]/g, '');
  
  // Handle K suffix (thousands)
  if (cleanPrice.includes('K')) {
    const numberPart = parseFloat(cleanPrice.replace('K', ''));
    return numberPart * 1000;
  }
  
  // Handle M suffix (millions)
  if (cleanPrice.includes('M')) {
    const numberPart = parseFloat(cleanPrice.replace('M', ''));
    return numberPart * 1000000;
  }
  
  // Regular number
  return parseFloat(cleanPrice) || 0;
}

/**
 * Extract hotel ID from Booking.com URL
 */
function extractHotelIdFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    
    // Try to extract from highlighted_hotels parameter
    const highlightedHotels = urlObj.searchParams.get('highlighted_hotels');
    if (highlightedHotels) {
      return highlightedHotels;
    }
    
    // Try to extract from path segments
    const pathSegments = urlObj.pathname.split('/');
    const hotelIndex = pathSegments.findIndex((segment: string) => segment === 'hotel');
    if (hotelIndex !== -1 && pathSegments[hotelIndex + 2]) {
      // URL format: /hotel/{country}/{hotel-id}.html
      const hotelSegment = pathSegments[hotelIndex + 2];
      const match = hotelSegment.match(/^(\d+)/);
      return match ? match[1] : null;
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Validate Booking.com URL
 */
function isValidBookingUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname === 'www.booking.com' && urlObj.pathname.includes('/hotel/');
  } catch {
    return false;
  }
}

/**
 * Extract currency from price string
 */
function extractCurrencyFromPrice(priceStr: string): string {
  const currencyMatch = priceStr.match(/^[€$£¥]/);
  return currencyMatch ? currencyMatch[0] : 'EUR';
}

/**
 * Main function to scrape hotel data from Booking.com
 */
export async function scrapeHotelViaGraphQL(
  hotelUrl: string, 
  months: number = 2, 
  config: ScraperConfig = {}
): Promise<ScrapedHotelData> {
  if (!isValidBookingUrl(hotelUrl)) {
    throw new Error('Invalid Booking.com URL provided');
  }

  const {
    headless = true,
    timeout = 30000,
    userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    acceptLanguage = 'en-US,en;q=0.9'
  } = config;

  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    // Launch browser
    browser = await chromium.launch({ headless });
    const context = await browser.newContext({
      userAgent,
      extraHTTPHeaders: {
        'Accept-Language': acceptLanguage,
      },
    });

    page = await context.newPage();
    page.setDefaultTimeout(timeout);

    // Navigate to the hotel page
    await page.goto(hotelUrl, { waitUntil: 'networkidle' });

    // Extract hotel metadata from DOM
    const hotelMetadata = await extractHotelMetadata(page);

    // For now, return mock data since we need to implement the full scraping logic
    const availabilityDays: AvailabilityDay[] = [];
    const today = new Date();
    
    // Generate mock availability data for the next 2 months
    for (let i = 0; i < 60; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      
      availabilityDays.push({
        checkin: date.toISOString().split('T')[0],
        price: Math.floor(Math.random() * 200) + 100, // Random price between 100-300
        available: Math.random() > 0.1, // 90% availability
        minLengthOfStay: Math.random() > 0.8 ? 2 : undefined,
      });
    }

    return {
      hotelId: extractHotelIdFromUrl(hotelUrl) || undefined,
      hotelName: hotelMetadata.name || 'Hotel Name Not Found',
      location: hotelMetadata.location || 'Location Not Found',
      currency: 'EUR',
      ratingOverall: hotelMetadata.ratingOverall,
      ratingLocation: hotelMetadata.ratingLocation,
      amenities: hotelMetadata.amenities,
      availabilityDays,
    };

  } catch (error) {
    console.error('Error scraping hotel:', error);
    throw new Error(`Failed to scrape hotel data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    if (page) await page.close();
    if (browser) await browser.close();
  }
}

/**
 * Extract hotel metadata from DOM
 */
async function extractHotelMetadata(page: Page): Promise<{
  name?: string;
  location?: string;
  ratingOverall?: number;
  ratingLocation?: number;
  amenities: string[];
}> {
  const metadata = { amenities: [] as string[] };

  try {
    // Extract hotel name
    const nameSelectors = [
      'h2[data-testid="title"]',
      '#hp_hotel_name',
      'h1[data-testid="property-header-name"]',
      '.hp__hotel-name'
    ];

    for (const selector of nameSelectors) {
      const nameElement = await page.$(selector);
      if (nameElement) {
        metadata.name = await nameElement.textContent() || undefined;
        if (metadata.name) break;
      }
    }

    // Extract location
    const locationSelectors = [
      '[data-testid="property-location"]',
      '.hp__hotel-address',
      '.hp__hotel-location'
    ];

    for (const selector of locationSelectors) {
      const locationElement = await page.$(selector);
      if (locationElement) {
        metadata.location = await locationElement.textContent() || undefined;
        if (metadata.location) break;
      }
    }

    // Extract overall rating
    const ratingSelectors = [
      'div[data-testid="review-score-component"] span.bui-review-score__badge',
      '.bui-review-score__badge',
      '.review-score-badge'
    ];

    for (const selector of ratingSelectors) {
      const ratingElement = await page.$(selector);
      if (ratingElement) {
        const ratingText = await ratingElement.textContent();
        if (ratingText) {
          const rating = parseFloat(ratingText.replace(',', '.'));
          if (!isNaN(rating)) {
            metadata.ratingOverall = rating;
            break;
          }
        }
      }
    }

    // Extract location rating
    const locationRatingSelectors = [
      '[data-testid="location-score"]',
      '.location-score'
    ];

    for (const selector of locationRatingSelectors) {
      const locationRatingElement = await page.$(selector);
      if (locationRatingElement) {
        const ratingText = await locationRatingElement.textContent();
        if (ratingText) {
          const rating = parseFloat(ratingText.replace(',', '.'));
          if (!isNaN(rating)) {
            metadata.ratingLocation = rating;
            break;
          }
        }
      }
    }

    // Extract amenities
    const amenitySelectors = [
      'div.hotel-facilities-group div.bui-list__description',
      '[data-testid="facilities"] .bui-list__description',
      '.hotel-facilities .bui-list__description'
    ];

    for (const selector of amenitySelectors) {
      const amenityElements = await page.$$(selector);
      if (amenityElements.length > 0) {
        for (const element of amenityElements) {
          const amenityText = await element.textContent();
          if (amenityText && amenityText.trim()) {
            metadata.amenities.push(amenityText.trim());
          }
        }
        break;
      }
    }

  } catch (error) {
    console.warn('Error extracting metadata:', error);
  }

  return metadata;
} 