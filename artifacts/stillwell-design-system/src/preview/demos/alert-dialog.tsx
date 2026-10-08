import * as M from '../../components/ui/alert-dialog';
import { Frame } from '../parts';
import { Button } from '../../components/ui/button';

export function AlertDialogDemo() {
  return <Frame><M.AlertDialog><M.AlertDialogTrigger asChild><Button variant="destructive">Review example action</Button></M.AlertDialogTrigger><M.AlertDialogContent><M.AlertDialogHeader><M.AlertDialogTitle>Continue with this example?</M.AlertDialogTitle><M.AlertDialogDescription>This is a component preview. Nothing will be deleted.</M.AlertDialogDescription></M.AlertDialogHeader><M.AlertDialogFooter><M.AlertDialogCancel>Go back</M.AlertDialogCancel><M.AlertDialogAction>Continue</M.AlertDialogAction></M.AlertDialogFooter></M.AlertDialogContent></M.AlertDialog></Frame>;
}
