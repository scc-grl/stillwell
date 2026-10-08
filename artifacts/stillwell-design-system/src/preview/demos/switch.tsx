import * as M from '../../components/ui/switch';
import { Frame } from '../parts';
import * as React from 'react';

export function SwitchDemo() {
  const [checked,setChecked]=React.useState(false);return <Frame><label className="flex items-center gap-3 text-sm"><M.Switch checked={checked} onCheckedChange={setChecked}/>Controlled choice</label><p role="status" className="text-xs text-muted-foreground">Controlled state: {String(checked)}</p><label className="flex items-center gap-3 text-sm"><M.Switch defaultChecked/>On by default</label><label className="flex items-center gap-3 text-sm text-muted-foreground"><M.Switch disabled/>Unavailable</label><label className="flex items-center gap-3 text-sm text-muted-foreground"><M.Switch checked disabled/>On, unavailable</label></Frame>;
}
