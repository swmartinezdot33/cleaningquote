# Signup Modal Implementation

## Overview

Created a modal-based signup flow that collects customer information, creates a Stripe customer, and redirects to the Stripe payment link with prefilled email.

## What Was Created

### 1. **SignupModal Component** (`src/components/SignupModal.tsx`)
- Modal form that collects:
  - First Name *
  - Last Name *
  - Email *
  - Phone *
  - Company Name (optional)
- Creates Stripe customer via API
- Redirects to payment link with prefilled email: `https://pay.cleanquote.io/b/dRmdRa4XldYmf9P7eu7bW00?prefilled_email={email}&client_reference_id={customerId}`

### 2. **API Endpoint** (`src/app/api/stripe/create-customer/route.ts`)
- POST endpoint that creates Stripe customers
- Validates required fields (firstName, lastName, email, phone)
- Stores metadata (firstName, lastName, company, source: 'cleanquote_signup')
- Returns `customerId` and `email`

### 3. **Dialog UI Component** (`src/components/ui/dialog.tsx`)
- Radix UI Dialog wrapper
- Installed `@radix-ui/react-dialog`

### 4. **Updated Pages**
- **MarketingPage** (`src/app/MarketingPage.tsx`):
  - All "Start free trial" and "Sign up" buttons now open the modal
  - Removed direct Stripe checkout links
- **Subscribe Page** (`src/app/subscribe/page.tsx`):
  - "Restore access" button opens the modal

## Flow

1. User clicks "Start 14-day free trial" or "Sign up"
2. Modal opens with signup form
3. User fills in: First Name, Last Name, Email, Phone, Company (optional)
4. On submit:
   - API creates Stripe customer with metadata
   - Returns `customerId`
   - Redirects to: `https://pay.cleanquote.io/b/dRmdRa4XldYmf9P7eu7bW00?prefilled_email={email}&client_reference_id={customerId}`
5. User completes payment on Stripe
6. Stripe webhook (`checkout.session.completed`) creates Supabase user + org using the customer email

## Benefits

- **Captures lead data** before payment (first name, last name, phone, company)
- **Prefills Stripe checkout** with email (better UX)
- **Links Stripe customer to checkout** via `client_reference_id`
- **Consistent branding** - modal stays on cleanquote.io before redirect

## Testing

1. Go to `https://www.cleanquote.io`
2. Click "Start 14-day free trial"
3. Fill in the form
4. Click "Continue to Payment"
5. Verify redirect to Stripe payment link with prefilled email
6. Complete payment (use test card if in test mode)
7. Verify webhook creates user + org in Supabase

## Environment Variables

No new env vars required. Uses existing:
- `STRIPE_SECRET_KEY` (for creating customers)
- Stripe webhook env vars (for post-payment account creation)

## Next Steps (Optional)

- Add SMS opt-in checkbox to the modal for toll-free number compliance
- Store lead data in a database even if payment fails (for follow-up)
- Add analytics tracking for modal open/submit/abandon
