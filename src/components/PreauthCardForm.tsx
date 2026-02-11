'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, CreditCard } from 'lucide-react';
import { LoadingDots } from '@/components/ui/loading-dots';

const CARD_TYPES = [
  { value: 'Visa', label: 'Visa' },
  { value: 'Mastercard', label: 'Mastercard' },
  { value: 'American Express', label: 'American Express' },
  { value: 'Discover', label: 'Discover' },
  { value: 'Other', label: 'Other' },
];

export interface PreauthCardData {
  cardNumber: string;
  nameOnCard: string;
  expMonth: string;
  expYear: string;
  cvv: string;
  cardType: string;
}

function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 19);
  const parts: string[] = [];
  for (let i = 0; i < digits.length; i += 4) parts.push(digits.slice(i, i + 4));
  return parts.join(' ');
}

function formatExpMonth(value: string): string {
  const n = value.replace(/\D/g, '').slice(0, 2);
  const num = parseInt(n, 10);
  if (n.length === 1 && num > 1) return `0${n}`;
  if (n.length === 2 && num > 12) return '12';
  return n;
}

function formatExpYear(value: string): string {
  return value.replace(/\D/g, '').slice(0, 4);
}

function formatCvv(value: string): string {
  return value.replace(/\D/g, '').slice(0, 4);
}

export function PreauthCardForm({
  onSubmit,
  onSkip,
  primaryColor = '#7c3aed',
  isSubmitting,
}: {
  onSubmit: (data: PreauthCardData) => void;
  onSkip?: () => void;
  primaryColor?: string;
  isSubmitting: boolean;
}) {
  const [cardType, setCardType] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardNumberFocused, setCardNumberFocused] = useState(false);
  const [nameOnCard, setNameOnCard] = useState('');
  const [expMonth, setExpMonth] = useState('');
  const [expYear, setExpYear] = useState('');
  const [cvv, setCvv] = useState('');
  const [cvvFocused, setCvvFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rawDigits = cardNumber.replace(/\s/g, '');
  const cardNumberMasked = rawDigits.length >= 4
    ? `**** **** **** ${rawDigits.slice(-4)}`
    : rawDigits.length > 0
      ? '*'.repeat(Math.min(rawDigits.length, 4))
      : '';
  const cvvMasked = cvv.length > 0 ? '***' : '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const rawNumber = cardNumber.replace(/\s/g, '');
    if (rawNumber.length < 13) {
      setError('Please enter a valid card number.');
      return;
    }
    const month = expMonth.replace(/\D/g, '').padStart(2, '0');
    const year = expYear.replace(/\D/g, '');
    if (month.length !== 2 || year.length < 2) {
      setError('Please enter a valid expiration date (MM/YY).');
      return;
    }
    if (cvv.replace(/\D/g, '').length < 3) {
      setError('Please enter a valid security code.');
      return;
    }
    if (!nameOnCard.trim()) {
      setError('Please enter the name on card.');
      return;
    }
    onSubmit({
      cardNumber: rawNumber,
      nameOnCard: nameOnCard.trim(),
      expMonth: month,
      expYear: year.length === 4 ? year.slice(-2) : year,
      cvv: cvv.replace(/\D/g, ''),
      cardType: cardType || 'Other',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-xl border-2 border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium text-gray-700">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
            <Lock className="h-4 w-4 text-green-700" />
          </div>
          <span>Secure payment information — for your service. You will not be charged now.</span>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="preauth-card-type" className="text-sm font-semibold text-gray-800">
              Card type
            </Label>
            <select
              id="preauth-card-type"
              value={cardType}
              onChange={(e) => setCardType(e.target.value)}
              className="mt-1.5 w-full rounded-lg border-2 border-gray-200 bg-white px-3 py-2.5 text-base focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
              autoComplete="off"
            >
              <option value="">Select card type</option>
              {CARD_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="preauth-card-number" className="text-sm font-semibold text-gray-800">
              Card number
            </Label>
            <div className="relative mt-1.5">
              <CreditCard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                id="preauth-card-number"
                type="tel"
                inputMode="numeric"
                placeholder="1234 5678 9012 3456"
                value={cardNumberFocused ? cardNumber : cardNumberMasked}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                onFocus={() => setCardNumberFocused(true)}
                onBlur={() => setCardNumberFocused(false)}
                className="pl-10 font-mono tracking-wider"
                autoComplete="off"
                maxLength={19}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="preauth-name" className="text-sm font-semibold text-gray-800">
              Name on card
            </Label>
            <Input
              id="preauth-name"
              type="text"
              placeholder="As it appears on the card"
              value={nameOnCard}
              onChange={(e) => setNameOnCard(e.target.value)}
              className="mt-1.5"
              autoComplete="cc-name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="preauth-exp" className="text-sm font-semibold text-gray-800">
                Expiration (MM/YY)
              </Label>
              <div className="mt-1.5 flex gap-2">
                <Input
                  id="preauth-exp-month"
                  type="tel"
                  placeholder="MM"
                  value={expMonth}
                  onChange={(e) => setExpMonth(formatExpMonth(e.target.value))}
                  className="w-20 text-center"
                  autoComplete="cc-exp-month"
                  maxLength={2}
                />
                <span className="flex items-center text-gray-500">/</span>
                <Input
                  id="preauth-exp-year"
                  type="tel"
                  placeholder="YY"
                  value={expYear}
                  onChange={(e) => setExpYear(formatExpYear(e.target.value))}
                  className="w-20 text-center"
                  autoComplete="cc-exp-year"
                  maxLength={4}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="preauth-cvv" className="text-sm font-semibold text-gray-800">
                Security code (CVV)
              </Label>
              <Input
                id="preauth-cvv"
                type="tel"
                inputMode="numeric"
                placeholder="123"
                value={cvvFocused ? cvv : cvvMasked}
                onChange={(e) => setCvv(formatCvv(e.target.value))}
                onFocus={() => setCvvFocused(true)}
                onBlur={() => setCvvFocused(false)}
                className="mt-1.5 w-full font-mono"
                autoComplete="off"
                maxLength={4}
              />
            </div>
          </div>
        </div>

        {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="gap-2"
          style={{ backgroundColor: primaryColor }}
        >
          {isSubmitting ? <LoadingDots size="sm" className="text-current" /> : <Lock className="h-4 w-4" />}
          {isSubmitting ? 'Saving...' : 'Save card & confirm appointment'}
        </Button>
        {onSkip && (
          <Button type="button" variant="outline" onClick={onSkip} disabled={isSubmitting}>
            Confirm without payment info
          </Button>
        )}
      </div>
    </form>
  );
}
