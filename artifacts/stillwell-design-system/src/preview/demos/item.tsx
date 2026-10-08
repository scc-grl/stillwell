import * as M from '../../components/ui/item';
import { Frame } from '../parts';
import * as Icon from 'lucide-react';
import { Button } from '../../components/ui/button';

export function ItemDemo() {
  return <Frame><M.ItemGroup><M.Item variant="outline"><M.ItemMedia variant="icon"><Icon.Leaf/></M.ItemMedia><M.ItemContent><M.ItemTitle>A small reflection</M.ItemTitle><M.ItemDescription>Related content and a supporting action.</M.ItemDescription></M.ItemContent><M.ItemActions><Button size="sm" variant="outline">View</Button></M.ItemActions></M.Item><M.ItemSeparator/><M.Item variant="muted" size="sm"><M.ItemContent><M.ItemHeader><M.ItemTitle>Compact item</M.ItemTitle></M.ItemHeader><M.ItemDescription>A second surface and size.</M.ItemDescription><M.ItemFooter>Supporting text</M.ItemFooter></M.ItemContent></M.Item><M.Item><M.ItemContent><M.ItemTitle>Default item</M.ItemTitle><M.ItemDescription>Unadorned source variant.</M.ItemDescription></M.ItemContent></M.Item></M.ItemGroup></Frame>;
}
