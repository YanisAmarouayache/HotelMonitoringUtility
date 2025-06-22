import React from 'react';
import { ApolloProvider } from '@apollo/client';
import { Routes, Route } from 'react-router-dom';
import { client } from './apolloClient';
import Layout from './components/Layout';
import HotelList from './pages/HotelList';
import AddHotel from './pages/AddHotel';
import HotelDetail from './pages/HotelDetail';
import Criteria from './pages/Criteria';
import OwnHistory from './pages/OwnHistory';

function App() {
  return (
    <ApolloProvider client={client}>
      <Layout>
        <Routes>
          <Route path="/" element={<HotelList />} />
          <Route path="/hotels" element={<HotelList />} />
          <Route path="/hotels/add" element={<AddHotel />} />
          <Route path="/hotels/:id" element={<HotelDetail />} />
          <Route path="/history" element={<OwnHistory />} />
          <Route path="/criteria" element={<Criteria />} />
        </Routes>
      </Layout>
    </ApolloProvider>
  );
}

export default App; 