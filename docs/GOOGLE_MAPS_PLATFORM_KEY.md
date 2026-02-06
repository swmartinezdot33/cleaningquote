# Google Maps API Key for CleanQuote (Platform)

CleanQuote uses a **single platform API key** so customers don’t need to provide their own. Set it once in your deployment environment and all tools get address autocomplete and service area checks.

---

## What the key is used for

| Feature | Google API | Used for |
|--------|------------|----------|
| Address autocomplete | **Places API** (Autocomplete) | Suggestions as the user types an address |
| Geocoding | **Geocoding API** | Convert address → lat/lng for service area check |
| Map / Geocoder in browser | **Maps JavaScript API** | Loads the SDK; Geocoder uses Geocoding API under the hood |

You must enable all three APIs for the key.

---

## 1. Create or select a Google Cloud project

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Sign in with the Google account you use for CleanQuote (e.g. your company account).
3. Create a new project or select an existing one:
   - **New:** Top bar → project dropdown → **New Project** → name it (e.g. `CleanQuote`) → **Create**.
   - **Existing:** Select the project from the dropdown.

---

## 2. Enable the required APIs

1. In the left menu go to **APIs & Services** → **Library** (or open [APIs & Services → Library](https://console.cloud.google.com/apis/library)).
2. Enable these three APIs (search by name, open, click **Enable**):

   | API name | Search term | Purpose |
   |----------|-------------|---------|
   | **Maps JavaScript API** | "Maps JavaScript API" | Loads the Maps JS SDK and Geocoder in the quote form |
   | **Places API** | "Places API" | Address autocomplete (suggestions) |
   | **Geocoding API** | "Geocoding API" | Address → coordinates for service area check |

3. Confirm all three show as **Enabled** under **APIs & Services** → **Enabled APIs**.

---

## 3. Create the API key

1. Go to **APIs & Services** → **Credentials** (or [Credentials](https://console.cloud.google.com/apis/credentials)).
2. Click **+ Create Credentials** → **API key**.
3. Copy the new key (you can restrict it in the next step).
4. (Optional but recommended) Click **Edit API key** (or open the key from the list):
   - **Name:** e.g. `CleanQuote production`
   - **Application restrictions:** choose **HTTP referrers (websites)**.
   - Add referrers so only your domains can use the key:
     - `https://www.cleanquote.io/*`
     - `https://cleanquote.io/*`
     - For preview/staging: `https://*.vercel.app/*` and/or your staging URL.
   - **API restrictions:** choose **Restrict key** and select only:
     - **Maps JavaScript API**
     - **Places API**
     - **Geocoding API**
   - Save.

---

## 4. Billing (required for production use)

Google requires a billing account to use these APIs beyond very small free tiers.

1. Go to **Billing** in the left menu (or [Billing](https://console.cloud.google.com/billing)).
2. Link a billing account to the project (or create one).
3. (Optional) Set **Budget & alerts** so you get notified if usage spikes.

Google provides a [monthly credit](https://developers.google.com/maps/billing-and-pricing) for Maps/Places/Geocoding; typical quote-form usage often stays within or near that. Monitor usage in **APIs & Services** → **Dashboard** and **Billing** → **Reports**.

---

## 5. Add the key to your environment

- **Local:** In `.env.local` add:
  ```bash
  GOOGLE_MAPS_API_KEY=your_api_key_here
  ```
- **Vercel (production):**
  1. Open your project in Vercel → **Settings** → **Environment Variables**.
  2. Add:
     - **Name:** `GOOGLE_MAPS_API_KEY`
     - **Value:** your API key
     - **Environment:** Production (and Preview if you want maps on preview deployments).
  3. Save and redeploy so the new variable is picked up.

After this, the app uses the platform key for layout and for every tool’s config; no customer setup is required.

---

## Quick checklist

- [ ] Google Cloud project created or selected  
- [ ] **Maps JavaScript API** enabled  
- [ ] **Places API** enabled  
- [ ] **Geocoding API** enabled  
- [ ] API key created  
- [ ] (Recommended) Key restricted to HTTP referrers and the three APIs above  
- [ ] Billing enabled on the project  
- [ ] `GOOGLE_MAPS_API_KEY` set in Vercel (and optionally in `.env.local` for local dev)

---

## Troubleshooting

- **"This page can't load Google Maps correctly"**  
  Usually the key is missing, wrong, or the APIs aren’t enabled. Check **Credentials** and **Enabled APIs** in Cloud Console.

- **Autocomplete or geocoding not working**  
  Confirm **Places API** and **Geocoding API** are enabled and that the key isn’t restricted to other APIs only.

- **Referrer restriction errors**  
  The domain in the browser (e.g. `https://www.cleanquote.io`) must match one of the HTTP referrer patterns you set for the key.
