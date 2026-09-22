import { ZodError } from 'zod';
import { readJson as boundedJson } from './auth';
export class ApiError extends Error {constructor(public status:number,message:string){super(message);}}
export function json(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});}
export async function readJson(request:Request,max=256000):Promise<Record<string,unknown>> {
  return boundedJson(request,max);
}
export function errorResponse(error:unknown) {
  if(error instanceof ZodError)return json({error:error.issues.map(x=>`${x.path.join('.')}: ${x.message}`).join('; ')},400);
  if(error instanceof Error&&'status' in error&&typeof error.status==='number')return json({error:error.message},error.status);
  console.error('TNW request failed',error instanceof Error?error.name:'UnknownError');
  return json({error:'No se pudo completar la operación. Probá nuevamente.'},503);
}
