'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface SignupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SignupModal({ open, onOpenChange }: SignupModalProps) {
  const [step, setStep] = useState<'form' | 'payment'>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [customerId, setCustomerId] = useState<string>('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    businessName: '',
  });

  // Load Stripe Buy Button script
  useEffect(() => {
    if (step === 'payment' && !document.querySelector('script[src="https://js.stripe.com/v3/buy-button.js"]')) {
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/buy-button.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, [step]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setStep('form');
      setError('');
      setCustomerId('');
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Create Stripe customer
      const response = await fetch('/api/stripe/create-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create customer');
      }

      const { customerId: newCustomerId } = await response.json();
      setCustomerId(newCustomerId);
      
      // Move to payment step
      setStep('payment');
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        {step === 'form' ? (
          <>
            <DialogHeader>
              <DialogTitle>Get Started with CleanQuote</DialogTitle>
              <DialogDescription>
                Enter your business information to continue to payment. Your account will be created after successful payment.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                required
                placeholder="John"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                required
                placeholder="Doe"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="businessName">Business Name *</Label>
            <Input
              id="businessName"
              required
              placeholder="ABC Cleaning Services"
              value={formData.businessName}
              onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Business Email *</Label>
            <Input
              id="email"
              type="email"
              required
              placeholder="john@abccleaning.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number *</Label>
            <Input
              id="phone"
              type="tel"
              required
              placeholder="(555) 123-4567"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              disabled={loading}
            />
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              'Continue to Payment'
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            By continuing, you agree to our{' '}
            <a href="/terms" target="_blank" className="underline hover:text-foreground">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" target="_blank" className="underline hover:text-foreground">
              Privacy Policy
            </a>
          </p>
        </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Complete Your Subscription</DialogTitle>
              <DialogDescription>
                Complete your payment to start your 14-day free trial. Your account will be created after successful payment.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 flex flex-col items-center justify-center min-h-[300px]">
              {process.env.NEXT_PUBLIC_STRIPE_BUY_BUTTON_ID && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? (
                <stripe-buy-button
                  buy-button-id={process.env.NEXT_PUBLIC_STRIPE_BUY_BUTTON_ID}
                  publishable-key={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}
                  customer-email={formData.email}
                  client-reference-id={customerId}
                >
                </stripe-buy-button>
              ) : (
                <div className="text-center text-sm text-muted-foreground">
                  <p>Stripe checkout is not configured.</p>
                  <p className="mt-2">Please set NEXT_PUBLIC_STRIPE_BUY_BUTTON_ID and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.</p>
                </div>
              )}
              
              <Button 
                variant="ghost" 
                onClick={() => setStep('form')} 
                className="mt-4"
              >
                ← Back to form
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
