import * as M from '../../components/ui/input-group';
import { Frame } from '../parts';
import * as Icon from 'lucide-react';

export function InputGroupDemo() {
  return <Frame><M.InputGroup><M.InputGroupAddon><Icon.Search/></M.InputGroupAddon><M.InputGroupInput aria-label="Search example" placeholder="Search these examples…"/><M.InputGroupAddon align="inline-end"><M.InputGroupButton size="icon-xs" aria-label="Run preview search"><Icon.ArrowRight/></M.InputGroupButton></M.InputGroupAddon></M.InputGroup><M.InputGroup><M.InputGroupAddon align="block-start"><M.InputGroupText>Optional reflection</M.InputGroupText></M.InputGroupAddon><M.InputGroupTextarea aria-label="Example reflection" placeholder="In your own words…"/><M.InputGroupAddon align="block-end"><M.InputGroupButton>Example action</M.InputGroupButton></M.InputGroupAddon></M.InputGroup><M.InputGroup><M.InputGroupInput aria-label="Unavailable example" disabled placeholder="Unavailable"/></M.InputGroup></Frame>;
}
