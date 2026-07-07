
## Scope

Five workstreams from your message, all against the real data in `Pedal_Database.xlsx` (Sobeys, Circle-K, Starbucks, Domino's — all on Tuscany Blvd NW, Calgary).

### 1. Real stores + items + logos

- Wipe the seeded demo stores/items and replace with the 4 stores from the sheet, geocoded to their Tuscany Blvd addresses.
- Item sizes: for Starbucks drinks and Domino's pizzas, add a `sizes` field (`Small / Medium / Large`) with per-size pricing. Reasonable guesses:
  - Starbucks: Small $4.25, Medium $4.95, Large $5.65 (drinks vary ±$0.30 by type)
  - Domino's pizza: Small $12.99, Medium $16.99, Large $19.99
- Store logos: rendered next to the store name. Fetch each brand's official logo (Sobeys, Circle K, Starbucks, Domino's) via Lovable Assets and store the URL on the `stores` row in a new `logo_url` column. Emoji stays as fallback.
- Cart / order flow updated so a line item carries its chosen size and the price is the size's price.

### 2. Phone / SMS verification

- Provider: **Twilio Verify** via the Lovable Twilio connector (SMS OTP, no template management, built for this).
- Flow: on profile, user enters phone → server fn calls Verify `start` → user enters 6-digit code → server fn calls Verify `check` → on success we set `profiles.phone_verified_at = now()` and store the E.164 number.
- Gates: `POST /orders` (place order) and `POST /rider-applications` (submit) reject with a clear error if `phone_verified_at` is null. UI hides the submit buttons and shows a "Verify your phone" CTA that opens the verify modal.
- Requires you to connect Twilio (I'll prompt for it in the next turn once you approve this plan).

### 3. Search-gigs filters (rider view)

Add a filter bar above the open-gigs list with:
- Max delivery distance (slider, 1–15 km, default 8)
- Min payout ($ slider, default $0)
- Max items in order (slider, default 20)
- Store filter (multi-select of active stores)
- Sort: newest / highest payout / closest

Filters persist in `localStorage` per rider and re-apply on reload. Distance is computed from the rider's current geolocation to `store_lat/lng` (already on `open_order_gigs`).

### 4. Profile customization

Extend `profiles` and settings page with:
- Avatar upload (new `avatars` public storage bucket, 2 MB cap, image/*)
- Display name, pronouns (optional), bio (280 chars)
- Home address with the address-based geocoder we already ship
- Delivery instructions (buzzer, gate code, drop-at-door, etc.) — attached to future orders by default
- Notification preferences (SMS on order updates: yes/no)
- Rider-only extras (shown when `has role 'rider'`): bike type, service radius, payout method placeholder

### 5. "Whole site works flawlessly"

Concrete pass, not a vague promise:
- Fix any broken routes / 404s from the recent additions (verify `/admin`, `/rider-application`, `/settings` all render for the right roles).
- Empty states everywhere (no gigs, no orders, no stores in your area, phone not verified).
- Error boundaries on every route with a loader.
- Loading skeletons on the store list, gig list, and admin queue.
- One end-to-end Playwright smoke check I run after building: sign in → verify phone (mocked) → place order → rider sees gig → accept → deliver.

## Technical outline

- **DB migration**: add `stores.logo_url text`, `store_items.sizes jsonb` (nullable — array of `{label, price_delta}` or `{label, price}`), `profiles.phone_e164 text`, `profiles.phone_verified_at timestamptz`, `profiles.pronouns text`, `profiles.bio text`, `profiles.delivery_instructions text`, `profiles.sms_notifications boolean default true`, `profiles.avatar_url text` (already exists — reuse).
- **Data change**: `DELETE FROM store_items; DELETE FROM stores;` then insert the 4 real stores + their items with sizes.
- **Storage**: create `avatars` bucket (public read, authenticated write scoped to `auth.uid()`).
- **Server fns** (`src/lib/verify.functions.ts`): `startPhoneVerification({ phone })`, `checkPhoneVerification({ code })`. Both `.middleware([requireSupabaseAuth])`. Call Twilio Verify via the connector gateway.
- **Order/rider-app server fns**: add `phone_verified_at IS NOT NULL` guard (throw before insert). No DB trigger needed — it lives in the server fn so we can return a friendly error.
- **Filters**: pure client-side reducer over the `open_order_gigs` query; store filter state in a `useLocalStorage` hook.
- **Item sizes UI**: `SizePicker` component; cart item shape gains `sizeLabel` and `unitPrice`.

## What I need from you

1. Approve this plan.
2. In the next turn I'll ask you to connect **Twilio** (one click via the connector prompt). Without it, phone verification can't ship — the rest of the plan doesn't depend on it and I can build it in parallel.
3. Confirm the Starbucks/Domino's size prices above are close enough (or give me your numbers).
