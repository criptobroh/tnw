import { createHash,randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { put } from '@vercel/blob';
import { requireRole,assertOrigin } from '@/lib/auth';
import { db } from '@/lib/db';
import { auditEvent } from '@/lib/data';
import { rateLimit } from '@/lib/rate-limit';
import { json,errorResponse,ApiError } from '@/lib/http';
export const maxDuration=30;
export async function POST(req:Request){try{
  assertOrigin(req);const user=await requireRole('admin','operations');
  if(!process.env.BLOB_READ_WRITE_TOKEN)throw new ApiError(503,'El almacenamiento privado todavía no está configurado.');
  await rateLimit(`upload:${user.id}`,100);
  const length=Number(req.headers.get('content-length'));
  if(!length||length>4_300_000)throw new ApiError(413,'Subí una imagen de hasta 4 MB.');
  const form=await req.formData();const file=form.get('file');
  if(!(file instanceof File)||file.size>4_000_000||file.size===0)throw new ApiError(400,'Elegí una imagen JPG, PNG o WebP de hasta 4 MB.');
  const original=Buffer.from(await file.arrayBuffer());
  let image:Buffer;
  try{const decoder=sharp(original,{limitInputPixels:32_000_000,failOn:'error'});const meta=await decoder.metadata();if(!['jpeg','png','webp'].includes(meta.format??''))throw new Error();image=await decoder.rotate().resize({width:2560,height:2560,fit:'inside',withoutEnlargement:true}).webp({quality:90}).toBuffer();}catch{throw new ApiError(400,'El archivo no es una imagen válida o supera 32 megapíxeles.');}
  // Strip EXIF/location metadata and active content; hash the exact stored derivative.
  const sha256=createHash('sha256').update(image).digest('hex');const path=`tnw/${randomUUID()}.webp`;
  await put(path,image,{access:'private',contentType:'image/webp',addRandomSuffix:false});
  await db().begin(async sql=>{await sql`INSERT INTO uploads(path,sha256,uploaded_by) VALUES(${path},${sha256},${user.id})`;await auditEvent(sql,user,'upload','evidence',null);});
  return json({url:`/api/files?path=${encodeURIComponent(path)}`,sha256},201);
}catch(e){return errorResponse(e);}}
