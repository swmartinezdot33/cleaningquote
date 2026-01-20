'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Copy, ChevronLeft, ChevronRight, Sparkles, Calendar, Clock, Loader2, Check } from 'lucide-react';

const quoteSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
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
  ghlContactId?: string;
}

const questions = [
  {
    id: 'firstName',
    label: "What's your first name?",
    type: 'text',
    placeholder: 'John',
    required: true,
  },
  {
    id: 'lastName',
    label: "What's your last name?",
    type: 'text',
    placeholder: 'Doe',
    required: true,
  },
  {
    id: 'email',
    label: "What's your email address?",
    type: 'email',
    placeholder: 'john@example.com',
    required: true,
  },
  {
    id: 'phone',
    label: "What's your phone number?",
    type: 'tel',
    placeholder: '(555) 123-4567',
    required: true,
  },
  {
    id: 'squareFeet',
    label: "About how big is your home?",
    type: 'number',
    placeholder: '1500',
    required: true,
  },
  {
    id: 'serviceType',
    label: 'Type of Cleaning Service Needed',
    type: 'select',
    options: [
      { value: 'general', label: 'General Clean' },
      { value: 'deep', label: 'Deep Clean' },
      { value: 'move-in', label: 'Move In Clean' },
      { value: 'move-out', label: 'Move Out Clean' },
      { value: 'recurring', label: 'Recurring Clean' },
    ],
    required: true,
  },
  {
    id: 'frequency',
    label: 'How often would you like your home cleaned?',
    type: 'select',
    options: [
      { value: 'weekly', label: 'Weekly' },
      { value: 'bi-weekly', label: 'Bi-Weekly (Every 2 Weeks)' },
      { value: 'monthly', label: 'Monthly (Every 4 Weeks)' },
      { value: 'one-time', label: 'One-Time' },
    ],
    required: true,
  },
  {
    id: 'fullBaths',
    label: 'How many full baths?',
    type: 'number',
    placeholder: '2',
    required: true,
  },
  {
    id: 'halfBaths',
    label: 'How many half baths?',
    type: 'number',
    placeholder: '1',
    required: true,
  },
  {
    id: 'bedrooms',
    label: 'How many bedrooms in the home?',
    type: 'number',
    placeholder: '3',
    required: true,
  },
  {
    id: 'people',
    label: 'How many people live in the home?',
    type: 'number',
    placeholder: '2',
    required: true,
  },
  {
    id: 'sheddingPets',
    label: 'How many shedding pets live in the home?',
    type: 'number',
    placeholder: '1',
    required: true,
  },
  {
    id: 'condition',
    label: 'How would you describe the current condition of the home?',
    type: 'select',
    options: [
      { value: 'excellent', label: 'Excellent - Well maintained' },
      { value: 'good', label: 'Good - Generally clean' },
      { value: 'average', label: 'Average - Needs regular cleaning' },
      { value: 'poor', label: 'Poor - Needs deep cleaning' },
      { value: 'very-poor', label: 'Very Poor - Heavily soiled' },
    ],
    required: true,
  },
];

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [quoteResult, setQuoteResult] = useState<QuoteResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [direction, setDirection] = useState(1); // 1 for forward, -1 for backward
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [appointmentNotes, setAppointmentNotes] = useState('');
  const [isBookingAppointment, setIsBookingAppointment] = useState(false);
  const [bookingMessage, setBookingMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [appointmentConfirmed, setAppointmentConfirmed] = useState(false);
  const [widgetTitle, setWidgetTitle] = useState('Raleigh Cleaning Company');
  const [widgetSubtitle, setWidgetSubtitle] = useState("Let's get your professional cleaning price!");

  useEffect(() => {
    setMounted(true);
    loadWidgetSettings();
  }, []);

  const loadWidgetSettings = async () => {
    try {
      const response = await fetch('/api/admin/widget-settings');
      if (response.ok) {
        const data = await response.json();
        setWidgetTitle(data.title || 'Raleigh Cleaning Company');
        setWidgetSubtitle(data.subtitle || "Let's get your professional cleaning price!");
      }
    } catch (error) {
      console.error('Failed to load widget settings:', error);
    }
  };

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    trigger,
    getValues,
  } = useForm<QuoteFormData>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      squareFeet: undefined,
      serviceType: '',
      frequency: '',
      fullBaths: 0,
      halfBaths: 0,
      bedrooms: 0,
      people: 0,
      sheddingPets: 0,
      condition: '',
    },
  });

  const progress = ((currentStep + 1) / questions.length) * 100;

  if (!mounted) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-[#f61590]/5 via-white to-[#f61590]/5 pt-12 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-[#f61590] to-[#f61590]/70 bg-clip-text text-transparent mb-4">
            {widgetTitle}
          </h1>
          <p className="text-xl text-gray-600">Loading...</p>
        </div>
      </main>
    );
  }

  const nextStep = async () => {
    const currentQuestion = questions[currentStep];
    const isValid = await trigger(currentQuestion.id as keyof QuoteFormData);
    
    if (isValid) {
      setDirection(1);
      if (currentStep < questions.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        handleFormSubmit();
      }
    }
  };

  const prevStep = () => {
    setDirection(-1);
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFormSubmit = async () => {
    setIsLoading(true);
    setQuoteResult(null);
    setCopySuccess(false);

    try {
      const data = getValues();
      const apiPayload = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        serviceType: data.serviceType,
        frequency: data.frequency,
        squareFeet: Number(data.squareFeet),
        fullBaths: Number(data.fullBaths),
        halfBaths: Number(data.halfBaths),
        bedrooms: Number(data.bedrooms),
        people: Number(data.people),
        pets: Number(data.sheddingPets),
        sheddingPets: Number(data.sheddingPets),
        condition: data.condition,
      };

      const response = await fetch('/api/quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Failed to calculate quote');
      }

      const result = await response.json();
      setQuoteResult(result);
    } catch (error) {
      console.error('Error fetching quote:', error);
      alert(error instanceof Error ? error.message : 'Failed to calculate quote. Please try again.');
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

  const handleBookAppointment = async () => {
    if (!appointmentDate || !appointmentTime) {
      setBookingMessage({ type: 'error', text: 'Please select a date and time' });
      return;
    }

    if (!quoteResult?.ghlContactId) {
      setBookingMessage({
        type: 'error',
        text: 'Unable to book appointment - contact information not available',
      });
      return;
    }

    setIsBookingAppointment(true);
    setBookingMessage(null);

    try {
      const response = await fetch('/api/appointments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contactId: quoteResult.ghlContactId,
          date: appointmentDate,
          time: appointmentTime,
          notes: appointmentNotes || 'Appointment booked through quote form',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setBookingMessage({ type: 'success', text: 'Appointment booked successfully!' });
        setAppointmentConfirmed(true);
        setShowBookingForm(false);
        setTimeout(() => {
          setAppointmentDate('');
          setAppointmentTime('');
          setAppointmentNotes('');
        }, 1000);
      } else {
        setBookingMessage({
          type: 'error',
          text: data.error || 'Failed to book appointment',
        });
      }
    } catch (error) {
      console.error('Error booking appointment:', error);
      setBookingMessage({
        type: 'error',
        text: 'Failed to book appointment. Please try again.',
      });
    } finally {
      setIsBookingAppointment(false);
    }
  };

  const currentQuestion = questions[currentStep];

  if (quoteResult) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 pt-12 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {quoteResult.outOfLimits ? (
              <Card className="shadow-2xl border-2">
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <h2 className="text-2xl font-bold text-red-600 mb-4">Out of Limits</h2>
                    <p className="text-gray-700 mb-6">{quoteResult.message}</p>
                    <Button onClick={() => setQuoteResult(null)}>Go Back and Edit</Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                <Card className="shadow-2xl border-2 border-[#f61590]/20">
                  <CardContent className="pt-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Sparkles className="h-6 w-6 text-[#f61590]" />
                      Your Personalized Quote
                    </h2>
                    <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 bg-gray-50 p-4 rounded-md border overflow-auto">
                      {quoteResult.summaryText}
                    </pre>
                  </CardContent>
                </Card>

                <Card className="shadow-2xl border-2 border-[#f61590]/20">
                  <CardContent className="pt-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Copy/Paste Text Message</h2>
                    <div className="relative">
                      <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 bg-gray-50 p-4 rounded-md border overflow-auto max-h-96">
                        {quoteResult.smsText}
                      </pre>
                      <div className="flex gap-4 mt-4">
                        <Button
                          onClick={handleCopy}
                          variant={copySuccess ? 'secondary' : 'default'}
                          className="flex-1"
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          {copySuccess ? 'Copied!' : 'Copy to Clipboard'}
                        </Button>
                        <Button
                          onClick={() => {
                            setQuoteResult(null);
                            setCurrentStep(0);
                          }}
                          variant="outline"
                        >
                          Calculate Another Quote
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Appointment Booking Section */}
                {quoteResult?.ghlContactId && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    {appointmentConfirmed ? (
                      <Card className="shadow-2xl border-2 border-green-200 bg-green-50">
                        <CardContent className="pt-6">
                          <div className="text-center py-6">
                            <Check className="h-12 w-12 text-green-600 mx-auto mb-4" />
                            <h2 className="text-2xl font-bold text-green-900 mb-2">Appointment Confirmed!</h2>
                            <p className="text-green-800 mb-4">
                              We'll see you on <strong>{appointmentDate}</strong> at <strong>{appointmentTime}</strong>
                            </p>
                            <p className="text-sm text-green-700">
                              A confirmation has been sent to your email. If you need to reschedule, please contact us.
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card className="shadow-2xl border-2 border-[#f61590]/20">
                        <CardHeader className="bg-gradient-to-r from-[#f61590]/5 via-transparent to-transparent border-b">
                          <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-[#f61590]" />
                            Would You Like to Book an Appointment?
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                          {bookingMessage && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`mb-4 p-3 rounded-lg text-sm ${
                                bookingMessage.type === 'success'
                                  ? 'bg-green-50 text-green-800 border border-green-200'
                                  : 'bg-red-50 text-red-800 border border-red-200'
                              }`}
                            >
                              {bookingMessage.text}
                            </motion.div>
                          )}

                          {!showBookingForm ? (
                            <Button
                              onClick={() => setShowBookingForm(true)}
                              className="w-full h-12 text-lg font-semibold"
                            >
                              Yes, Let's Book It!
                            </Button>
                          ) : (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="space-y-4"
                            >
                              <div>
                                <Label htmlFor="date" className="text-base font-semibold">
                                  Preferred Date
                                </Label>
                                <Input
                                  id="date"
                                  type="date"
                                  value={appointmentDate}
                                  onChange={(e) => setAppointmentDate(e.target.value)}
                                  className="mt-2 h-10"
                                  min={new Date().toISOString().split('T')[0]}
                                />
                              </div>

                              <div>
                                <Label htmlFor="time" className="text-base font-semibold flex items-center gap-2">
                                  <Clock className="h-4 w-4" />
                                  Preferred Time
                                </Label>
                                <Input
                                  id="time"
                                  type="time"
                                  value={appointmentTime}
                                  onChange={(e) => setAppointmentTime(e.target.value)}
                                  className="mt-2 h-10"
                                />
                              </div>

                              <div>
                                <Label htmlFor="notes" className="text-base font-semibold">
                                  Additional Notes (Optional)
                                </Label>
                                <Input
                                  id="notes"
                                  type="text"
                                  placeholder="Any special requests or instructions..."
                                  value={appointmentNotes}
                                  onChange={(e) => setAppointmentNotes(e.target.value)}
                                  className="mt-2 h-10"
                                />
                              </div>

                              <div className="flex gap-3 pt-2">
                                <Button
                                  onClick={handleBookAppointment}
                                  disabled={isBookingAppointment || !appointmentDate || !appointmentTime}
                                  className="flex-1 h-11 font-semibold"
                                >
                                  {isBookingAppointment ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Booking...
                                    </>
                                  ) : (
                                    <>
                                      <Check className="mr-2 h-4 w-4" />
                                      Confirm Appointment
                                    </>
                                  )}
                                </Button>
                                <Button
                                  onClick={() => {
                                    setShowBookingForm(false);
                                    setBookingMessage(null);
                                  }}
                                  variant="outline"
                                  className="h-11 font-semibold"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </motion.div>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </motion.div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#f61590]/5 via-white to-[#f61590]/5 pt-12 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-bold bg-gradient-to-r from-[#f61590] to-[#f61590]/70 bg-clip-text text-transparent mb-4">
            {widgetTitle}
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            {widgetSubtitle}
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <Sparkles className="h-4 w-4 text-[#f61590]" />
            <span>Question {currentStep + 1} of {questions.length}</span>
          </div>
        </motion.div>

        {/* Progress Bar */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-8"
        >
          <Progress value={progress} className="h-3 shadow-lg" />
        </motion.div>

        {/* Question Card */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            initial={{ opacity: 0, x: direction * 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -100 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          >
            <Card className="shadow-2xl border-2 border-[#f61590]/20 bg-white/90 backdrop-blur-sm">
              <CardContent className="pt-8 pb-8 px-8">
                <div className="space-y-6">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Label htmlFor={currentQuestion.id} className="text-2xl font-semibold text-gray-900 block mb-4">
                      {currentQuestion.label}
                      {currentQuestion.required && <span className="text-[#f61590] ml-1">*</span>}
                    </Label>

                    {currentQuestion.type === 'text' && (
                      <Input
                        id={currentQuestion.id}
                        type="text"
                        placeholder={currentQuestion.placeholder}
                        className="h-14 text-lg"
                        {...register(currentQuestion.id as keyof QuoteFormData)}
                      />
                    )}

                    {currentQuestion.type === 'email' && (
                      <Input
                        id={currentQuestion.id}
                        type="email"
                        placeholder={currentQuestion.placeholder}
                        className="h-14 text-lg"
                        {...register(currentQuestion.id as keyof QuoteFormData)}
                      />
                    )}

                    {currentQuestion.type === 'tel' && (
                      <Input
                        id={currentQuestion.id}
                        type="tel"
                        placeholder={currentQuestion.placeholder}
                        className="h-14 text-lg"
                        {...register(currentQuestion.id as keyof QuoteFormData)}
                      />
                    )}

                    {currentQuestion.type === 'number' && (
                      <Input
                        id={currentQuestion.id}
                        type="number"
                        step="1"
                        placeholder={currentQuestion.placeholder}
                        className="h-14 text-lg"
                        {...register(currentQuestion.id as keyof QuoteFormData, { valueAsNumber: true })}
                      />
                    )}

                    {currentQuestion.type === 'select' && (
                      <Controller
                        name={currentQuestion.id as keyof QuoteFormData & 'serviceType' | 'frequency' | 'condition'}
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value || ''}>
                            <SelectTrigger className="h-14 text-lg">
                              <SelectValue placeholder="Select an option" />
                            </SelectTrigger>
                            <SelectContent>
                              {currentQuestion.options?.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    )}

                    {errors[currentQuestion.id as keyof QuoteFormData] && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-sm text-red-500 mt-2"
                      >
                        {errors[currentQuestion.id as keyof QuoteFormData]?.message}
                      </motion.p>
                    )}
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex justify-between items-center mt-8 gap-4"
        >
          <Button
            onClick={prevStep}
            disabled={currentStep === 0}
            variant="outline"
            size="lg"
            className="flex items-center gap-2 disabled:opacity-50"
          >
            <ChevronLeft className="h-5 w-5" />
            Previous
          </Button>

          <Button
            onClick={nextStep}
            disabled={isLoading}
            size="lg"
            className="flex items-center gap-2 min-w-[140px]"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                Calculating...
              </>
            ) : currentStep === questions.length - 1 ? (
              <>
                Get Quote
                <Sparkles className="h-5 w-5" />
              </>
            ) : (
              <>
                Next
                <ChevronRight className="h-5 w-5" />
              </>
            )}
          </Button>
        </motion.div>

        {/* Dots Indicator */}
        <div className="flex justify-center gap-2 mt-8">
          {questions.map((_, index) => (
            <motion.button
              key={index}
              onClick={() => {
                setDirection(index > currentStep ? 1 : -1);
                setCurrentStep(index);
              }}
              className={`h-2 rounded-full transition-all ${
                index === currentStep
                  ? 'w-8 bg-[#f61590]'
                  : index < currentStep
                  ? 'w-2 bg-[#f61590]/50'
                  : 'w-2 bg-gray-300'
              }`}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
