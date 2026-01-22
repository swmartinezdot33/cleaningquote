'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, ChevronLeft, ChevronRight, Loader2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CalendarBookingProps {
  type: 'appointment' | 'call';
  onConfirm: (date: string, time: string, notes: string) => void;
  onCancel: () => void;
  isBooking: boolean;
  primaryColor?: string;
}

interface AvailableSlot {
  start: number; // timestamp in milliseconds
  end: number;
}

interface DayAvailability {
  date: string; // YYYY-MM-DD
  slots: AvailableSlot[];
  hasAvailability: boolean;
}

export function CalendarBooking({
  type,
  onConfirm,
  onCancel,
  isBooking,
  primaryColor = '#f61590',
}: CalendarBookingProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  
  const [availableDays, setAvailableDays] = useState<Map<string, DayAvailability>>(new Map());
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);
  const [isLoadingTimes, setIsLoadingTimes] = useState(false);

  // Fetch available dates for the current month
  useEffect(() => {
    fetchAvailableDates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth, type]);

  // Fetch available time slots when date is selected
  useEffect(() => {
    if (selectedDate) {
      fetchAvailableTimeSlots(selectedDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, type]);

  const fetchAvailableDates = async () => {
    setIsLoadingCalendar(true);
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      
      // Get first and last day of month
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      
      // Fetch availability for the entire month
      const startTime = firstDay.getTime();
      const endTime = lastDay.getTime() + 24 * 60 * 60 * 1000 - 1; // End of last day

      const response = await fetch(
        `/api/calendar-availability/month?type=${type}&from=${startTime}&to=${endTime}`
      );

      if (response.ok) {
        const data = await response.json();
        const daysMap = new Map<string, DayAvailability>();
        
        // Process the slots by date
        if (data.slots) {
          Object.keys(data.slots).forEach((dateKey: string) => {
            const slots = data.slots[dateKey];
            if (Array.isArray(slots) && slots.length > 0) {
              daysMap.set(dateKey, {
                date: dateKey,
                slots: slots.map((slot: any) => ({
                  start: typeof slot.start === 'number' ? slot.start : new Date(slot.start).getTime(),
                  end: typeof slot.end === 'number' ? slot.end : new Date(slot.end).getTime(),
                })),
                hasAvailability: true,
              });
            }
          });
        }
        
        setAvailableDays(daysMap);
      } else {
        console.error('Failed to fetch available dates');
      }
    } catch (error) {
      console.error('Error fetching available dates:', error);
    } finally {
      setIsLoadingCalendar(false);
    }
  };

  const fetchAvailableTimeSlots = async (date: string) => {
    setIsLoadingTimes(true);
    try {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const response = await fetch(
        `/api/calendar-availability/month?type=${type}&from=${dayStart.getTime()}&to=${dayEnd.getTime()}`
      );

      if (response.ok) {
        const data = await response.json();
        const slots = data.slots?.[date] || [];
        
        // Convert slots to time strings (HH:MM format)
        const timeSlots = slots
          .map((slot: any) => {
            const start = typeof slot.start === 'number' ? slot.start : new Date(slot.start).getTime();
            const dateObj = new Date(start);
            const hours = dateObj.getHours().toString().padStart(2, '0');
            const minutes = dateObj.getMinutes().toString().padStart(2, '0');
            return `${hours}:${minutes}`;
          })
          .sort();

        setAvailableTimeSlots(timeSlots);
      } else {
        console.error('Failed to fetch available time slots');
        setAvailableTimeSlots([]);
      }
    } catch (error) {
      console.error('Error fetching available time slots:', error);
      setAvailableTimeSlots([]);
    } finally {
      setIsLoadingTimes(false);
    }
  };

  const handleDateSelect = (date: string) => {
    const dayData = availableDays.get(date);
    if (dayData && dayData.hasAvailability) {
      setSelectedDate(date);
      setSelectedTime(null);
      setShowNotes(false);
    }
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setShowNotes(true);
  };

  const handleConfirm = () => {
    if (selectedDate && selectedTime) {
      onConfirm(selectedDate, selectedTime, notes);
    }
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    setSelectedDate(null);
    setSelectedTime(null);
    setShowNotes(false);
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    setSelectedDate(null);
    setSelectedTime(null);
    setShowNotes(false);
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: Array<{ date: string; day: number; isAvailable: boolean; isToday: boolean; isPast: boolean }> = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({ date: '', day: 0, isAvailable: false, isToday: false, isPast: false });
    }

    // Add days of the month
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayData = availableDays.get(dateString);
      const isToday = dateString === today.toISOString().split('T')[0];
      const isPast = date < today;

      days.push({
        date: dateString,
        day,
        isAvailable: !isPast && (dayData?.hasAvailability || false),
        isToday,
        isPast,
      });
    }

    return days;
  };

  const calendarDays = generateCalendarDays();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-6">
      {/* Calendar View */}
      {!selectedDate && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-semibold text-gray-900">Select a Date</h4>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousMonth}
                disabled={isLoadingCalendar}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-base font-semibold min-w-[140px] text-center">
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextMonth}
                disabled={isLoadingCalendar}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {isLoadingCalendar && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: primaryColor }} />
              <span className="ml-2 text-gray-600">Loading available dates...</span>
            </div>
          )}

          <div className="grid grid-cols-7 gap-2">
            {/* Day headers */}
            {dayNames.map((day) => (
              <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
                {day}
              </div>
            ))}

            {/* Calendar days */}
            {calendarDays.map((day, index) => {
              if (!day.date) {
                return <div key={`empty-${index}`} className="aspect-square" />;
              }

              const isSelected = selectedDate === day.date;
              const isAvailable = day.isAvailable && !day.isPast;

              return (
                <button
                  key={day.date}
                  onClick={() => day.isAvailable && !day.isPast && handleDateSelect(day.date)}
                  disabled={!isAvailable || day.isPast}
                  className={`
                    aspect-square rounded-lg border-2 transition-all
                    ${isSelected 
                      ? 'border-blue-500 bg-blue-50' 
                      : isAvailable
                        ? 'border-green-300 bg-green-50 hover:bg-green-100 hover:border-green-400 cursor-pointer'
                        : day.isPast
                          ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'border-gray-300 bg-gray-50 text-gray-500 cursor-not-allowed'
                    }
                    ${day.isToday ? 'ring-2 ring-offset-2' : ''}
                  `}
                  style={day.isToday ? { 
                    '--tw-ring-color': primaryColor,
                    boxShadow: `0 0 0 2px ${primaryColor}40`
                  } as React.CSSProperties & { '--tw-ring-color'?: string } : {}}
                >
                  <div className="flex flex-col items-center justify-center h-full">
                    <span className={`text-sm font-semibold ${isAvailable ? 'text-gray-900' : 'text-gray-400'}`}>
                      {day.day}
                    </span>
                    {day.isToday && (
                      <span className="text-xs" style={{ color: primaryColor }}>Today</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-2 border-green-300 bg-green-50" />
              <span>Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-2 border-gray-300 bg-gray-50" />
              <span>Unavailable</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-2 border-gray-200 bg-gray-100" />
              <span>Past</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Time Selection */}
      {selectedDate && !showNotes && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-lg font-semibold text-gray-900">Select a Time</h4>
              <p className="text-sm text-gray-600">
                {new Date(selectedDate).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedDate(null);
                setSelectedTime(null);
              }}
            >
              Change Date
            </Button>
          </div>

          {isLoadingTimes ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: primaryColor }} />
              <span className="ml-2 text-gray-600">Loading available times...</span>
            </div>
          ) : availableTimeSlots.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No available time slots for this date</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setSelectedDate(null)}
              >
                Select Different Date
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {availableTimeSlots.map((time) => {
                const isSelected = selectedTime === time;
                const [hours, minutes] = time.split(':');
                const date = new Date();
                date.setHours(parseInt(hours), parseInt(minutes));
                const timeString = date.toLocaleTimeString('en-US', { 
                  hour: 'numeric', 
                  minute: '2-digit',
                  hour12: true 
                });

                return (
                  <button
                    key={time}
                    onClick={() => handleTimeSelect(time)}
                    className={`
                      px-4 py-3 rounded-lg border-2 transition-all text-center
                      ${isSelected
                        ? 'border-blue-500 bg-blue-50 text-blue-900'
                        : 'border-gray-300 bg-white hover:border-green-400 hover:bg-green-50 text-gray-900'
                      }
                    `}
                  >
                    <Clock className="h-4 w-4 mx-auto mb-1" />
                    <span className="text-sm font-semibold">{timeString}</span>
                  </button>
                );
              })}
            </div>
          )}
        </motion.div>
      )}

      {/* Notes and Confirmation */}
      {showNotes && selectedDate && selectedTime && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-lg font-semibold text-gray-900">Add Notes (Optional)</h4>
              <p className="text-sm text-gray-600">
                {new Date(selectedDate).toLocaleDateString('en-US', { 
                  month: 'long', 
                  day: 'numeric', 
                  year: 'numeric' 
                })} at{' '}
                {(() => {
                  const [hours, minutes] = selectedTime.split(':');
                  const date = new Date();
                  date.setHours(parseInt(hours), parseInt(minutes));
                  return date.toLocaleTimeString('en-US', { 
                    hour: 'numeric', 
                    minute: '2-digit',
                    hour12: true 
                  });
                })()}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowNotes(false);
                setSelectedTime(null);
              }}
            >
              Change Time
            </Button>
          </div>

          <div>
            <Label htmlFor="booking-notes" className="text-sm font-semibold text-gray-700 mb-2 block">
              Special Requests or Instructions
            </Label>
            <Input
              id="booking-notes"
              type="text"
              placeholder="Any special requests or instructions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-12 text-base"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleConfirm}
              disabled={isBooking}
              className="flex-1 h-12 font-bold text-base"
              style={{ backgroundColor: primaryColor }}
            >
              {isBooking ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Booking...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-5 w-5" />
                  Confirm {type === 'call' ? 'Call' : 'Appointment'}
                </>
              )}
            </Button>
            <Button
              onClick={onCancel}
              variant="outline"
              className="h-12 font-bold text-base"
              disabled={isBooking}
            >
              Cancel
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
