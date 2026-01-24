'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, ChevronLeft, ChevronRight, Loader2, Check, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CalendarBookingProps {
  type: 'appointment' | 'call';
  onConfirm: (date: string, time: string, notes: string, timestamp?: number) => void;
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

interface TimeSlotOption {
  displayTime: string; // HH:MM format for display
  timestamp: number; // Actual timestamp in milliseconds
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
  const [selectedTimestamp, setSelectedTimestamp] = useState<number | null>(null); // Store actual timestamp
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  
  const [availableDays, setAvailableDays] = useState<Map<string, DayAvailability>>(new Map());
  const [availableTimeSlots, setAvailableTimeSlots] = useState<TimeSlotOption[]>([]);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);
  const [isLoadingTimes, setIsLoadingTimes] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);

  // Fetch available dates for the current month
  useEffect(() => {
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
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      
      // Get first and last day of month
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      
      // Fetch availability for the entire month
      const startTime = firstDay.getTime();
      const endTime = lastDay.getTime() + 24 * 60 * 60 * 1000 - 1; // End of last day

      const apiUrl = `/api/calendar-availability/month?type=${type}&from=${startTime}&to=${endTime}`;
      console.log('========================================');
      console.log('[CalendarBooking] FETCHING AVAILABILITY');
      console.log('[CalendarBooking] URL:', apiUrl);
      console.log('[CalendarBooking] Type:', type);
      console.log('[CalendarBooking] Start:', new Date(startTime).toISOString(), `(${startTime})`);
      console.log('[CalendarBooking] End:', new Date(endTime).toISOString(), `(${endTime})`);
      console.log('========================================');

      const response = await fetch(apiUrl);
      console.log('[CalendarBooking] Response status:', response.status, response.statusText);
      console.log('[CalendarBooking] Response ok?', response.ok);

      console.log('[CalendarBooking] Response headers:', Object.fromEntries(response.headers.entries()));
      const data = await response.json();
      console.log('[CalendarBooking] Response data:', data);
      console.log('[CalendarBooking] Response data keys:', Object.keys(data));
      console.log('[CalendarBooking] Response has error?', !!data.error);
      console.log('[CalendarBooking] Response has slots?', !!data.slots);
      console.log('[CalendarBooking] Slots type:', typeof data.slots);
      console.log('[CalendarBooking] Slots keys:', data.slots ? Object.keys(data.slots) : 'N/A');
      
      // Check for errors in response (even if status is 200)
      if (data.error) {
        console.error('[CalendarBooking] API returned error:', data.error, data.message);
        setAvailableDays(new Map()); // Clear availability on error
        setCalendarError(data.message || data.error || 'Unable to load calendar availability');
        return;
      }
      
      // Clear any previous errors
      setCalendarError(null);

      if (response.ok) {
        const daysMap = new Map<string, DayAvailability>();
        
        console.log('[CalendarBooking] Processing response - data.slots exists?', !!data.slots);
        console.log('[CalendarBooking] data.slots type:', typeof data.slots);
        console.log('[CalendarBooking] data.slots value:', data.slots);
        
        // Process the slots by date
        if (data.slots && typeof data.slots === 'object') {
          const slotKeys = Object.keys(data.slots);
          console.log('[CalendarBooking] Found', slotKeys.length, 'date keys in slots');
          
          slotKeys.forEach((dateKey: string) => {
            const slots = data.slots[dateKey];
            console.log(`[CalendarBooking] Date ${dateKey}:`, Array.isArray(slots) ? `${slots.length} slots` : `type: ${typeof slots}`, slots);
            
            if (Array.isArray(slots) && slots.length > 0) {
              const now = new Date().getTime();
              const minimumBookingTime = now + (30 * 60 * 1000); // At least 30 minutes in the future
              
              const mappedSlots = slots
                .map((slot: any) => {
                  const start = typeof slot.start === 'number' ? slot.start : new Date(slot.start).getTime();
                  const end = typeof slot.end === 'number' ? slot.end : new Date(slot.end).getTime();
                  return { start, end };
                })
                .filter((slot: AvailableSlot) => {
                  // Only include slots that are in the future (at least 30 minutes away)
                  return slot.start > minimumBookingTime;
                });
              
              if (mappedSlots.length > 0) {
                daysMap.set(dateKey, {
                  date: dateKey,
                  slots: mappedSlots,
                  hasAvailability: true,
                });
                console.log(`[CalendarBooking] Added ${dateKey} with ${mappedSlots.length} available slots (filtered from ${slots.length} total)`);
              } else {
                console.log(`[CalendarBooking] Date ${dateKey} has no available slots after filtering (all past or too soon)`);
              }
            } else {
              console.warn(`[CalendarBooking] Date ${dateKey} has no valid slots array`);
            }
          });
        } else {
          console.warn('[CalendarBooking] data.slots is not an object or is missing:', data.slots);
          console.warn('[CalendarBooking] Full response data:', JSON.stringify(data, null, 2));
        }
        
        console.log('[CalendarBooking] Final daysMap size:', daysMap.size);
        console.log('[CalendarBooking] Days with availability:', Array.from(daysMap.keys()));
        
        if (daysMap.size === 0) {
          console.warn('[CalendarBooking] NO AVAILABLE DATES FOUND');
          console.warn('[CalendarBooking] Response data:', JSON.stringify(data, null, 2));
          if (data.warning || data.message) {
            console.warn('[CalendarBooking] API warning:', data.warning || data.message);
            setCalendarError(data.message || data.warning || 'No available time slots found. Please check calendar configuration in GHL.');
          }
        }
        
        setAvailableDays(daysMap);
      } else {
        console.error('[CalendarBooking] Failed to fetch available dates:', response.status, data);
        setAvailableDays(new Map());
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

      const response = await fetch(
        `/api/calendar-availability/month?type=${type}&from=${dayStart.getTime()}&to=${dayEnd.getTime()}`
      );

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
      <style>{`
        @keyframes glow {
          0%, 100% {
            box-shadow: 0 0 5px rgba(0, 0, 0, 0.1), 0 0 20px rgba(0, 0, 0, 0.1);
            transform: scale(1);
          }
          50% {
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.2), 0 0 30px rgba(0, 0, 0, 0.15);
            transform: scale(1.02);
          }
        }
        
        .glow-button {
          animation: glow 2s ease-in-out infinite;
        }
        
        .glow-button:not(:disabled):hover {
          animation: glow 1.5s ease-in-out infinite;
        }
      `}</style>
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

          {(calendarError || (availableDays.size === 0 && !isLoadingCalendar)) && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-900 mb-1">
                    {calendarError ? 'Unable to Load Calendar' : 'No Available Time Slots'}
                  </p>
                  <p className="text-sm text-amber-800">
                    {calendarError || 'No available time slots found for this calendar. This usually means:'}
                  </p>
                  {!calendarError && (
                    <ul className="text-xs text-amber-700 mt-2 list-disc list-inside space-y-1">
                      <li>Users are assigned to the calendar but don't have office hours/availability configured</li>
                      <li>No availability is set for the requested date range</li>
                      <li>Calendar settings need to be configured in GHL</li>
                    </ul>
                  )}
                  {(calendarError?.includes('No users assigned') || calendarError?.includes('users assigned')) && (
                    <p className="text-xs text-amber-700 mt-2">
                      Please assign users to the calendar AND configure their availability/office hours in GHL Calendar settings.
                    </p>
                  )}
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
              className="flex-1 h-12 font-bold text-base glow-button shadow-lg hover:shadow-xl transition-shadow"
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
