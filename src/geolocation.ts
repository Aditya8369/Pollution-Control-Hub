diff --git a/src/geolocation.ts b/src/geolocation.ts
--- a/src/geolocation.ts
@@ -10,6 +10,7 @@ import axios from 'axios';
 
 async function fetchGeolocation() {
   try {
+    console.log('Fetching geolocation...');
     const response = await axios.get('https://api.geoapify.com/v1/ipinfo?apiKey=YOUR_API_KEY');
     return response.data;
   } catch (error) {
+    console.error('Failed to fetch geolocation:', error);
     throw new Error('Failed to retrieve geolocation data');
   }
 }
