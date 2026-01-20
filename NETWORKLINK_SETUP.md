# NetworkLink KML Service Area Implementation

## Overview
This implementation allows you to use KML NetworkLink references instead of always uploading static KML files. The system will automatically fetch and cache the polygon data from a remote URL, so you never have to re-upload your service area when it changes!

## What's New

### 1. **Automatic NetworkLink Support**
- The system now detects and processes KML NetworkLink files
- Instead of downloading the full KML with polygons, you can export just the reference link from Google Maps
- The system extracts the URL from the NetworkLink and stores it
- Whenever service area checks are performed, it fetches the latest polygon data from that URL

### 2. **Smart Caching**
- Network KML is cached for 1 hour to avoid excessive requests
- Cache is automatically cleared when new data is fetched
- Falls back to cached/stored polygons if the network link is temporarily unavailable

### 3. **File Structure & New Files**

#### New Files:
- **`src/lib/service-area/fetchNetworkKML.ts`** - Fetches and caches KML from network URLs
- **`src/app/api/admin/service-area/status/route.ts`** - API endpoint to check service area configuration status

#### Modified Files:
- **`src/lib/kv.ts`** - Added KV storage for NetworkLink URLs
- **`src/lib/service-area/parseKML.ts`** - Updated to extract NetworkLink URLs instead of rejecting them
- **`src/app/api/service-area/check/route.ts`** - Updated to use NetworkLink if available
- **`src/app/api/admin/service-area/upload/route.ts`** - Now handles both direct KML and NetworkLink uploads
- **`src/app/admin/settings/page.tsx`** - UI updated to show NetworkLink status and support

## How It Works

### Upload Flow:
1. User uploads a KML file from Google Maps
2. System checks if it's a NetworkLink reference or direct polygon data
3. **If NetworkLink:**
   - Extracts the URL from the KML
   - Validates it by fetching and parsing the remote KML
   - Stores the URL in KV storage
   - Caches the initial polygon data as a fallback
4. **If Direct Polygon:**
   - Stores the polygon coordinates as before
   - Clears any existing NetworkLink

### Check Flow:
When a customer enters their address:
1. System attempts to fetch latest polygon from NetworkLink URL (if configured)
2. If NetworkLink fetch fails, falls back to cached polygons
3. Uses point-in-polygon algorithm to determine if address is in service area
4. Returns result to customer

## Admin UI Changes

### Service Area Configuration Card:
- **Status Display** (NEW): Shows whether NetworkLink or Direct Polygon is active
  - For NetworkLink: Shows "🔗 NetworkLink Active" with the URL
  - For Direct Polygon: Shows "✓ Direct Polygon Active" with coordinate count
- **Upload Section**: Same file upload interface
- **Info**: Updated description explaining both options

## API Endpoints

### GET `/api/admin/service-area/status`
Returns current service area configuration:
```json
{
  "type": "network" | "direct" | "none",
  "networkLink": "https://...",  // Only if type is "network"
  "polygonCount": 123
}
```

### POST `/api/admin/service-area/upload`
Upload new KML file (supports both NetworkLink and direct)
```json
{
  "kmlContent": "... KML file content ...",
  "message": "NetworkLink stored successfully!",
  "type": "network" | "direct",
  "networkLink": "https://...",  // If NetworkLink
  "polygonCount": 123
}
```

### POST `/api/service-area/check`
Check if address is in service area (unchanged API, now uses NetworkLink automatically)
```json
{
  "lat": 35.7796,
  "lng": -78.6382,
  "inServiceArea": true,
  "message": "Great! You are within our service area."
}
```

## Key Features

✅ **No More Manual Updates** - Service area automatically updates from your map
✅ **Automatic Fallback** - Works offline with cached data if network URL fails
✅ **Smart Caching** - 1-hour cache reduces unnecessary requests
✅ **Backward Compatible** - Still supports direct KML uploads
✅ **User Friendly** - Admin UI shows what's active
✅ **Error Handling** - Validates NetworkLink URLs before storing
✅ **Recursive Link Protection** - Prevents NetworkLink-of-NetworkLink infinite loops

## How to Use

### Using Google Maps NetworkLink:
1. Create or edit your service area map in Google Maps
2. Right-click the layer → "Export to KML"
3. **IMPORTANT**: In the download dialog, select the KML option (not "download full map")
4. You'll get a small KML file with just the NetworkLink reference
5. Upload this file to the Service Area Configuration in Settings
6. System will extract the URL and start using it automatically!

### Using Direct KML:
1. Create or edit your service area map in Google Maps
2. Right-click the layer → "Export to KML"
3. Select "download full map" or save the complete KML with polygons
4. Upload as usual - system will detect it has polygons and store them directly

## Storage Details

### KV Keys:
- `service:area:polygon` - Stores polygon coordinates (fallback/cache)
- `service:area:network:link` - Stores the NetworkLink URL

## Caching Strategy

- **Cache Duration**: 1 hour (3,600,000 ms)
- **Cache Location**: In-memory (server-side)
- **Fallback**: Stored polygon in KV if network fetch fails
- **Manual Clear**: Can be cleared programmatically if needed

## Error Handling

- ✅ Invalid NetworkLink URL → Validation error shown
- ✅ NetworkLink points to another NetworkLink → Error (recursive protection)
- ✅ Network timeout → Falls back to stored polygon
- ✅ Invalid KML format → Clear error message
- ✅ HTTP errors → Reported with status code

## Future Enhancements

Potential improvements:
- Add manual cache refresh button in admin
- Monitor NetworkLink fetch success/failure rates
- Add webhook support for immediate updates
- Support multiple polygons per location
- Add NetworkLink status health checks
