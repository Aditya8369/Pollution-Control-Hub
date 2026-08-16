import axios from 'axios';

export async function fetchGeolocation() {
  try {
    const response = await axios.get('https://api.geoapify.com/v1/ipinfo?apiKey=YOUR_API_KEY');
    return response.data;
  } catch (error) {
    throw new Error('Failed to retrieve geolocation data');
  }
}
