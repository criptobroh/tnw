import { get } from '@vercel/blob';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { errorResponse,ApiError } from '@/lib/http';
export async function GET(req:Request){try{
  await requireUser();const path=new URL(req.url).searchParams.get('path')??'';
  if(!/^tnw\/[a-f0-9-]{36}\.webp$/.test(path))throw new ApiError(400,'Archivo inválido.');
  const [upload]=await db()`SELECT path FROM uploads WHERE path=${path}`;if(!upload)throw new ApiError(404,'Archivo no encontrado.');
  const result=await get(path,{access:'private'});if(!result||result.statusCode!==200)throw new ApiError(404,'Archivo no encontrado.');
  return new Response(result.stream,{headers:{'Content-Type':'image/webp','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Disposition':'inline; filename="evidencia.webp"'}});
}catch(e){return errorResponse(e);}}
