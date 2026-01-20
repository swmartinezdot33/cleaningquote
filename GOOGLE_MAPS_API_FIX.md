# Fixing Google Maps API Key Issues

## Current Error: ApiTargetBlockedMapError

This error means your Google Maps API key is being blocked. This usually happens for one of these reasons:

### 1. **Check API Restrictions on Your Key**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "APIs & Services" → "Credentials"
3. Find your API key and click on it
4. Under "Key restrictions", check the **Application restrictions**:
   - If set to "HTTP referrers (web sites)", make sure your domain is listed
   - Add: `quote.raleighcleaningcompany.com` and `localhost:3000`

### 2. **Verify Required APIs are Enabled**

You need these APIs enabled in your project:
- ✅ Maps JavaScript API
- ✅ Places API
- ✅ Geocoding API

Check this in Google Cloud Console → "APIs & Services" → "Enabled APIs & services"

### 3. **Check Billing is Enabled**

Even with free tier quotas, billing must be enabled:
1. Go to "Billing" in Google Cloud Console
2. Ensure billing is set up and active
3. Check you haven't exceeded free tier quotas

### 4. **If Still Blocked: Create a New Key**

If issues persist:
1. Create a new API key in Google Cloud Console
2. Apply proper restrictions (HTTP referrers)
3. Ensure APIs are enabled
4. Save it to your admin panel

To update the key:
1. Go to `/admin/settings` in the app
2. Find "Google Maps API Key" section
3. Paste your new key
4. Click "Save"

Or via API:
```bash
curl -X POST http://localhost:3000/api/admin/google-maps-key \
  -H "Content-Type: application/json" \
  -H "x-admin-password: YOUR_ADMIN_PASSWORD" \
  -d '{"apiKey": "AIzaSy..."}'
```

## Deprecated API Warning

The warning about `google.maps.places.Autocomplete` being deprecated is just a notice. The component now falls back gracefully to the older API while supporting the newer one. This is normal and won't affect functionality.

## Testing

Once you've fixed the API key:
1. Clear browser cache
2. Hard refresh (Cmd+Shift+R on Mac)
3. Try entering an address - you should see autocomplete suggestions

## Current Status

- ✅ Code updated to support both old and new Places APIs
- ⚠️ API key is being blocked (needs GCP configuration)
- ⚠️ Ensure billing and restrictions are set correctly
