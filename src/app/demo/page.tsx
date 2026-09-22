import Workspace from '@/components/workspace';
import { demoBootstrap } from '@/lib/demo';
export const dynamic='force-dynamic';
export const metadata={title:'Demo interactiva',robots:{index:false,follow:false}};
export default function DemoPage(){return <Workspace initial={demoBootstrap()} demo/>;}
