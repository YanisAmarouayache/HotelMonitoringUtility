import { gql } from 'apollo-server';

export const typeDefs = gql`
  scalar DateTime

  type AvailabilityDay {
    checkin: DateTime!
    price: Float!
    available: Boolean!
    minLengthOfStay: Int
  }

  type Hotel {
    id: ID!
    bookingUrl: String!
    externalHotelId: String
    name: String
    location: String
    currency: String
    ratingOverall: Float
    ratingLocation: Float
    amenities: [String!]!
    createdAt: DateTime!
    updatedAt: DateTime!
    dailyPrices(start: DateTime!, end: DateTime!): [DailyPrice!]!
    criterionWeights: [HotelCriterionWeight!]!
  }

  type DailyPrice {
    id: ID!
    hotelId: String!
    checkInDate: DateTime!
    price: Float!
    available: Boolean!
    scrapedAt: DateTime!
  }

  type OwnHotelHistory {
    id: ID!
    date: DateTime!
    priceApplied: Float!
    reservations: Int!
    createdAt: DateTime!
  }

  type Criterion {
    id: ID!
    key: String!
    displayName: String!
    weights: [HotelCriterionWeight!]!
  }

  type HotelCriterionWeight {
    id: ID!
    hotelId: String!
    criterionId: String!
    season: String!
    weight: Float!
    criterion: Criterion!
  }

  type Event {
    id: ID!
    date: DateTime!
    name: String!
    description: String
    createdAt: DateTime!
  }

  type Recommendation {
    date: DateTime!
    suggestion: String!
    targetPrice: Float
    rationale: String!
    marketPrice: Float!
    historicalPickup: Float
    eventImpact: String
  }

  type ScrapingResult {
    success: Boolean!
    message: String!
    hotel: Hotel
  }

  input OwnHotelHistoryInput {
    date: DateTime!
    priceApplied: Float!
    reservations: Int!
  }

  input CriterionWeightInput {
    criterionId: ID!
    season: String!
    weight: Float!
  }

  type Query {
    hotels: [Hotel!]!
    hotel(id: ID!): Hotel
    dailyPrices(hotelId: ID!, start: DateTime!, end: DateTime!): [DailyPrice!]!
    ownHistory: [OwnHotelHistory!]!
    criteria: [Criterion!]!
    events: [Event!]!
    recommendation(hotelId: ID!, date: DateTime!): Recommendation!
  }

  type Mutation {
    addHotel(bookingUrl: String!): ScrapingResult!
    scrapeHotel(hotelId: ID!): ScrapingResult!
    importOwnHistory(entries: [OwnHotelHistoryInput!]!): [OwnHotelHistory!]!
    setCriterionWeight(hotelId: ID!, criterionId: ID!, season: String!, weight: Float!): HotelCriterionWeight!
    addCriterion(key: String!, displayName: String!): Criterion!
    addEvent(date: DateTime!, name: String!, description: String): Event!
    deleteEvent(id: ID!): Boolean!
    deleteHotel(id: ID!): Boolean!
  }
`; 