import { prisma } from './prismaClient';
import { scrapeHotel, ScrapedHotelData, DailyPrice } from './scraper';

// Mock daily prices data for when scraper doesn't return prices
const generateMockPrices = (hotelId: string) => {
  const prices = [];
  const today = new Date();
  
  for (let i = 0; i < 60; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    
    prices.push({
      id: `price-${hotelId}-${i}`,
      hotelId,
      checkInDate: date,
      price: Math.floor(Math.random() * 200) + 100, // 100-300 EUR
      available: Math.random() > 0.2, // 80% available
      scrapedAt: new Date()
    });
  }
  
  return prices;
};

export const resolvers = {
  DateTime: {
    __serialize(value: Date) {
      return value.toISOString();
    },
    __parseValue(value: string) {
      return new Date(value);
    },
    __parseLiteral(ast: any) {
      if (ast.kind === 'StringValue') {
        return new Date(ast.value);
      }
      return null;
    },
  },

  Query: {
    hotels: async () => {
      return await prisma.hotel.findMany({
        orderBy: { createdAt: 'desc' }
      });
    },

    hotel: async (_: any, { id }: { id: string }) => {
      return await prisma.hotel.findUnique({
        where: { id }
      });
    },

    dailyPrices: async (_: any, { hotelId, start, end }: { hotelId: string; start: Date; end: Date }) => {
      // For now, return mock data instead of querying database
      const mockPrices = generateMockPrices(hotelId);
      return mockPrices.filter(price => 
        price.checkInDate >= start && price.checkInDate <= end
      );
    },

    ownHistory: async () => {
      return await prisma.ownHotelHistory.findMany({
        orderBy: { date: 'asc' }
      });
    },

    criteria: async () => {
      return await prisma.criterion.findMany({
        orderBy: { displayName: 'asc' }
      });
    },

    events: async () => {
      return await prisma.event.findMany({
        orderBy: { date: 'asc' }
      });
    },

    recommendation: async (_: any, { hotelId, date }: { hotelId: string; date: Date }) => {
      // Mock recommendation
      return {
        date,
        suggestion: 'maintain',
        targetPrice: 150,
        rationale: 'Market conditions are stable',
        marketPrice: 150,
        historicalPickup: 5,
        eventImpact: 'No significant events detected.'
      };
    }
  },

  Mutation: {
    addHotel: async (_: any, { bookingUrl }: { bookingUrl: string }) => {
      try {
        // Check if hotel already exists
        const existingHotel = await prisma.hotel.findUnique({
          where: { bookingUrl }
        });

        if (existingHotel) {
          return {
            success: false,
            message: 'Hotel already exists',
            hotel: existingHotel
          };
        }

        // Create hotel record
        const hotel = await prisma.hotel.create({
          data: {
            bookingUrl,
            amenities: JSON.stringify([])
          }
        });

        // Start scraping in background
        scrapeHotel(bookingUrl)
          .then(async (scrapedData: ScrapedHotelData) => {
            await prisma.hotel.update({
              where: { id: hotel.id },
              data: {
                name: scrapedData.hotelName,
                externalHotelId: scrapedData.hotelId,
                location: scrapedData.location,
                currency: scrapedData.currency,
                ratingOverall: scrapedData.ratingOverall,
                ratingLocation: scrapedData.ratingLocation,
                amenities: JSON.stringify(scrapedData.amenities)
              }
            });

            // Store daily prices if available
            if (scrapedData.dailyPrices && scrapedData.dailyPrices.length > 0) {
              const priceData = scrapedData.dailyPrices.map((price: DailyPrice) => ({
                hotelId: hotel.id,
                checkInDate: price.checkInDate,
                price: price.price,
                available: price.available,
                scrapedAt: new Date()
              }));

              await prisma.dailyPrice.createMany({
                data: priceData
              });
            }
          })
          .catch(async (error: any) => {
            console.error('Error scraping hotel:', error);
            await prisma.hotel.update({
              where: { id: hotel.id },
              data: {
                name: 'Error scraping hotel'
              }
            });
          });

        return {
          success: true,
          message: 'Hotel added successfully. Scraping in progress...',
          hotel
        };
      } catch (error) {
        return {
          success: false,
          message: `Error adding hotel: ${error}`,
          hotel: null
        };
      }
    },

    scrapeHotel: async (_: any, { hotelId }: { hotelId: string }) => {
      try {
        const hotel = await prisma.hotel.findUnique({
          where: { id: hotelId }
        });

        if (!hotel) {
          return {
            success: false,
            message: 'Hotel not found',
            hotel: null
          };
        }

        const scrapedData: ScrapedHotelData = await scrapeHotel(hotel.bookingUrl);

        // Update hotel data
        const updatedHotel = await prisma.hotel.update({
          where: { id: hotelId },
          data: {
            name: scrapedData.hotelName,
            externalHotelId: scrapedData.hotelId,
            location: scrapedData.location,
            currency: scrapedData.currency,
            ratingOverall: scrapedData.ratingOverall,
            ratingLocation: scrapedData.ratingLocation,
            amenities: JSON.stringify(scrapedData.amenities)
          }
        });

        // Store daily prices if available
        if (scrapedData.dailyPrices && scrapedData.dailyPrices.length > 0) {
          // Delete existing prices for this hotel
          await prisma.dailyPrice.deleteMany({
            where: { hotelId }
          });

          // Insert new prices
          const priceData = scrapedData.dailyPrices.map((price: DailyPrice) => ({
            hotelId,
            checkInDate: price.checkInDate,
            price: price.price,
            available: price.available,
            scrapedAt: new Date()
          }));

          await prisma.dailyPrice.createMany({
            data: priceData
          });
        }

        return {
          success: true,
          message: 'Hotel scraped successfully',
          hotel: updatedHotel
        };
      } catch (error) {
        return {
          success: false,
          message: `Error scraping hotel: ${error}`,
          hotel: null
        };
      }
    },

    importOwnHistory: async (_: any, { entries }: { entries: any[] }) => {
      // Clear existing history
      await prisma.ownHotelHistory.deleteMany();

      // Insert new entries
      await prisma.ownHotelHistory.createMany({
        data: entries.map(entry => ({
          date: new Date(entry.date),
          priceApplied: entry.priceApplied,
          reservations: entry.reservations
        }))
      });

      return await prisma.ownHotelHistory.findMany({
        orderBy: { date: 'asc' }
      });
    },

    setCriterionWeight: async (_: any, { hotelId, criterionId, season, weight }: { hotelId: string; criterionId: string; season: string; weight: number }) => {
      return await prisma.hotelCriterionWeight.upsert({
        where: {
          hotelId_criterionId_season: {
            hotelId,
            criterionId,
            season
          }
        },
        update: { weight },
        create: {
          hotelId,
          criterionId,
          season,
          weight
        },
        include: {
          criterion: true
        }
      });
    },

    addCriterion: async (_: any, { key, displayName }: { key: string; displayName: string }) => {
      return await prisma.criterion.create({
        data: { key, displayName }
      });
    },

    addEvent: async (_: any, { date, name, description }: { date: Date; name: string; description?: string }) => {
      return await prisma.event.create({
        data: {
          date: new Date(date),
          name,
          description
        }
      });
    },

    deleteEvent: async (_: any, { id }: { id: string }) => {
      await prisma.event.delete({
        where: { id }
      });
      return true;
    },

    deleteHotel: async (_: any, { id }: { id: string }) => {
      await prisma.hotel.delete({
        where: { id }
      });
      return true;
    }
  },

  Hotel: {
    amenities: (parent: any) => {
      try {
        return JSON.parse(parent.amenities || '[]');
      } catch {
        return [];
      }
    },

    dailyPrices: async (parent: any, { start, end }: { start: Date; end: Date }) => {
      // Try to get real prices from database first
      const realPrices = await prisma.dailyPrice.findMany({
        where: {
          hotelId: parent.id,
          checkInDate: {
            gte: start,
            lte: end
          }
        },
        orderBy: { checkInDate: 'asc' }
      });

      if (realPrices.length > 0) {
        return realPrices;
      }

      // Fallback to mock data
      const mockPrices = generateMockPrices(parent.id);
      return mockPrices.filter(price => 
        price.checkInDate >= start && price.checkInDate <= end
      );
    },

    criterionWeights: async (parent: any) => {
      return await prisma.hotelCriterionWeight.findMany({
        where: { hotelId: parent.id },
        include: { criterion: true }
      });
    }
  },

  Criterion: {
    weights: async (parent: any) => {
      return await prisma.hotelCriterionWeight.findMany({
        where: { criterionId: parent.id },
        include: { criterion: true }
      });
    }
  }
}; 