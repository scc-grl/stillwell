import * as M from '../../components/ui/slider';
import { Frame } from '../parts';
import * as React from 'react';

export function SliderDemo() {
  const [value,setValue]=React.useState([40]);return <Frame><M.Slider value={value} onValueChange={setValue} min={0} max={100} step={1} aria-label="Illustrative level"/><p role="status" className="text-xs text-muted-foreground">Example value: {value[0]}. This is not a recovery target.</p><M.Slider defaultValue={[65]} disabled aria-label="Unavailable slider"/></Frame>;
}
