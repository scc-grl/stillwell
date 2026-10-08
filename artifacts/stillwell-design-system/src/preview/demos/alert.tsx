import * as M from '../../components/ui/alert';
import { Frame } from '../parts';
import * as Icon from 'lucide-react';

export function AlertDemo() {
  return <Frame><M.Alert><Icon.Info/><M.AlertTitle>A clear supporting message</M.AlertTitle><M.AlertDescription>Calm, readable context without pressure.</M.AlertDescription></M.Alert><M.Alert variant="destructive"><Icon.CircleAlert/><M.AlertTitle>Something needs review</M.AlertTitle><M.AlertDescription>A distinct danger state, not a clinical warning.</M.AlertDescription></M.Alert></Frame>;
}
