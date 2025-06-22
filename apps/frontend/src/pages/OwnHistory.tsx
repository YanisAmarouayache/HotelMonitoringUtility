import { useQuery, useMutation } from '@apollo/client';
import { gql } from '@apollo/client';
import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { Upload, Download, Trash2 } from 'lucide-react';

const GET_OWN_HISTORY = gql`
  query GetOwnHistory {
    ownHistory {
      id
      date
      priceApplied
      reservations
      createdAt
    }
  }
`;

const IMPORT_HISTORY = gql`
  mutation ImportOwnHistory($entries: [OwnHotelHistoryInput!]!) {
    importOwnHistory(entries: $entries) {
      id
      date
      priceApplied
      reservations
    }
  }
`;

export default function OwnHistory() {
  const { loading, error, data, refetch } = useQuery(GET_OWN_HISTORY);
  const [importHistory] = useMutation(IMPORT_HISTORY);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',');
      
      const entries = lines.slice(1).map(line => {
        const values = line.split(',');
        return {
          date: new Date(values[0]),
          priceApplied: parseFloat(values[1]),
          reservations: parseInt(values[2])
        };
      });

      await importHistory({ variables: { entries } });
      refetch();
    } catch (error) {
      console.error('Error importing history:', error);
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>
  );

  if (error) return (
    <div className="text-center text-red-600">
      Error loading history: {error.message}
    </div>
  );

  const history = data?.ownHistory || [];
  const chartData = history.map((entry: any) => ({
    date: format(new Date(entry.date), 'MMM dd'),
    price: entry.priceApplied,
    reservations: entry.reservations,
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Own Hotel History</h1>
        
        <div className="flex space-x-4">
          <label className="btn btn-primary flex items-center space-x-2 cursor-pointer">
            <Upload className="h-5 w-5" />
            <span>{isUploading ? 'Uploading...' : 'Import CSV'}</span>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isUploading}
            />
          </label>
          
          <button className="btn btn-secondary flex items-center space-x-2">
            <Download className="h-5 w-5" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="card p-8 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No history data</h3>
          <p className="text-gray-600 mb-4">
            Import your hotel's historical data to get started with yield recommendations.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
            <h4 className="font-medium text-blue-900 mb-2">CSV Format:</h4>
            <p className="text-sm text-blue-800">
              date,priceApplied,reservations<br />
              2024-01-01,150.00,5<br />
              2024-01-02,160.00,3<br />
              2024-01-03,140.00,8
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Average Price</h3>
              <p className="text-3xl font-bold text-gray-900">
                €{history.reduce((sum: number, entry: any) => sum + entry.priceApplied, 0) / history.length}
              </p>
            </div>
            
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Total Reservations</h3>
              <p className="text-3xl font-bold text-gray-900">
                {history.reduce((sum: number, entry: any) => sum + entry.reservations, 0)}
              </p>
            </div>
            
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Points</h3>
              <p className="text-3xl font-bold text-gray-900">{history.length}</p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Price Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="price" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Reservations</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="reservations" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Table */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">History Data</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price Applied
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reservations
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {history.map((entry: any) => (
                    <tr key={entry.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {format(new Date(entry.date), 'MMM dd, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        €{entry.priceApplied}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {entry.reservations}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button className="text-red-600 hover:text-red-900">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
} 