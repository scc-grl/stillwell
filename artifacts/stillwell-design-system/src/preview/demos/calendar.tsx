import * as M from '../../components/ui/calendar';
import { Frame } from '../parts';
import * as React from 'react';
import type { DateRange } from 'react-day-picker';

export function CalendarDemo() {
  const [day,setDay]=React.useState<Date|undefined>(new Date(2026,9,8)); const [range,setRange]=React.useState<DateRange|undefined>({from:new Date(2026,9,5),to:new Date(2026,9,8)});return <Frame><div className="flex flex-wrap gap-8"><div><p className="mb-3 text-xs text-muted-foreground">Single selection</p><M.Calendar mode="single" selected={day} onSelect={setDay} defaultMonth={new Date(2026,9,1)}/></div><div><p className="mb-3 text-xs text-muted-foreground">Range selection</p><M.Calendar mode="range" selected={range} onSelect={setRange} defaultMonth={new Date(2026,9,1)}/></div></div><p role="status" className="text-xs text-muted-foreground">Selected: {day?.toLocaleDateString() || 'none'}. Dates are illustrative.</p></Frame>;
}
