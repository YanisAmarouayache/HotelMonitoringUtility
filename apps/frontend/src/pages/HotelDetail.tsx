import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import { gql } from '@apollo/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, addDays } from 'date-fns';
import { useMemo } from 'react';
import { 
  ArrowLeft, 
  RefreshCw, 
  Star, 
  MapPin, 
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { Link } from 'react-router-dom';

const GET_HOTEL_DETAILS = gql`
  query GetHotelDetails($id: ID!, $start: DateTime!, $end: DateTime!) {
    hotel(id: $id) {
      id
      name
      bookingUrl
      location
      currency
      ratingOverall
      ratingLocation
      amenities
      dailyPrices(start: $start, end: $end) {
        id
        checkInDate
        price
        available
        scrapedAt
      }
    }
  }
`;

const SCRAPE_HOTEL = gql`
  mutation ScrapeHotel($hotelId: ID!) {
    scrapeHotel(hotelId: $hotelId) {
      success
      message
    }
  }
`;

export default function HotelDetail() {
  const { id } = useParams<{ id: string }>();
  
  // Memoize dates to prevent unnecessary re-renders
  const { startDate, endDate } = useMemo(() => ({
    startDate: subDays(new Date(), 7),
    endDate: addDays(new Date(), 60)
  }), []);

  const { loading, error, data, refetch } = useQuery(GET_HOTEL_DETAILS, {
    variables: { id, start: startDate, end: endDate },
    fetchPolicy: 'cache-and-network'
  });

  const [scrapeHotel] = useMutation(SCRAPE_HOTEL);

  const handleScrape = async () => {
    try {
      await scrapeHotel({ variables: { hotelId: id } });
      refetch();
    } catch (error) {
      console.error('Error scraping hotel:', error);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>
  );

  if (error) return (
    <div className="text-center text-red-600">
      Error loading hotel: {error.message}
    </div>
  );

  const hotel = data?.hotel;
  if (!hotel) return <div>Hotel not found</div>;

  const chartData = hotel.dailyPrices
    .filter((price: any) => price.available)
    .map((price: any) => ({
      date: format(new Date(price.checkInDate), 'MMM dd'),
      price: price.price,
      fullDate: price.checkInDate,
    }))
    .sort((a: any, b: any) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime());

  const averagePrice = chartData.length > 0 
    ? chartData.reduce((sum: number, item: any) => sum + item.price, 0) / chartData.length 
    : 0;

  const priceTrend = chartData.length > 1 
    ? chartData[chartData.length - 1].price > chartData[0].price ? 'up' : 'down'
    : 'stable';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to="/hotels"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Hotels
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{hotel.name}</h1>
        </div>
        
        <button
          onClick={handleScrape}
          className="btn btn-primary flex items-center space-x-2"
        >
          <RefreshCw className="h-5 w-5" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Hotel Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Hotel Information</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-gray-500" />
              <span className="text-gray-700">{hotel.location || 'Location not available'}</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <Star className="h-4 w-4 text-yellow-500" />
              <span className="text-gray-700">
                {hotel.ratingOverall ? `${hotel.ratingOverall}/10` : 'No rating'}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-gray-700">
                Last updated: {format(new Date(hotel.dailyPrices[0]?.scrapedAt || new Date()), 'MMM dd, yyyy')}
              </span>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Price Statistics</h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Average Price</p>
              <p className="text-2xl font-bold text-gray-900">
                {hotel.currency} {averagePrice.toFixed(0)}
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              {priceTrend === 'up' && <TrendingUp className="h-4 w-4 text-green-500" />}
              {priceTrend === 'down' && <TrendingDown className="h-4 w-4 text-red-500" />}
              {priceTrend === 'stable' && <Minus className="h-4 w-4 text-gray-500" />}
              <span className="text-sm text-gray-600">
                Price trend: {priceTrend}
              </span>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Amenities</h3>
          <div className="space-y-2">
            {hotel.amenities?.length > 0 ? (
              hotel.amenities.slice(0, 5).map((amenity: string, index: number) => (
                <div key={index} className="text-sm text-gray-700">
                  • {amenity}
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No amenities data available</p>
            )}
            {hotel.amenities?.length > 5 && (
              <p className="text-sm text-gray-500">
                +{hotel.amenities.length - 5} more amenities
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Price Chart */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Price Trend</h3>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${hotel.currency} ${value}`}
              />
              <Tooltip 
                formatter={(value: any) => [`${hotel.currency} ${value}`, 'Price']}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Line 
                type="monotone" 
                dataKey="price" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-12 text-gray-500">
            No price data available
          </div>
        )}
      </div>
    </div>
  );
} 