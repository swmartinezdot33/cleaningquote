'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle } from 'lucide-react';

interface SignupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type LoadingState = 'idle' | 'creating' | 'redirecting';

export function SignupModal({ open, onOpenChange }: SignupModalProps) {
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [error, setError] = useState('');
  const [plan, setPlan] = useState<'monthly' | 'annual'>('annual');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    businessName: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoadingState('creating');

    try {
      // Create Stripe customer and get checkout URL
      const response = await fetch('/api/stripe/create-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, plan }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create customer');
      }

      if (data.checkoutUrl) {
        setLoadingState('redirecting');
        // Small delay so user sees the "redirecting" state
        await new Promise(resolve => setTimeout(resolve, 500));
        // Redirect to Stripe checkout with customer already attached (email locked)
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoadingState('idle');
    }
  };

  const isLoading = loadingState !== 'idle';

  // Show loading overlay when processing
  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-[400px]" onPointerDownOutside={(e) => e.preventDefault()}>
          <div className="flex flex-col items-center justify-center py-12 space-y-6">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                {loadingState === 'redirecting' ? (
                  <CheckCircle className="h-8 w-8 text-primary" />
                ) : (
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                )}
              </div>
            </div>
            
            <div className="text-center space-y-2">
              <h3 className="font-semibold text-lg">
                {loadingState === 'creating' && 'Creating your account...'}
                {loadingState === 'redirecting' && 'Redirecting to payment...'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {loadingState === 'creating' && 'Setting up your CleanQuote account'}
                {loadingState === 'redirecting' && 'Taking you to secure checkout'}
              </p>
            </div>

            {/* Progress steps */}
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  loadingState === 'creating' ? 'bg-primary text-primary-foreground' : 'bg-primary/20 text-primary'
                }`}>
                  {loadingState === 'redirecting' ? <CheckCircle className="h-4 w-4" /> : '1'}
                </div>
                <span className={loadingState === 'redirecting' ? 'text-muted-foreground' : ''}>
                  Create account
                </span>
              </div>
              <div className="w-8 h-px bg-border" />
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  loadingState === 'redirecting' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  2
                </div>
                <span className={loadingState === 'creating' ? 'text-muted-foreground' : ''}>
                  Payment
                </span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Get Started with CleanQuote</DialogTitle>
          <DialogDescription>
            Enter your business information to start your 14-day free trial.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Billing Plan</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPlan('monthly')}
                className={`rounded-lg border-2 px-4 py-3 text-left transition-colors ${
                  plan === 'monthly'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <span className="font-medium">Monthly</span>
                <span className="block text-sm text-muted-foreground">Billed monthly</span>
              </button>
              <button
                type="button"
                onClick={() => setPlan('annual')}
                className={`rounded-lg border-2 px-4 py-3 text-left transition-colors ${
                  plan === 'annual'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <span className="font-medium">Annual</span>
                <span className="block text-sm text-green-600 dark:text-green-500">Save with yearly billing</span>
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                required
                placeholder="John"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                disabled={isLoading}
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
                disabled={isLoading}
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
              disabled={isLoading}
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
              disabled={isLoading}
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
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            Continue to Payment →
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
      </DialogContent>
    </Dialog>
  );
}
