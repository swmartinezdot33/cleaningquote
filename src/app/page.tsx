'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy } from 'lucide-react';

const quoteSchema = z.object({
  squareFeet: z.number().positive('Square footage must be a positive number'),
  people: z.number().int().min(0, 'Number of people must be 0 or greater'),
  pets: z.number().int().min(0, 'Number of pets must be 0 or greater'),
  sheddingPets: z.number().int().min(0, 'Number of shedding pets must be 0 or greater'),
}).refine((data) => data.sheddingPets <= data.pets, {
  message: 'Number of shedding pets cannot exceed total pets',
  path: ['sheddingPets'],
});

type QuoteFormData = z.infer<typeof quoteSchema>;

interface QuoteResponse {
  outOfLimits: boolean;
  message?: string;
  multiplier?: number;
  inputs?: {
    squareFeet: number;
    people: number;
    pets: number;
    sheddingPets: number;
  };
  ranges?: {
    weekly: { low: number; high: number };
    biWeekly: { low: number; high: number };
    fourWeek: { low: number; high: number };
    general: { low: number; high: number };
    deep: { low: number; high: number };
    moveInOutBasic: { low: number; high: number };
    moveInOutFull: { low: number; high: number };
  };
  summaryText?: string;
  smsText?: string;
}

export default function Home() {
  const [quoteResult, setQuoteResult] = useState<QuoteResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<QuoteFormData>({
    resolver: zodResolver(quoteSchema),
  });

  const onSubmit = async (data: QuoteFormData) => {
    setIsLoading(true);
    setQuoteResult(null);
    setCopySuccess(false);

    try {
      const response = await fetch('/api/quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      setQuoteResult(result);
    } catch (error) {
      console.error('Error fetching quote:', error);
      alert('Failed to calculate quote. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (quoteResult?.smsText) {
      try {
        await navigator.clipboard.writeText(quoteResult.smsText);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (error) {
        console.error('Failed to copy:', error);
        alert('Failed to copy text. Please select and copy manually.');
      }
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Cleaning Quote Calculator
          </h1>
          <p className="text-lg text-gray-600">
            Get an instant quote for residential cleaning services
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Enter Home Information</CardTitle>
            <CardDescription>
              Please provide the following details to calculate your quote
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="squareFeet">
                    Square Feet <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="squareFeet"
                    type="number"
                    step="1"
                    placeholder="1500"
                    {...register('squareFeet', { valueAsNumber: true })}
                  />
                  {errors.squareFeet && (
                    <p className="text-sm text-red-500">{errors.squareFeet.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="people">
                    How many people live in the home? <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="people"
                    type="number"
                    step="1"
                    placeholder="2"
                    {...register('people', { valueAsNumber: true })}
                  />
                  {errors.people && (
                    <p className="text-sm text-red-500">{errors.people.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pets">
                    How many pets live in the home? <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="pets"
                    type="number"
                    step="1"
                    placeholder="1"
                    {...register('pets', { valueAsNumber: true })}
                  />
                  {errors.pets && (
                    <p className="text-sm text-red-500">{errors.pets.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sheddingPets">
                    How many of those pets are shedding pets? <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="sheddingPets"
                    type="number"
                    step="1"
                    placeholder="1"
                    {...register('sheddingPets', { valueAsNumber: true })}
                  />
                  {errors.sheddingPets && (
                    <p className="text-sm text-red-500">{errors.sheddingPets.message}</p>
                  )}
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Calculating...' : 'Calculate Quote'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {quoteResult && (
          <div className="space-y-6">
            {quoteResult.outOfLimits ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-red-600">Out of Limits</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">{quoteResult.message}</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Pricing Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700">
                      {quoteResult.summaryText}
                    </pre>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Copy/Paste Text Message</CardTitle>
                    <CardDescription>
                      Click the copy button below to copy the formatted message
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="relative">
                      <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 bg-gray-50 p-4 rounded-md border overflow-auto max-h-96">
                        {quoteResult.smsText}
                      </pre>
                      <Button
                        onClick={handleCopy}
                        className="mt-4"
                        variant={copySuccess ? 'secondary' : 'default'}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        {copySuccess ? 'Copied!' : 'Copy to Clipboard'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
