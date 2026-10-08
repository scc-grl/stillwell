import * as M from '../../components/ui/tabs';
import { Frame } from '../parts';

export function TabsDemo() {
  return <Frame><M.Tabs defaultValue="first"><M.TabsList><M.TabsTrigger value="first">First</M.TabsTrigger><M.TabsTrigger value="second">Second</M.TabsTrigger><M.TabsTrigger value="disabled" disabled>Unavailable</M.TabsTrigger></M.TabsList><M.TabsContent value="first" className="pt-4 text-sm">First supporting panel.</M.TabsContent><M.TabsContent value="second" className="pt-4 text-sm">Second supporting panel.</M.TabsContent></M.Tabs></Frame>;
}
