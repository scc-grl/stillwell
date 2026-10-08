import * as M from '../../components/ui/label';
import { Frame } from '../parts';
import { Input } from '../../components/ui/input';

export function LabelDemo() {
  return <Frame><div className="space-y-2"><M.Label htmlFor="label-example">A clear label</M.Label><Input id="label-example" placeholder="In your own words…"/></div><div className="space-y-2"><M.Label htmlFor="label-disabled">Unavailable field</M.Label><Input id="label-disabled" disabled/></div></Frame>;
}
