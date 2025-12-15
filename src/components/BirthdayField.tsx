import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Cake } from 'lucide-react';

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

interface BirthdayFieldProps {
  month: number | null | undefined;
  day: number | null | undefined;
  year: number | null | undefined;
  onChange: (birthday: { month: number | null; day: number | null; year: number | null }) => void;
}

export const BirthdayField = ({ month, day, year, onChange }: BirthdayFieldProps) => {
  const [localMonth, setLocalMonth] = useState<string>(month?.toString() || '');
  const [localDay, setLocalDay] = useState<string>(day?.toString() || '');
  const [localYear, setLocalYear] = useState<string>(year?.toString() || '');

  useEffect(() => {
    setLocalMonth(month?.toString() || '');
    setLocalDay(day?.toString() || '');
    setLocalYear(year?.toString() || '');
  }, [month, day, year]);

  const getDaysInMonth = (m: number): number => {
    if ([1, 3, 5, 7, 8, 10, 12].includes(m)) return 31;
    if ([4, 6, 9, 11].includes(m)) return 30;
    return 29; // February, allowing 29 for leap years
  };

  const handleMonthChange = (value: string) => {
    setLocalMonth(value);
    const monthNum = value ? parseInt(value) : null;
    
    // Validate day against new month
    let dayNum = localDay ? parseInt(localDay) : null;
    if (monthNum && dayNum) {
      const maxDays = getDaysInMonth(monthNum);
      if (dayNum > maxDays) {
        dayNum = maxDays;
        setLocalDay(maxDays.toString());
      }
    }
    
    onChange({
      month: monthNum,
      day: dayNum,
      year: localYear ? parseInt(localYear) : null,
    });
  };

  const handleDayChange = (value: string) => {
    const dayNum = parseInt(value);
    if (isNaN(dayNum)) {
      setLocalDay('');
      onChange({
        month: localMonth ? parseInt(localMonth) : null,
        day: null,
        year: localYear ? parseInt(localYear) : null,
      });
      return;
    }
    
    const maxDays = localMonth ? getDaysInMonth(parseInt(localMonth)) : 31;
    const clampedDay = Math.min(Math.max(1, dayNum), maxDays);
    setLocalDay(clampedDay.toString());
    
    onChange({
      month: localMonth ? parseInt(localMonth) : null,
      day: clampedDay,
      year: localYear ? parseInt(localYear) : null,
    });
  };

  const handleYearChange = (value: string) => {
    setLocalYear(value);
    const yearNum = value ? parseInt(value) : null;
    
    onChange({
      month: localMonth ? parseInt(localMonth) : null,
      day: localDay ? parseInt(localDay) : null,
      year: yearNum,
    });
  };

  const hasBirthday = localMonth && localDay;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Cake className="w-4 h-4" />
        <Label>Birthday</Label>
        {hasBirthday && (
          <span className="text-xs text-primary font-normal">
            ({MONTHS.find(m => m.value === parseInt(localMonth))?.label} {localDay}{localYear ? `, ${localYear}` : ''})
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <Select value={localMonth} onValueChange={handleMonthChange}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map(m => (
              <SelectItem key={m.value} value={m.value.toString()}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Input
          type="number"
          min={1}
          max={31}
          value={localDay}
          onChange={(e) => handleDayChange(e.target.value)}
          placeholder="Day"
          className="w-20"
        />
        
        <Input
          type="number"
          min={1900}
          max={new Date().getFullYear()}
          value={localYear}
          onChange={(e) => handleYearChange(e.target.value)}
          placeholder="Year (opt)"
          className="w-24"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Birthday reminders are available for Pro and Business users
      </p>
    </div>
  );
};
