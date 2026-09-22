import { getBootstrap } from '@/lib/data';
import { json,errorResponse } from '@/lib/http';
export async function GET(){try{return json(await getBootstrap());}catch(e){return errorResponse(e);}}
