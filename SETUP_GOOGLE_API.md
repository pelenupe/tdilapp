# Google Maps API Setup for Check-In Feature

## What You Need:
A Google Maps/Places API key to enable the "nearby businesses" feature when users check in.

## Setup Steps:

### 1. Add Your API Key to Frontend
Create or edit: `tdil-frontend/.env.production`

```bash
VITE_GOOGLE_MAPS_API_KEY=YOUR_API_KEY_HERE
```

### 2. Rebuild Frontend
```bash
cd tdil-frontend
npm run build
```

### 3. Deploy to Production
```bash
scp -r dist/* root@104.131.63.244:/var/www/tdilapp/
```

## What This Enables:
- When user clicks "Use My Location" on check-in page
- After getting GPS coordinates, will show list of nearby businesses
- User can click to select a business, or enter manually
- Ready for future sponsor tier bonuses

## Current Status Without API Key:
- ✅ Geolocation works (gets coordinates)
- ✅ Reverse geocoding works (gets address)
- ❌ Nearby businesses list - NEEDS API KEY
- ✅ Manual entry still works fine

## Testing:
After adding key and rebuilding:
1. Go to https://tdilapp.com/checkin
2. Click "Use My Location"
3. Allow location permission
4. Should see list of nearby businesses appear
5. Click one to auto-fill venue name
