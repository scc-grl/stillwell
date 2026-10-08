import * as M from '../../components/ui/chart';
import { Frame } from '../parts';
import * as React from 'react';
import { Button } from '../../components/ui/button';
import { Checkbox } from '../../components/ui/checkbox';
import { LineChart } from 'recharts';

export function ChartDemo() {
  const [indicator,setIndicator]=React.useState<'dot'|'line'|'dashed'>('dot'); const [hide,setHide]=React.useState(false); const config={primary:{label:'Primary series',color:'var(--color-chart-1)'},secondary:{label:'Secondary series',color:'var(--color-chart-2)'}};return <Frame><p className="text-sm text-muted-foreground">Source chart adapters and formatter states. These are interface samples, not a plotted dataset or recovery measurements.</p><div className="flex flex-wrap gap-3">{(['dot','line','dashed'] as const).map(kind=><Button key={kind} variant={kind===indicator?'default':'outline'} onClick={()=>setIndicator(kind)}>{kind}</Button>)}<label className="flex items-center gap-2 text-sm"><Checkbox checked={hide} onCheckedChange={v=>setHide(v===true)}/>Hide label</label></div><M.ChartContainer config={config} className="min-h-40"><div className="flex h-full items-center justify-center gap-5 p-4"><M.ChartTooltipContent active indicator={indicator} hideLabel={hide} label="Preview" payload={[{name:'primary',dataKey:'primary',value:'Sample',color:'var(--color-chart-1)'},{name:'secondary',dataKey:'secondary',value:'Example',color:'var(--color-chart-2)'}]}/><M.ChartLegendContent payload={[{value:'primary',dataKey:'primary',color:'var(--color-chart-1)',type:'square'},{value:'secondary',dataKey:'secondary',color:'var(--color-chart-2)',type:'square'}]}/></div></M.ChartContainer><div className="sr-only"><M.ChartContainer config={config} className="h-8 w-32"><LineChart data={[]}><M.ChartTooltip content={<M.ChartTooltipContent/>}/><M.ChartLegend content={<M.ChartLegendContent/>}/></LineChart></M.ChartContainer></div></Frame>;
}
