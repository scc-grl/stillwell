import * as M from '../../components/ui/carousel';
import { Frame } from '../parts';

export function CarouselDemo() {
  return <Frame><div className="mx-auto max-w-sm px-10"><M.Carousel opts={{loop:false}}><M.CarouselContent>{['Room to pause','A small reflection','Your own pace'].map(text=><M.CarouselItem key={text}><div className="flex aspect-square items-center justify-center rounded-xl border bg-secondary p-6 text-center font-serif text-3xl">{text}</div></M.CarouselItem>)}</M.CarouselContent><M.CarouselPrevious/><M.CarouselNext/></M.Carousel></div><p className="text-xs text-muted-foreground">Arrow controls and keyboard navigation use the original carousel runtime.</p></Frame>;
}
