import { chromium, Browser, Page } from 'playwright';
import { ScrapedHotelData, ScrapingOptions } from './types';
import { parsePrice, getDateRange } from './utils';

export async function scrapeHotel(
  bookingUrl: string, 
  options: Partial<ScrapingOptions> = {}
): Promise<ScrapedHotelData> {
  const { months = 2, headless = true, timeout = 30000 } = options;
  
  let browser: Browser | null = null;
  
  try {
    // Launch browser
    browser = await chromium.launch({ 
      headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'en-US',
      timezoneId: 'Europe/Paris'
    });
    
    const page = await context.newPage();
    page.setDefaultTimeout(timeout);
    
    // Navigate to the hotel page
    await page.goto(bookingUrl, { waitUntil: 'networkidle' });
    
    // Extract hotel metadata
    const hotelData = await extractHotelMetadata(page);
    
    // Extract availability and pricing data
    const availabilityData = await extractAvailabilityData(page, months);
    
    return {
      ...hotelData,
      availabilityDays: availabilityData
    };
    
  } catch (error) {
    console.error('Error scraping hotel:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function extractHotelMetadata(page: Page) {
  const hotelName = await page.locator('h1[data-testid="title"], #hp_hotel_name').first().textContent() || '';
  const location = await page.locator('[data-testid="address"], .hp_address_subtitle').first().textContent() || '';
  
  // Extract ratings
  const ratingOverall = await extractRating(page, '[data-testid="review-score-component"] .bui-review-score__badge');
  const ratingLocation = await extractRating(page, '[data-testid="location-score"] .bui-review-score__badge');
  
  // Extract amenities
  const amenities = await extractAmenities(page);
  
  // Extract currency (from price elements)
  const currency = await extractCurrency(page);
  
  return {
    hotelName: hotelName.trim(),
    location: location.trim(),
    ratingOverall,
    ratingLocation,
    amenities,
    currency
  };
}

async function extractRating(page: Page, selector: string): Promise<number | undefined> {
  try {
    const ratingText = await page.locator(selector).first().textContent();
    if (ratingText) {
      const rating = parseFloat(ratingText.replace(',', '.'));
      return isNaN(rating) ? undefined : rating;
    }
  } catch {
    // Rating not found
  }
  return undefined;
}

async function extractAmenities(page: Page): Promise<string[]> {
  try {
    const amenityElements = await page.locator('.hotel-facilities-group .bui-list__description, [data-testid="facility"]').all();
    const amenities: string[] = [];
    
    for (const element of amenityElements) {
      const text = await element.textContent();
      if (text && text.trim()) {
        amenities.push(text.trim());
      }
    }
    
    return amenities;
  } catch {
    return [];
  }
}

async function extractCurrency(page: Page): Promise<string | undefined> {
  try {
    const priceElement = await page.locator('[data-testid="price-and-discounted-price"], .bui-price-display__value').first();
    const priceText = await priceElement.textContent();
    if (priceText) {
      const currencyMatch = priceText.match(/[€$£¥]/);
      return currencyMatch ? currencyMatch[0] : undefined;
    }
  } catch {
    // Currency not found
  }
  return undefined;
}

async function extractAvailabilityData(page: Page, months: number): Promise<ScrapedHotelData['availabilityDays']> {
  const { startDate, endDate } = getDateRange(months);
  
  try {
    // Try to intercept GraphQL requests
    const graphqlData = await interceptGraphQLData(page, startDate, endDate);
    if (graphqlData.length > 0) {
      return graphqlData;
    }
    
    // Fallback: try to extract from DOM
    return await extractFromDOM(page, startDate, endDate);
    
  } catch (error) {
    console.error('Error extracting availability data:', error);
    return [];
  }
}

async function interceptGraphQLData(page: Page, startDate: string, endDate: string): Promise<ScrapedHotelData['availabilityDays']> {
  const availabilityData: ScrapedHotelData['availabilityDays'] = [];
  
  // Intercept GraphQL requests
  page.on('response', async (response: any) => {
    if (response.url().includes('/dml/graphql')) {
      try {
        const responseData = await response.json();
        if (responseData?.data?.availabilityCalendar?.days) {
          const days = responseData.data.availabilityCalendar.days;
          for (const day of days) {
            availabilityData.push({
              checkin: day.checkin,
              price: parsePrice(day.avgPriceFormatted || '0'),
              available: day.available || false,
              minLengthOfStay: day.minLengthOfStay
            });
          }
        }
      } catch {
        // Ignore parsing errors
      }
    }
  });
  
  // Wait a bit for potential GraphQL requests
  await page.waitForTimeout(5000);
  
  return availabilityData;
}

async function extractFromDOM(page: Page, startDate: string, endDate: string): Promise<ScrapedHotelData['availabilityDays']> {
  // This is a simplified fallback - in a real implementation,
  // you would need to navigate through the calendar and extract prices
  const availabilityData: ScrapedHotelData['availabilityDays'] = [];
  
  try {
    // Try to find calendar elements
    const calendarDays = await page.locator('[data-testid="calendar-day"], .bui-calendar__day').all();
    
    for (const dayElement of calendarDays) {
      const dateAttr = await dayElement.getAttribute('data-date');
      const priceText = await dayElement.locator('.bui-price-display__value').textContent();
      const isAvailable = !(await dayElement.getAttribute('class'))?.includes('disabled');
      
      if (dateAttr && priceText) {
        availabilityData.push({
          checkin: dateAttr,
          price: parsePrice(priceText),
          available: isAvailable
        });
      }
    }
  } catch {
    // DOM extraction failed
  }
  
  return availabilityData;
}

// Export the main function
export { scrapeHotel as scrapeHotelViaGraphQL };
export * from './types';
export * from './utils'; 