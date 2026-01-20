'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy } from 'lucide-react';

const quoteSchema = z.object({
  squareFeet: z.number().positive('Square footage must be a positive number'),
  serviceType: z.string().min(1, 'Please select a service type'),
  frequency: z.string().min(1, 'Please select a frequency'),
  fullBaths: z.number().int().min(0, 'Number of full baths must be 0 or greater'),
  halfBaths: z.number().int().min(0, 'Number of half baths must be 0 or greater'),
  bedrooms: z.number().int().min(0, 'Number of bedrooms must be 0 or greater'),
  people: z.number().int().min(0, 'Number of people must be 0 or greater'),
  sheddingPets: z.number().int().min(0, 'Number of shedding pets must be 0 or greater'),
  condition: z.string().min(1, 'Please describe the condition of your home'),
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
    control,
    formState: { errors },
  } = useForm<QuoteFormData>({
    resolver: zodResolver(quoteSchema),
  });

  const onSubmit = async (data: QuoteFormData) => {
    setIsLoading(true);
    setQuoteResult(null);
    setCopySuccess(false);

    try {
      // Convert form data to API format (API still uses the old format)
      const apiPayload = {
        squareFeet: data.squareFeet,
        people: data.people,
        pets: data.sheddingPets, // API expects pets count, using shedding pets
        sheddingPets: data.sheddingPets,
      };

      const response = await fetch('/api/quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiPayload),
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
            Rosieigh Cleaning Pricing
          </h1>
          <p className="text-lg text-gray-600">
            Let's get your professional cleaning price!
          </p>
        </div>

        {!quoteResult && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Get Your Quote</CardTitle>
              <CardDescription>
                Please answer all questions below to get your personalized quote
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="squareFeet">
                      About how big is your home? <span className="text-red-500">*</span>
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
                    <Label htmlFor="serviceType">
                      Type of Cleaning Service Needed <span className="text-red-500">*</span>
                    </Label>
                    <Controller
                      name="serviceType"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select service type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">General Clean</SelectItem>
                            <SelectItem value="deep">Deep Clean</SelectItem>
                            <SelectItem value="move-in">Move In Clean</SelectItem>
                            <SelectItem value="move-out">Move Out Clean</SelectItem>
                            <SelectItem value="recurring">Recurring Clean</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.serviceType && (
                      <p className="text-sm text-red-500">{errors.serviceType.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="frequency">
                      How often would you like your home cleaned? <span className="text-red-500">*</span>
                    </Label>
                    <Controller
                      name="frequency"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="bi-weekly">Bi-Weekly (Every 2 Weeks)</SelectItem>
                            <SelectItem value="monthly">Monthly (Every 4 Weeks)</SelectItem>
                            <SelectItem value="one-time">One-Time</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.frequency && (
                      <p className="text-sm text-red-500">{errors.frequency.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullBaths">
                        How many full baths? <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="fullBaths"
                        type="number"
                        step="1"
                        placeholder="2"
                        {...register('fullBaths', { valueAsNumber: true })}
                      />
                      {errors.fullBaths && (
                        <p className="text-sm text-red-500">{errors.fullBaths.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="halfBaths">
                        How many half baths? <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="halfBaths"
                        type="number"
                        step="1"
                        placeholder="1"
                        {...register('halfBaths', { valueAsNumber: true })}
                      />
                      {errors.halfBaths && (
                        <p className="text-sm text-red-500">{errors.halfBaths.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bedrooms">
                        How many bedrooms in the home? <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="bedrooms"
                        type="number"
                        step="1"
                        placeholder="3"
                        {...register('bedrooms', { valueAsNumber: true })}
                      />
                      {errors.bedrooms && (
                        <p className="text-sm text-red-500">{errors.bedrooms.message}</p>
                      )}
                    </div>
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
                    <Label htmlFor="sheddingPets">
                      How many shedding pets live in the home? <span className="text-red-500">*</span>
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

                  <div className="space-y-2">
                    <Label htmlFor="condition">
                      How would you describe the current condition of the home? <span className="text-red-500">*</span>
                    </Label>
                    <Controller
                      name="condition"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select condition" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="excellent">Excellent - Well maintained</SelectItem>
                            <SelectItem value="good">Good - Generally clean</SelectItem>
                            <SelectItem value="average">Average - Needs regular cleaning</SelectItem>
                            <SelectItem value="poor">Poor - Needs deep cleaning</SelectItem>
                            <SelectItem value="very-poor">Very Poor - Heavily soiled</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.condition && (
                      <p className="text-sm text-red-500">{errors.condition.message}</p>
                    )}
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Calculating...' : 'Get My Quote'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {quoteResult && (
          <div className="space-y-6">
            {quoteResult.outOfLimits ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-red-600">Out of Limits</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">{quoteResult.message}</p>
                  <Button
                    onClick={() => setQuoteResult(null)}
                    className="mt-4"
                  >
                    Go Back and Edit
                  </Button>
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
                      <div className="flex gap-4 mt-4">
                        <Button
                          onClick={handleCopy}
                          variant={copySuccess ? 'secondary' : 'default'}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          {copySuccess ? 'Copied!' : 'Copy to Clipboard'}
                        </Button>
                        <Button
                          onClick={() => setQuoteResult(null)}
                          variant="outline"
                        >
                          Calculate Another Quote
                        </Button>
                      </div>
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
