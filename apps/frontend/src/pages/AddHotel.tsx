import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { gql } from '@apollo/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Plus, Loader } from 'lucide-react';
import { Link } from 'react-router-dom';

const ADD_HOTEL = gql`
  mutation AddHotel($bookingUrl: String!) {
    addHotel(bookingUrl: $bookingUrl) {
      success
      message
      hotel {
        id
        name
        bookingUrl
      }
    }
  }
`;

const schema = z.object({
  bookingUrl: z.string().url('Please enter a valid URL').refine(
    (url) => url.includes('booking.com'),
    'URL must be from Booking.com'
  ),
});

type FormData = z.infer<typeof schema>;

export default function AddHotel() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [addHotel] = useMutation(ADD_HOTEL);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const result = await addHotel({
        variables: { bookingUrl: data.bookingUrl },
      });

      if (result.data?.addHotel?.success) {
        navigate('/hotels');
      } else {
        setError('bookingUrl', {
          type: 'manual',
          message: result.data?.addHotel?.message || 'Failed to add hotel',
        });
      }
    } catch (error: any) {
      setError('bookingUrl', {
        type: 'manual',
        message: error.message || 'An error occurred',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          to="/hotels"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Hotels
        </Link>
      </div>

      <div className="card p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Add New Hotel
          </h1>
          <p className="text-gray-600">
            Enter a Booking.com URL to start monitoring a competitor hotel.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label htmlFor="bookingUrl" className="block text-sm font-medium text-gray-700 mb-2">
              Booking.com URL
            </label>
            <input
              {...register('bookingUrl')}
              type="url"
              id="bookingUrl"
              placeholder="https://www.booking.com/hotel/fr/example.html"
              className={`input ${errors.bookingUrl ? 'border-red-500' : ''}`}
            />
            {errors.bookingUrl && (
              <p className="mt-1 text-sm text-red-600">
                {errors.bookingUrl.message}
              </p>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">
              Example URLs:
            </h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• https://www.booking.com/hotel/fr/brach-paris.html</li>
              <li>• https://www.booking.com/hotel/us/ritz-carlton-new-york.html</li>
              <li>• https://www.booking.com/hotel/gb/savoy-london.html</li>
            </ul>
          </div>

          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary flex items-center space-x-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader className="h-5 w-5 animate-spin" />
              ) : (
                <Plus className="h-5 w-5" />
              )}
              <span>{isSubmitting ? 'Adding...' : 'Add Hotel'}</span>
            </button>
            
            <Link to="/hotels" className="btn btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
} 