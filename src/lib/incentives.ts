import type { IncentiveRestaurant } from "@/types/review";

// Phase-1 mock dataset. Static NYC restaurants with perks for honest reviews.
// Replace with a real source (or /api/incentives) later — see REVU.md.
const RESTAURANTS: IncentiveRestaurant[] = [
  {
    id: "joes-pizza",
    name: "Joe's Pizza",
    cuisine: "Pizza",
    address: "7 Carmine St, New York, NY",
    lat: 40.7305,
    lng: -74.0027,
    incentive: { perk: "Free garlic knots", condition: "for an honest review on any platform" },
    blendedRating: 4.4,
  },
  {
    id: "lievito",
    name: "Lievito Bakery",
    cuisine: "Bakery",
    address: "112 Stanton St, New York, NY",
    lat: 40.7211,
    lng: -73.985,
    incentive: { perk: "10% off your order", condition: "for an honest review on any platform" },
    blendedRating: 4.1,
  },
  {
    id: "saigon-corner",
    name: "Saigon Corner",
    cuisine: "Vietnamese",
    address: "55 Mott St, New York, NY",
    lat: 40.7159,
    lng: -73.9982,
    incentive: { perk: "Free spring rolls", condition: "for an honest review on any platform" },
    blendedRating: 4.6,
  },
  {
    id: "el-farolito",
    name: "El Farolito",
    cuisine: "Mexican",
    address: "203 Ave A, New York, NY",
    lat: 40.7264,
    lng: -73.9818,
    incentive: { perk: "Free guacamole", condition: "for an honest review on any platform" },
    blendedRating: 4.0,
  },
  {
    id: "kettle-black",
    name: "Kettle & Black",
    cuisine: "Coffee",
    address: "88 Bedford Ave, Brooklyn, NY",
    lat: 40.7193,
    lng: -73.9566,
    incentive: { perk: "Free drip coffee", condition: "for an honest review on any platform" },
    blendedRating: 4.3,
  },
  {
    id: "tandoori-house",
    name: "Tandoori House",
    cuisine: "Indian",
    address: "342 E 6th St, New York, NY",
    lat: 40.7271,
    lng: -73.9869,
    incentive: { perk: "Free naan basket", condition: "for an honest review on any platform" },
    blendedRating: 4.2,
  },
  {
    id: "greenpoint-deli",
    name: "Greenpoint Deli",
    cuisine: "Sandwiches",
    address: "611 Manhattan Ave, Brooklyn, NY",
    lat: 40.7257,
    lng: -73.9512,
    incentive: { perk: "Free cookie with any sandwich", condition: "for an honest review on any platform" },
    blendedRating: 3.9,
  },
];

export function getIncentiveRestaurants(): IncentiveRestaurant[] {
  return RESTAURANTS;
}
