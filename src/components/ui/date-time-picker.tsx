'use client';

import { CalendarIcon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DateTimePickerProps {
  value?: string; // ISO string or datetime-local format
  onChange?: (value: string) => void;
  name?: string;
  placeholder?: string;
  id?: string;
}

function formatForDisplay(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${h}:${min}`;
}

function formatForInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${h}:${min}`;
}

function parseValue(value?: string): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export function DateTimePicker({
  value,
  onChange,
  name,
  placeholder = '날짜를 선택하세요',
  id,
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const parsed = parseValue(value);

  const [hours, setHours] = useState(
    parsed ? String(parsed.getHours()).padStart(2, '0') : '00'
  );
  const [minutes, setMinutes] = useState(
    parsed ? String(parsed.getMinutes()).padStart(2, '0') : '00'
  );

  function handleDateSelect(day: Date | undefined) {
    if (!day) return;
    const h = Number.parseInt(hours) || 0;
    const m = Number.parseInt(minutes) || 0;
    day.setHours(h, m, 0, 0);
    onChange?.(formatForInput(day));
  }

  function handleTimeChange(newH: string, newM: string) {
    setHours(newH);
    setMinutes(newM);
    if (parsed) {
      const updated = new Date(parsed);
      updated.setHours(Number.parseInt(newH) || 0, Number.parseInt(newM) || 0);
      onChange?.(formatForInput(updated));
    }
  }

  return (
    <>
      {name && (
        <input type="hidden" name={name} value={value ?? ''} />
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            className={cn(
              'w-full justify-start text-left font-normal',
              !parsed && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {parsed ? formatForDisplay(parsed) : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={parsed}
            onSelect={handleDateSelect}
            defaultMonth={parsed}
          />
          <div className="flex items-center gap-2 border-t px-3 py-2">
            <span className="text-sm text-muted-foreground">시간</span>
            <Input
              type="number"
              min={0}
              max={23}
              value={hours}
              onChange={(e) => handleTimeChange(e.target.value, minutes)}
              className="h-8 w-14 text-center"
            />
            <span>:</span>
            <Input
              type="number"
              min={0}
              max={59}
              value={minutes}
              onChange={(e) => handleTimeChange(hours, e.target.value)}
              className="h-8 w-14 text-center"
            />
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}
