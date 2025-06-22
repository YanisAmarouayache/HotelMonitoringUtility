export interface DailyPrice {
  checkInDate: Date;
  price: number;
  available: boolean;
  currency: string;
}

export interface ScrapedHotelData {
  hotelName: string;
  hotelId: string;
  location: string;
  currency: string;
  ratingOverall: number;
  ratingLocation: number;
  amenities: string[];
  dailyPrices: DailyPrice[];
}

export interface ScrapingOptions {
  months?: number;
  headless?: boolean;
  timeout?: number;
} 