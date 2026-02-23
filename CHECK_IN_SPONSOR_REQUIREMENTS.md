# Check-In Sponsor Requirements

## Features Needed:

### 1. Nearby Business Search
- After getting user's location, query Google Places API for nearby businesses
- Display list of businesses within radius (e.g., 1 mile)
- User can select from list OR manually enter

### 2. Sponsor Tiers
- Bronze: +10 bonus points (30 total for user)
- Silver: +25 bonus points (45 total for user)  
- Gold: +50 bonus points (70 total for user)

### 3. Sponsor Points
- When user checks in at sponsor location:
  - User gets base 20 + tier bonus
  - Sponsor account gets points too
  - Track sponsor check-ins for analytics

### 4. Database Changes Needed:
- `sponsors` table with:
  - name, address, lat/lng, tier (bronze/silver/gold)
  - google_place_id for matching
  - user_id (link to sponsor account)
  - points earned from check-ins

### 5. Point Structure:
```
Base check-in: 20 points
Bronze sponsor: 20 + 10 = 30 points (user), 5 points (sponsor)
Silver sponsor: 20 + 25 = 45 points (user), 10 points (sponsor)
Gold sponsor: 20 + 50 = 70 points (user), 20 points (sponsor)
```

## Implementation Steps:
1. Create sponsors table
2. Add Google Places API to check-in frontend
3. Update check-in controller to detect sponsors
4. Award bonus points based on tier
5. Award points to sponsor account
6. Update pointsController with new types
