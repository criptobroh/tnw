import { redirect } from 'next/navigation';
import Workspace from '@/components/workspace';
import { getBootstrap } from '@/lib/data';
import { getUser } from '@/lib/auth';
export const dynamic='force-dynamic';
export const metadata={title:'Centro de control',robots:{index:false,follow:false}};
export default async function AppPage(){const user=await getUser();if(!user)redirect('/login');const initial=await getBootstrap();return <Workspace initial={initial}/>;}
