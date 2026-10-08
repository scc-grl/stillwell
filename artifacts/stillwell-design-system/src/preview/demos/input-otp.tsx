import * as M from '../../components/ui/input-otp';
import { Frame } from '../parts';
import * as React from 'react';

export function InputOtpDemo() {
  const [value,setValue]=React.useState('');return <Frame><M.InputOTP maxLength={6} value={value} onChange={setValue} aria-label="Example six-digit code"><M.InputOTPGroup>{[0,1,2].map(index=><M.InputOTPSlot key={index} index={index}/>)}</M.InputOTPGroup><M.InputOTPSeparator/><M.InputOTPGroup>{[3,4,5].map(index=><M.InputOTPSlot key={index} index={index}/>)}</M.InputOTPGroup></M.InputOTP><p className="text-xs text-muted-foreground">{value.length} of 6 characters. Preview only, not a real verification flow.</p><M.InputOTP maxLength={3} disabled aria-label="Unavailable code"><M.InputOTPGroup>{[0,1,2].map(index=><M.InputOTPSlot key={index} index={index}/>)}</M.InputOTPGroup></M.InputOTP></Frame>;
}
