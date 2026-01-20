# Quick Start: NetworkLink KML Service Area

## The Problem You Had
"Users always have to come back and update the KML file in the admin panel when we change our service area map."

## The Solution ✨
**Upload a KML NetworkLink reference once, and it automatically syncs with your Google Map forever!**

---

## 3-Step Setup

### 1️⃣ Export from Google Maps
- Open your service area map in Google Maps
- Right-click your layer → **Export to KML**
- Download the file (you'll get a small file with just a link, not the full coordinates)

### 2️⃣ Upload to Admin Panel
- Go to `/admin/settings`
- Find "Service Area Configuration"
- Upload the KML file you downloaded
- System automatically detects it's a NetworkLink

### 3️⃣ Done! 🎉
- Whenever you update your Google Map layer, the system automatically uses the new polygon
- No need to re-upload anything!

---

## What Actually Happens Behind the Scenes

```
Your Google Map
        ↓
    (you update it)
        ↓
NetworkLink URL (stored in your admin)
        ↓
System fetches latest polygon data (1x per hour max)
        ↓
Customer checks if they're in service area
        ↓
Uses the latest polygon from Google Maps
        ↓
Instant update, no manual work!
```

---

## Key Features

| Feature | Benefit |
|---------|---------|
| **Automatic Sync** | Map changes = instant updates (1hr cache) |
| **No Re-uploads** | Set it once, forget about it |
| **Smart Caching** | Doesn't overload servers, stays fast |
| **Fallback System** | Works even if Google Maps URL is temporarily down |
| **Both Formats** | Works with NetworkLink OR traditional direct KML |

---

## Admin Dashboard Updates

**Service Area Configuration Card** now shows:

```
✅ Status: "🔗 NetworkLink Active"
   Automatically fetching from: https://...google-maps-kml-link...
   
Or if using direct KML:

✅ Status: "✓ Direct Polygon Active"  
   123 coordinates loaded
```

---

## Common Questions

**Q: Do I ever need to re-upload?**
A: No! Once you upload the NetworkLink KML, it's done. Any updates to your Google Map are automatic.

**Q: What if Google Maps goes down?**
A: The system caches the polygon data, so it keeps working for up to 1 hour even if Google's servers are down.

**Q: How often does it check for updates?**
A: Data is cached for 1 hour. So changes to your map can take up to 1 hour to appear on customer quote forms.

**Q: Can I still use the old way (uploading full KML)?**
A: Yes! The system supports both. Upload either NetworkLink or direct KML, and it works.

**Q: Will it work if I change my service area?**
A: Yes! Just edit your Google Map layer, and next time someone uses the quote form (within 1 hour), they'll see the updated area.

---

## Testing Your Setup

✅ **Verify it's active:**
- Go to `/admin/settings`
- You should see "🔗 NetworkLink Active" with a URL

✅ **Test address check:**
- Use the quote form with an address inside your service area
- Should say "Great! You are within our service area."

✅ **Update your map:**
- Add/remove areas in Google Maps
- Test again after an hour
- Should reflect the changes automatically

---

## What's Different from Before

### Old Way ❌
1. Create map in Google Maps
2. Download full KML file
3. Upload to admin panel
4. Update map? → Repeat from step 1

### New Way ✅
1. Create map in Google Maps
2. Download NetworkLink KML (once)
3. Upload to admin panel (once)
4. Update map? → Done! Automatic!

---

## Files That Were Added/Changed

**Don't need to know these, but here they are:**
- Added: `src/lib/service-area/fetchNetworkKML.ts` - Fetches from Google
- Added: `src/app/api/admin/service-area/status/route.ts` - Shows status
- Updated: Admin settings page - Shows NetworkLink status
- Updated: Service area check - Uses NetworkLink automatically

---

## Need Help?

See `NETWORKLINK_SETUP.md` for technical documentation.

For issues:
1. Check that your NetworkLink URL is accessible
2. Verify the KML has valid polygon data
3. Check browser console for errors
4. System logs will show if fetch fails

---

## Summary

🎯 **Goal:** Never manually update service area KML again
✅ **Solution:** NetworkLink KML that auto-syncs from Google Maps
🚀 **Result:** Set once, works forever with automatic updates!
