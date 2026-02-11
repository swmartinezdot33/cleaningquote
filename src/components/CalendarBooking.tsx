'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, ChevronLeft, ChevronRight, Check, X, AlertCircle } from 'lucide-react';
import { LoadingDots } from '@/components/ui/loading-dots';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CalendarBookingProps {
  type: 'appointment' | 'call';
  onConfirm: (date: string, time: string, notes: string, timestamp?: number) => void;
  onCancel: () => void;
  isBooking: boolean;
  primaryColor?: string;
  toolSlug?: string;
  toolId?: string;
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

interface TimeSlotOption {
  displayTime: string; // HH:MM format for display
  timestamp: number; // Actual timestamp in milliseconds
}

export function CalendarBooking({
  type,
  onConfirm,
  onCancel,
  isBooking,
  primaryColor = '#7c3aed',
  toolSlug,
  toolId,
}: CalendarBookingProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedTimestamp, setSelectedTimestamp] = useState<number | null>(null); // Store actual timestamp
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  
  const [availableDays, setAvailableDays] = useState<Map<string, DayAvailability>>(new Map());
  const [availableTimeSlots, setAvailableTimeSlots] = useState<TimeSlotOption[]>([]);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);
  const [isLoadingTimes, setIsLoadingTimes] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [noSlotsMessage, setNoSlotsMessage] = useState<string | null>(null);
  const skipNextFetchRef = useRef(false);

  // Fetch available dates for the current month
  useEffect(() => {
    if (skipNextFetchRef.current) {
      skipNextFetchRef.current = false;
      return;
    }
    console.log('[CalendarBooking] useEffect triggered - type:', type, 'month:', currentMonth.toISOString());
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
    setNoSlotsMessage(null);
    setCalendarError(null);

    const fetchOneMonth = async (monthDate: Date): Promise<{ daysMap: Map<string, DayAvailability>; apiError: string | null }> => {
      const y = monthDate.getFullYear();
      const m = monthDate.getMonth();
      const firstDay = new Date(y, m, 1);
      const lastDay = new Date(y, m + 1, 0);
      const startTime = firstDay.getTime();
      const endTime = lastDay.getTime() + 24 * 60 * 60 * 1000 - 1;
      const params = new URLSearchParams({
        type,
        from: String(startTime),
        to: String(endTime),
        ...(toolSlug && { toolSlug }),
        ...(toolId && { toolId }),
      });
      const response = await fetch(`/api/calendar-availability/month?${params.toString()}`);
      const data = await response.json();
      if (data.error) {
        return { daysMap: new Map(), apiError: data.message || data.error || 'Unable to load calendar availability' };
      }
      if (!response.ok) {
        return { daysMap: new Map(), apiError: 'Failed to fetch availability' };
      }
      const daysMap = new Map<string, DayAvailability>();
      if (data.slots && typeof data.slots === 'object') {
        const now = new Date().getTime();
        const minimumBookingTime = now + (30 * 60 * 1000);
        Object.keys(data.slots).forEach((dateKey: string) => {
          const slots = data.slots[dateKey];
          if (Array.isArray(slots) && slots.length > 0) {
            const mappedSlots = slots
              .map((slot: any) => ({
                start: typeof slot.start === 'number' ? slot.start : new Date(slot.start).getTime(),
                end: typeof slot.end === 'number' ? slot.end : new Date(slot.end).getTime(),
              }))
              .filter((s: AvailableSlot) => s.start > minimumBookingTime);
            if (mappedSlots.length > 0) {
              daysMap.set(dateKey, { date: dateKey, slots: mappedSlots, hasAvailability: true });
            }
          }
        });
      }
      return { daysMap, apiError: null };
    };

    try {
      let result = await fetchOneMonth(currentMonth);
      if (result.apiError) {
        setCalendarError(result.apiError);
        setAvailableDays(new Map());
        return;
      }
      if (result.daysMap.size > 0) {
        setAvailableDays(result.daysMap);
        return;
      }
      // No slots this month: auto-advance to next month with availability (up to 12 months)
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      for (let i = 1; i <= 12; i++) {
        const nextMonthDate = new Date(year, month + i, 1);
        result = await fetchOneMonth(nextMonthDate);
        if (result.apiError) break;
        if (result.daysMap.size > 0) {
          skipNextFetchRef.current = true;
          setCurrentMonth(nextMonthDate);
          setAvailableDays(result.daysMap);
          return;
        }
      }
      setNoSlotsMessage('No available time slots in the next 12 months. Try again later.');
      setAvailableDays(new Map());
    } catch (error) {
      console.error('Error fetching available dates:', error);
      setCalendarError('Unable to load calendar');
      setAvailableDays(new Map());
    } finally {
      setIsLoadingCalendar(false);
    }
  };

  const fetchAvailableTimeSlots = async (date: string) => {
    setIsLoadingTimes(true);
    try {
      // First, try to use slots from availableDays (already fetched)
      const dayData = availableDays.get(date);
      if (dayData && dayData.slots && dayData.slots.length > 0) {
        console.log('[CalendarBooking] Using cached slots for', date, '-', dayData.slots.length, 'slots');
        
        // Filter out past slots
        const now = new Date().getTime();
        const minimumBookingTime = now + (30 * 60 * 1000); // At least 30 minutes in the future
        
        const availableSlots = dayData.slots.filter((slot: AvailableSlot) => {
          // Only show slots that are in the future (at least 30 minutes away)
          return slot.start > minimumBookingTime;
        });
        
        console.log('[CalendarBooking] Filtered', availableSlots.length, 'available slots (removed', dayData.slots.length - availableSlots.length, 'past/too-soon slots)');
        
        // Convert slots to time slot options with both display time and timestamp
        const timeSlots: TimeSlotOption[] = availableSlots
          .map((slot: AvailableSlot) => {
            const dateObj = new Date(slot.start);
            const hours = dateObj.getHours().toString().padStart(2, '0');
            const minutes = dateObj.getMinutes().toString().padStart(2, '0');
            return {
              displayTime: `${hours}:${minutes}`,
              timestamp: slot.start, // Store the actual timestamp
            };
          })
          .sort((a, b) => a.timestamp - b.timestamp);

        console.log('[CalendarBooking] Loaded', timeSlots.length, 'time slots for', date);
        setAvailableTimeSlots(timeSlots);
        setIsLoadingTimes(false);
        return;
      }

      // If not in cache, fetch from API
      console.log('[CalendarBooking] Slots not in cache, fetching from API for', date);
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const params = new URLSearchParams({
        type,
        from: String(dayStart.getTime()),
        to: String(dayEnd.getTime()),
        ...(toolSlug && { toolSlug }),
        ...(toolId && { toolId }),
      });
      const response = await fetch(`/api/calendar-availability/month?${params.toString()}`);

      const data = await response.json();
      
      // Check for errors in response
      if (data.error) {
        console.error('[CalendarBooking] API returned error for time slots:', data.error, data.message);
        setAvailableTimeSlots([]);
        return;
      }

      if (response.ok) {
        // Handle nested slots format: {"2026-01-22": {"slots": [...]}} or {"2026-01-22": [{start, end}, ...]}
        let slots: any[] = [];
        
        if (data.slots?.[date]) {
          const dateSlots = data.slots[date];
          if (Array.isArray(dateSlots)) {
            // Direct array format
            slots = dateSlots;
          } else if (dateSlots && typeof dateSlots === 'object' && dateSlots.slots && Array.isArray(dateSlots.slots)) {
            // Nested format with slots property
            slots = dateSlots.slots.map((slotStr: string) => {
              // Convert ISO string to {start, end} format
              const start = new Date(slotStr).getTime();
              return { start, end: start + (30 * 60 * 1000) }; // 30 minute duration
            });
          }
        }
        
        // Filter out past slots
        const now = new Date().getTime();
        const minimumBookingTime = now + (30 * 60 * 1000); // At least 30 minutes in the future
        
        const availableSlots = slots.filter((slot: any) => {
          const start = typeof slot.start === 'number' ? slot.start : new Date(slot.start).getTime();
          // Only show slots that are in the future (at least 30 minutes away)
          return start > minimumBookingTime;
        });
        
        console.log('[CalendarBooking] Filtered', availableSlots.length, 'available slots from', slots.length, 'total slots');
        
        // Convert slots to time slot options with both display time and timestamp
        const timeSlots: TimeSlotOption[] = availableSlots
          .map((slot: any) => {
            const start = typeof slot.start === 'number' ? slot.start : new Date(slot.start).getTime();
            const dateObj = new Date(start);
            const hours = dateObj.getHours().toString().padStart(2, '0');
            const minutes = dateObj.getMinutes().toString().padStart(2, '0');
            return {
              displayTime: `${hours}:${minutes}`,
              timestamp: start, // Store the actual timestamp
            };
          })
          .sort((a, b) => a.timestamp - b.timestamp);

        console.log('[CalendarBooking] Loaded', timeSlots.length, 'time slots for', date, 'from API');
        setAvailableTimeSlots(timeSlots);
      } else {
        console.error('[CalendarBooking] Failed to fetch available time slots:', response.status, data);
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
      setSelectedTimestamp(null);
      setShowNotes(false);
    }
  };

  const handleTimeSelect = (timeSlot: TimeSlotOption) => {
    setSelectedTime(timeSlot.displayTime);
    setSelectedTimestamp(timeSlot.timestamp);
    setShowNotes(true);
  };

  const handleConfirm = () => {
    // Validate that both date and time are selected and not empty
    if (!selectedDate || !selectedTime || !selectedTimestamp || selectedDate.trim() === '' || selectedTime.trim() === '') {
      console.error('[CalendarBooking] Cannot confirm - missing date or time:', {
        selectedDate,
        selectedTime,
        selectedTimestamp,
        hasDate: !!selectedDate,
        hasTime: !!selectedTime,
        hasTimestamp: !!selectedTimestamp,
      });
      return;
    }
    
    // Convert timestamp to UTC date/time strings for the server
    // This ensures we're using the exact timestamp that was available, avoiding timezone conversion issues
    const selectedDateTime = new Date(selectedTimestamp);
    const dateStr = selectedDateTime.toISOString().split('T')[0]; // YYYY-MM-DD in UTC
    const timeStr = selectedDateTime.toISOString().split('T')[1].split('.')[0]; // HH:MM:SS in UTC
    
    console.log('[CalendarBooking] Confirming appointment:', {
      originalSelectedDate: selectedDate,
      originalSelectedTime: selectedTime,
      timestamp: selectedTimestamp,
      utcDate: dateStr,
      utcTime: timeStr.substring(0, 5), // HH:MM
      isoString: selectedDateTime.toISOString(),
      localTime: selectedDateTime.toLocaleString(),
      notes: notes || '(none)',
    });
    
    // Pass the UTC date/time extracted from the actual timestamp
    // Also pass the raw timestamp to ensure exact match with GHL's availability
    // This ensures the server receives the exact time that was shown as available
    onConfirm(dateStr, timeStr.substring(0, 5), notes || '', selectedTimestamp);
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    setSelectedDate(null);
    setSelectedTime(null);
    setSelectedTimestamp(null);
    setShowNotes(false);
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    setSelectedDate(null);
    setSelectedTime(null);
    setSelectedTimestamp(null);
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
              <LoadingDots size="lg" className="text-current" style={{ color: primaryColor }} />
              <span className="ml-2 text-gray-600">Loading available dates...</span>
            </div>
          )}

          {(calendarError || (availableDays.size === 0 && !isLoadingCalendar)) && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-900 mb-1">
                    {calendarError ? 'Unable to Load Calendar' : 'No Available Time Slots'}
                  </p>
                  <p className="text-sm text-amber-800">
                    {calendarError || (noSlotsMessage ?? 'No available time slots in this month. Try another month.')}
                  </p>
                </div>
              </div>
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
              <LoadingDots size="lg" className="text-current" style={{ color: primaryColor }} />
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
              {availableTimeSlots.map((timeSlot) => {
                const isSelected = selectedTime === timeSlot.displayTime;
                const [hours, minutes] = timeSlot.displayTime.split(':');
                const date = new Date();
                date.setHours(parseInt(hours), parseInt(minutes));
                const timeString = date.toLocaleTimeString('en-US', { 
                  hour: 'numeric', 
                  minute: '2-digit',
                  hour12: true 
                });

                return (
                  <button
                    key={timeSlot.timestamp}
                    onClick={() => handleTimeSelect(timeSlot)}
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
                setSelectedTimestamp(null);
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
              className="flex-1 h-12 font-bold text-base shadow-lg hover:shadow-xl transition-shadow"
              style={{ backgroundColor: primaryColor }}
            >
              {isBooking ? (
                <>
                  <LoadingDots size="sm" className="mr-2 text-current" />
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
