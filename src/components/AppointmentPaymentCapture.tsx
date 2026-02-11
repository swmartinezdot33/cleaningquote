'use client';

import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { CreditCard } from 'lucide-react';
import { LoadingDots } from '@/components/ui/loading-dots';

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '16px',
      color: '#374151',
      '::placeholder': { color: '#9ca3af' },
    },
    invalid: {
      color: '#dc2626',
    },
  },
};

function PaymentForm({
  clientSecret,
  onSuccess,
  onSkip,
  primaryColor = '#7c3aed',
  isSubmitting,
}: {
  clientSecret: string;
  onSuccess: (paymentMethodId: string) => void;
  onSkip?: () => void;
  primaryColor?: string;
  isSubmitting: boolean;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    const card = elements.getElement(CardElement);
    if (!card) {
      setError('Payment form not ready.');
      return;
    }

    setError(null);
    const { error: confirmError, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
      payment_method: { card },
    });

    if (confirmError) {
      setError(confirmError.message ?? 'Payment method could not be saved.');
      return;
    }
    if (setupIntent?.payment_method)
      onSuccess(typeof setupIntent.payment_method === 'string' ? setupIntent.payment_method : setupIntent.payment_method.id);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-lg border-2 border-gray-200 bg-gray-50 p-4">
        <p className="text-sm font-medium text-gray-700 mb-2">Payment information (for your service — no charge now)</p>
        <div className="py-2 px-3 bg-white rounded-lg border border-gray-200">
          <CardElement options={CARD_ELEMENT_OPTIONS} />
        </div>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </div>
      <div className="flex flex-wrap gap-3">
        <Button
          type="submit"
          disabled={!stripe || isSubmitting}
          className="gap-2"
          style={{ backgroundColor: primaryColor }}
        >
          {isSubmitting ? <LoadingDots size="sm" className="text-current" /> : <CreditCard className="h-4 w-4" />}
          {isSubmitting ? 'Saving...' : 'Save payment & confirm appointment'}
        </Button>
        {onSkip && (
          <Button type="button" variant="outline" onClick={onSkip} disabled={isSubmitting}>
            Confirm without payment
          </Button>
        )}
      </div>
    </form>
  );
}

export function AppointmentPaymentCapture({
  clientSecret,
  onSuccess,
  onSkip,
  primaryColor = '#7c3aed',
  isSubmitting,
}: {
  clientSecret: string;
  onSuccess: (paymentMethodId: string) => void;
  onSkip?: () => void;
  primaryColor?: string;
  isSubmitting: boolean;
}) {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
  if (!publishableKey) {
    return (
      <div className="text-sm text-gray-500">
        Payment capture is not configured. Use the button below to confirm without payment.
        {onSkip && (
          <Button type="button" variant="outline" className="mt-2" onClick={onSkip} disabled={isSubmitting}>
            Confirm without payment
          </Button>
        )}
      </div>
    );
  }

  const stripePromise = loadStripe(publishableKey);

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <PaymentForm
        clientSecret={clientSecret}
        onSuccess={onSuccess}
        onSkip={onSkip}
        primaryColor={primaryColor}
        isSubmitting={isSubmitting}
      />
    </Elements>
  );
}
