import { chromium, Browser, Page, Route, Request, Response } from 'playwright';
import type { ScrapedHotelData, AvailabilityDay, ScraperConfig } from '@hotel-monitoring/types';
import { parsePriceString, extractHotelIdFromUrl, formatDate, getDateRange, isValidBookingUrl } from './utils';

interface GraphQLRequest {
  operationName: string;
  variables: any;
  query: string;
}

interface GraphQLResponse {
  data?: {
    availabilityCalendar?: {
      days?: Array<{
        checkin: string;
        avgPriceFormatted: string;
        available: boolean;
        minLengthOfStay?: number;
      }>;
    };
  };
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

    // Variables to store intercepted data
    let graphqlPayload: GraphQLRequest | null = null;
    let graphqlResponse: GraphQLResponse | null = null;
    let hotelMetadata: {
      name?: string;
      location?: string;
      ratingOverall?: number;
      ratingLocation?: number;
      amenities: string[];
    } = { amenities: [] };

    // Intercept GraphQL requests
    await page.route('**/dml/graphql', async (route: Route, request: Request) => {
      if (request.method() === 'POST') {
        try {
          const postData = request.postData();
          if (postData) {
            const payload = JSON.parse(postData) as GraphQLRequest;
            
            // Look for availability calendar query
            if (payload.operationName?.includes('AvailabilityCalendar') || 
                payload.query?.includes('availabilityCalendar')) {
              graphqlPayload = payload;
              
              // Continue with the request and capture response
              const response = await route.fetch();
              const responseBody = await response.text();
              
              try {
                graphqlResponse = JSON.parse(responseBody) as GraphQLResponse;
              } catch (e) {
                console.warn('Failed to parse GraphQL response:', e);
              }
              
              await route.fulfill({ response });
              return;
            }
          }
        } catch (e) {
          console.warn('Failed to parse GraphQL request:', e);
        }
      }
      
      await route.continue();
    });

    // Navigate to the hotel page
    await page.goto(hotelUrl, { waitUntil: 'networkidle' });

    // Extract hotel metadata from DOM
    hotelMetadata = await extractHotelMetadata(page);

    // If we didn't intercept the GraphQL request, try to construct it manually
    if (!graphqlPayload || !graphqlResponse) {
      const hotelId = extractHotelIdFromUrl(hotelUrl);
      if (hotelId) {
        const { startDate } = getDateRange(months);
        
        // Try to execute GraphQL query manually
        const manualResponse = await page.evaluate(async (hotelId: string, startDate: string, months: number) => {
          const query = `
            query AvailabilityCalendarQuery($hotelId: Int!, $startDate: String!, $months: Int!) {
              availabilityCalendar(hotelId: $hotelId, startDate: $startDate, months: $months) {
                hotelId
                days {
                  checkin
                  avgPriceFormatted
                  available
                  minLengthOfStay
                }
              }
            }
          `;

          const variables = {
            hotelId: parseInt(hotelId),
            startDate,
            months
          };

          try {
            const response = await fetch('/dml/graphql', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
              },
              body: JSON.stringify({
                operationName: 'AvailabilityCalendarQuery',
                variables,
                query
              })
            });

            if (response.ok) {
              return await response.json();
            }
          } catch (e) {
            console.error('Manual GraphQL query failed:', e);
          }
          
          return null;
        }, hotelId, startDate, months);

        if (manualResponse) {
          graphqlResponse = manualResponse;
        }
      }
    }

    // Parse availability data
    const availabilityDays: AvailabilityDay[] = [];
    if (graphqlResponse?.data?.availabilityCalendar?.days) {
      for (const day of graphqlResponse.data.availabilityCalendar.days) {
        availabilityDays.push({
          checkin: day.checkin,
          price: parsePriceString(day.avgPriceFormatted),
          available: day.available,
          minLengthOfStay: day.minLengthOfStay,
        });
      }
    }

    // Extract currency from the first price or default to EUR
    const currency = availabilityDays.length > 0 
      ? extractCurrencyFromPrice(graphqlResponse?.data?.availabilityCalendar?.days?.[0]?.avgPriceFormatted || '€0')
      : 'EUR';

    return {
      hotelId: extractHotelIdFromUrl(hotelUrl) || undefined,
      hotelName: hotelMetadata.name,
      location: hotelMetadata.location,
      currency,
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

/**
 * Extract currency from price string
 */
function extractCurrencyFromPrice(priceStr: string): string {
  const currencyMatch = priceStr.match(/^[€$£¥]/);
  return currencyMatch ? currencyMatch[0] : 'EUR';
} 