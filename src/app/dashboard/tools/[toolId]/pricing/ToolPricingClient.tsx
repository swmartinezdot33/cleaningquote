'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, Sparkles, ExternalLink, Settings } from 'lucide-react';
import { LoadingDots } from '@/components/ui/loading-dots';

const CONDITIONS = ['excellent', 'good', 'average', 'fair', 'poor', 'very-poor'] as const;

export default function ToolPricingClient({ toolId }: { toolId: string }) {
  const [initialCleaning, setInitialCleaning] = useState({
    multiplier: 1.5,
    requiredConditions: ['poor'] as string[],
    recommendedConditions: ['fair'] as string[],
    sheddingPetsMultiplier: 1.1,
    peopleMultiplier: 1.05,
    peopleMultiplierBase: 4,
    sheddingPetsMultiplierBase: 0,
  });
  const [savingInitial, setSavingInitial] = useState(false);
  const [initialMessage, setInitialMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const loadInitialCleaning = async () => {
    try {
      const res = await fetch(`/api/dashboard/tools/${toolId}/initial-cleaning-config`);
      if (res.ok) {
        const ic = await res.json();
        setInitialCleaning({
          multiplier: ic.multiplier ?? 1.5,
          requiredConditions: Array.isArray(ic.requiredConditions) ? ic.requiredConditions : ['poor'],
          recommendedConditions: Array.isArray(ic.recommendedConditions) ? ic.recommendedConditions : ['fair'],
          sheddingPetsMultiplier: ic.sheddingPetsMultiplier ?? 1.1,
          peopleMultiplier: ic.peopleMultiplier ?? 1.05,
          peopleMultiplierBase: ic.peopleMultiplierBase ?? 4,
          sheddingPetsMultiplierBase: ic.sheddingPetsMultiplierBase ?? 0,
        });
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialCleaning();
  }, [toolId]);

  const saveInitialCleaning = async () => {
    setSavingInitial(true);
    setInitialMessage(null);
    try {
      const res = await fetch(`/api/dashboard/tools/${toolId}/initial-cleaning-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(initialCleaning),
      });
      const data = await res.json();
      if (res.ok) {
        setInitialMessage({ type: 'success', text: data.message ?? 'Initial Cleaning config saved' });
      } else {
        setInitialMessage({ type: 'error', text: data.error ?? 'Failed to save' });
      }
    } catch {
      setInitialMessage({ type: 'error', text: 'Failed to save' });
    } finally {
      setSavingInitial(false);
    }
  };

  const toggleCondition = (list: 'requiredConditions' | 'recommendedConditions', condition: string) => {
    const current = initialCleaning[list];
    const next = current.includes(condition) ? current.filter((c) => c !== condition) : [...current, condition];
    setInitialCleaning((prev) => ({ ...prev, [list]: next }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingDots size="lg" className="text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg border-2 border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">Pricing structures</CardTitle>
          <CardDescription>
            Pricing tables and named structures are managed at the organization level. Create and edit structures, then assign which one to use per service area (or as this tool&apos;s default) in Settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link href="/dashboard/pricing-structures">
            <Button variant="default" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Pricing
            </Button>
          </Link>
          <Link href={`/dashboard/tools/${toolId}/settings`}>
            <Button variant="outline" className="gap-2">
              <Settings className="h-4 w-4" />
              Settings (assign structure)
            </Button>
          </Link>
        </CardContent>
      </Card>

      <Card className="shadow-lg hover:shadow-xl transition-shadow border border-border">
        <CardHeader className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-b pb-6">
          <CardTitle className="flex items-center gap-2 text-2xl font-bold">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Initial Cleaning Configuration
          </CardTitle>
          <CardDescription>
            Configure pricing multiplier and home conditions for Initial Cleaning (first deep clean to reach maintenance standards) for this tool.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-8 pb-8">
          <div className="space-y-6">
            {initialMessage && (
              <div
                className={`p-4 rounded-lg ${
                  initialMessage.type === 'success'
                    ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400 border border-green-200 dark:border-green-800'
                    : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800'
                }`}
              >
                {initialMessage.text}
              </div>
            )}

            <div>
              <Label htmlFor="multiplier" className="text-base font-semibold">
                Initial Cleaning Multiplier
              </Label>
              <p className="text-sm text-muted-foreground mt-1 mb-3">
                Price multiplier applied to General Clean price (1.0 = same as General, 1.5 = 50% more)
              </p>
              <div className="flex items-center gap-2">
                <Input
                  id="multiplier"
                  type="number"
                  min={1.0}
                  max={3.0}
                  step={0.1}
                  value={initialCleaning.multiplier}
                  onChange={(e) => setInitialCleaning((prev) => ({ ...prev, multiplier: parseFloat(e.target.value) || 1.5 }))}
                  className="flex-1 h-10 max-w-[8rem]"
                />
                <span className="text-sm font-semibold text-muted-foreground">×</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="shedding-pets-multiplier" className="text-base font-semibold">
                  Shedding Pets Multiplier
                </Label>
                <p className="text-sm text-muted-foreground mt-1 mb-3">
                  Price multiplier per shedding pet above base (1.0 = no extra charge, 1.1 = 10% more per pet)
                </p>
                <div className="flex flex-wrap items-center gap-2 gap-y-1">
                  <span className="text-sm text-muted-foreground">Base:</span>
                  <Input
                    id="shedding-pets-base"
                    type="number"
                    min={0}
                    max={10}
                    step={1}
                    value={initialCleaning.sheddingPetsMultiplierBase}
                    onChange={(e) => setInitialCleaning((prev) => ({ ...prev, sheddingPetsMultiplierBase: Math.max(0, Math.min(10, parseInt(e.target.value, 10) || 0)) }))}
                    className="h-10 w-20"
                  />
                  <span className="text-sm text-muted-foreground">pets at regular rate, then</span>
                  <Input
                    id="shedding-pets-multiplier"
                    type="number"
                    min={1.0}
                    max={2.0}
                    step={0.05}
                    value={initialCleaning.sheddingPetsMultiplier}
                    onChange={(e) => setInitialCleaning((prev) => ({ ...prev, sheddingPetsMultiplier: parseFloat(e.target.value) || 1.1 }))}
                    className="flex-1 h-10 max-w-[8rem]"
                  />
                  <span className="text-sm font-semibold text-muted-foreground">× per extra pet</span>
                </div>
              </div>
              <div>
                <Label htmlFor="people-multiplier" className="text-base font-semibold">
                  People Multiplier
                </Label>
                <p className="text-sm text-muted-foreground mt-1 mb-3">
                  Price multiplier per person above base (1.0 = no extra charge, 1.05 = 5% more per person)
                </p>
                <div className="flex flex-wrap items-center gap-2 gap-y-1">
                  <span className="text-sm text-muted-foreground">Base:</span>
                  <Input
                    id="people-base"
                    type="number"
                    min={0}
                    max={20}
                    step={1}
                    value={initialCleaning.peopleMultiplierBase}
                    onChange={(e) => setInitialCleaning((prev) => ({ ...prev, peopleMultiplierBase: Math.max(0, Math.min(20, parseInt(e.target.value, 10) || 0)) }))}
                    className="h-10 w-20"
                  />
                  <span className="text-sm text-muted-foreground">people at regular rate, then</span>
                  <Input
                    id="people-multiplier"
                    type="number"
                    min={1.0}
                    max={2.0}
                    step={0.05}
                    value={initialCleaning.peopleMultiplier}
                    onChange={(e) => setInitialCleaning((prev) => ({ ...prev, peopleMultiplier: parseFloat(e.target.value) || 1.05 }))}
                    className="flex-1 h-10 max-w-[8rem]"
                  />
                  <span className="text-sm font-semibold text-muted-foreground">× per extra person</span>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-base font-semibold">Home Conditions Requiring Initial Cleaning</Label>
              <p className="text-sm text-muted-foreground mt-1 mb-3">
                Select which home conditions REQUIRE Initial Cleaning
              </p>
              <div className="space-y-2">
                {CONDITIONS.map((condition) => (
                  <label key={condition} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={initialCleaning.requiredConditions.includes(condition)}
                      onChange={() => toggleCondition('requiredConditions', condition)}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm capitalize">{condition.replace('-', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-base font-semibold">Home Conditions Recommending Initial Cleaning</Label>
              <p className="text-sm text-muted-foreground mt-1 mb-3">
                Select which home conditions RECOMMEND Initial Cleaning (not required, but suggested)
              </p>
              <div className="space-y-2">
                {CONDITIONS.map((condition) => (
                  <label key={condition} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={initialCleaning.recommendedConditions.includes(condition)}
                      onChange={() => toggleCondition('recommendedConditions', condition)}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm capitalize">{condition.replace('-', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>

            <Button
              onClick={saveInitialCleaning}
              disabled={savingInitial}
              className="w-full h-11 font-semibold flex items-center gap-2"
            >
              {savingInitial ? (
                <>
                  <LoadingDots size="sm" className="text-current" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Initial Cleaning Config
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
