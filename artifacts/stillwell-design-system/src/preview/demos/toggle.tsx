import * as M from '../../components/ui/toggle';
import { Frame } from '../parts';
import * as React from 'react';
import * as Icon from 'lucide-react';

export function ToggleDemo() {
  const [pressed,setPressed]=React.useState(false);return <Frame><div className="flex flex-wrap gap-3"><M.Toggle pressed={pressed} onPressedChange={setPressed} aria-label="Toggle emphasis"><Icon.Bold/></M.Toggle><M.Toggle variant="outline" size="sm" aria-label="Small emphasis"><Icon.Italic/></M.Toggle><M.Toggle size="lg" defaultPressed aria-label="Large selected emphasis"><Icon.Bold/></M.Toggle><M.Toggle disabled aria-label="Unavailable emphasis"><Icon.Italic/></M.Toggle></div><p role="status" className="text-xs text-muted-foreground">Controlled state: {String(pressed)}</p></Frame>;
}
