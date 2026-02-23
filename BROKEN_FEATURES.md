# BROKEN FEATURES TO FIX

## 1. Check-In Page
- ❌ Missing geolocation button (Google Maps API)
- ❌ No actual API implementation (just TODO)
- ❌ No check-in POST to backend
- ❌ No points awarded for check-ins

## 2. Connection Points
- ⚠️ Backend DOES deduct points on disconnect (line 176)
- ❌ But awards points TWICE per connection (once per user)
- ❌ Should only award points ONCE total per unique pair

## 3. Chat
- ❓ Need to check if working

## 4. Profile Update  
- ❓ Need to check if working

## PRIORITY ORDER:
1. Fix Check-In completely
2. Fix connection points to be idempotent
3. Verify chat works
4. Verify profile update works
5. Deploy and TEST EVERYTHING
