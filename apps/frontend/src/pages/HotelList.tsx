import { useQuery, useMutation } from '@apollo/client';
import { Link } from 'react-router-dom';
import { gql } from '@apollo/client';
import { 
  Building2, 
  RefreshCw, 
  Eye, 
  Trash2,
  Plus,
  Calendar,
  Star
} from 'lucide-react';

const GET_HOTELS = gql`
  query GetHotels {
    hotels {
      id
      name
      bookingUrl
      ratingOverall
      ratingLocation
      updatedAt
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

const DELETE_HOTEL = gql`
  mutation DeleteHotel($id: ID!) {
    deleteHotel(id: $id)
  }
`;

export default function HotelList() {
  const { loading, error, data, refetch } = useQuery(GET_HOTELS);
  const [scrapeHotel] = useMutation(SCRAPE_HOTEL);
  const [deleteHotel] = useMutation(DELETE_HOTEL);

  const handleScrape = async (hotelId: string) => {
    try {
      await scrapeHotel({ variables: { hotelId } });
      refetch();
    } catch (error) {
      console.error('Error scraping hotel:', error);
    }
  };

  const handleDelete = async (hotelId: string) => {
    if (window.confirm('Are you sure you want to delete this hotel?')) {
      try {
        await deleteHotel({ variables: { id: hotelId } });
        refetch();
      } catch (error) {
        console.error('Error deleting hotel:', error);
      }
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>
  );

  if (error) return (
    <div className="text-center text-red-600">
      Error loading hotels: {error.message}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Hotels</h1>
        <Link
          to="/hotels/add"
          className="btn btn-primary flex items-center space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>Add Hotel</span>
        </Link>
      </div>

      {data?.hotels?.length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hotels</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by adding your first hotel to monitor.
          </p>
          <div className="mt-6">
            <Link to="/hotels/add" className="btn btn-primary">
              Add Hotel
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {data?.hotels?.map((hotel: any) => (
            <div key={hotel.id} className="card p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {hotel.name || 'Loading...'}
                  </h3>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span>
                        {hotel.ratingOverall ? `${hotel.ratingOverall}/10` : 'No rating'}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Updated: {new Date(hotel.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex space-x-2">
                <button
                  onClick={() => handleScrape(hotel.id)}
                  className="btn btn-secondary flex-1 flex items-center justify-center space-x-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Scrape</span>
                </button>
                
                <Link
                  to={`/hotels/${hotel.id}`}
                  className="btn btn-primary flex items-center justify-center space-x-2"
                >
                  <Eye className="h-4 w-4" />
                  <span>View</span>
                </Link>
                
                <button
                  onClick={() => handleDelete(hotel.id)}
                  className="btn btn-danger flex items-center justify-center"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 