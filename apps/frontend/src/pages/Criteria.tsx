import { useQuery, useMutation } from '@apollo/client';
import { gql } from '@apollo/client';
import { useState } from 'react';
import { Plus, Settings, Trash2 } from 'lucide-react';

const GET_CRITERIA = gql`
  query GetCriteria {
    criteria {
      id
      key
      displayName
    }
  }
`;

const ADD_CRITERION = gql`
  mutation AddCriterion($key: String!, $displayName: String!) {
    addCriterion(key: $key, displayName: $displayName) {
      id
      key
      displayName
    }
  }
`;

export default function Criteria() {
  const { loading, error, data, refetch } = useQuery(GET_CRITERIA);
  const [addCriterion] = useMutation(ADD_CRITERION);
  const [isAdding, setIsAdding] = useState(false);
  const [newCriterion, setNewCriterion] = useState({ key: '', displayName: '' });

  const handleAddCriterion = async () => {
    if (!newCriterion.key || !newCriterion.displayName) return;
    
    setIsAdding(true);
    try {
      await addCriterion({
        variables: {
          key: newCriterion.key,
          displayName: newCriterion.displayName
        }
      });
      setNewCriterion({ key: '', displayName: '' });
      refetch();
    } catch (error) {
      console.error('Error adding criterion:', error);
    } finally {
      setIsAdding(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>
  );

  if (error) return (
    <div className="text-center text-red-600">
      Error loading criteria: {error.message}
    </div>
  );

  const criteria = data?.criteria || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Criteria Management</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Add New Criterion */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Plus className="h-5 w-5 mr-2" />
            Add New Criterion
          </h3>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="key" className="block text-sm font-medium text-gray-700 mb-2">
                Key (Internal Name)
              </label>
              <input
                type="text"
                id="key"
                value={newCriterion.key}
                onChange={(e) => setNewCriterion(prev => ({ ...prev, key: e.target.value }))}
                placeholder="e.g., pool, gym, location_rating"
                className="input"
              />
            </div>
            
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-2">
                Display Name
              </label>
              <input
                type="text"
                id="displayName"
                value={newCriterion.displayName}
                onChange={(e) => setNewCriterion(prev => ({ ...prev, displayName: e.target.value }))}
                placeholder="e.g., Pool, Gym, Location Rating"
                className="input"
              />
            </div>
            
            <button
              onClick={handleAddCriterion}
              disabled={isAdding || !newCriterion.key || !newCriterion.displayName}
              className="btn btn-primary w-full disabled:opacity-50"
            >
              {isAdding ? 'Adding...' : 'Add Criterion'}
            </button>
          </div>
        </div>

        {/* Existing Criteria */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Existing Criteria
          </h3>
          
          {criteria.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No criteria defined yet. Add your first criterion to get started.
            </p>
          ) : (
            <div className="space-y-3">
              {criteria.map((criterion: any) => (
                <div
                  key={criterion.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">{criterion.displayName}</p>
                    <p className="text-sm text-gray-500">{criterion.key}</p>
                  </div>
                  <button className="text-red-600 hover:text-red-900">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Help Section */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">How to Use Criteria</h3>
        <div className="prose prose-sm text-gray-600">
          <p>
            Criteria are used to define what factors are important when comparing hotels and making yield recommendations.
            Each criterion can have different weights depending on the season.
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>Key:</strong> Internal identifier (e.g., "pool", "gym")</li>
            <li><strong>Display Name:</strong> User-friendly name (e.g., "Pool", "Gym")</li>
            <li><strong>Weights:</strong> Set per hotel and season (0.0 to 1.0)</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 