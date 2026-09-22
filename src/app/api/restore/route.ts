import { z } from 'zod';
import { get } from '@vercel/blob';
import { createHash } from 'node:crypto';
import { requireRole,assertOrigin } from '@/lib/auth';
import { db } from '@/lib/db';
import { auditEvent,lockWorkspace,validateReferences } from '@/lib/data';
import { kinds,parseRecord } from '@/lib/domain';
import { json,readJson,errorResponse,ApiError } from '@/lib/http';
export const maxDuration=45;
const baseSchema=z.object({id:z.uuid(),version:z.number().int().positive(),createdAt:z.iso.datetime({offset:true}),updatedAt:z.iso.datetime({offset:true})});
const uploadSchema=z.object({path:z.string().regex(/^tnw\/[a-f0-9-]{36}\.webp$/),sha256:z.string().regex(/^[a-f0-9]{64}$/),created_at:z.iso.datetime({offset:true})});
const eventSchema=z.object({event_id:z.string().min(8).max(160),payload_hash:z.string().regex(/^[a-f0-9]{64}$/),received_at:z.iso.datetime({offset:true})});
export async function POST(req:Request){try{
  assertOrigin(req);const user=await requireRole('admin');const input=await readJson(req,4_000_000);
  if(input.format!=='tnw-backup-v1'||!input.data||typeof input.data!=='object')throw new ApiError(400,'Elegí un respaldo JSON exportado desde TNW.');
  const data=input.data as Record<string,unknown>;
  const rows=kinds.flatMap(kind=>{if(!Array.isArray(data[kind]))throw new ApiError(400,`Falta la sección ${kind}.`);return data[kind].map((raw:unknown)=>({kind,base:baseSchema.parse(raw),payload:parseRecord(kind,raw)}));});
  if(rows.length>1000)throw new ApiError(400,'Este respaldo requiere restauración asistida por superar 1.000 registros.');
  const ids=rows.map(r=>r.base.id);if(new Set(ids).size!==ids.length)throw new ApiError(400,'El respaldo contiene identificadores duplicados.');
  const uploads=z.array(uploadSchema).max(50).parse(input.uploads??[]);const events=z.array(eventSchema).max(10000).parse(input.telemetry??[]);
  // Check only paths in our own private store; never follow URLs from a backup.
  for(const upload of uploads){try{const blob=await get(upload.path,{access:'private'});if(!blob||blob.statusCode!==200||blob.blob.contentType!=='image/webp'||blob.blob.size>4_000_000)throw new Error();const hash=createHash('sha256');const reader=blob.stream.getReader();while(true){const {done,value}=await reader.read();if(done)break;hash.update(value);}if(hash.digest('hex')!==upload.sha256)throw new Error();}catch{throw new ApiError(400,'El respaldo refiere imágenes que no existen en el almacenamiento conectado. Restaurá los archivos antes.');}}
  await db().begin(async sql=>{
    const [fresh]=await sql`SELECT role,active FROM users WHERE id=${user.id} FOR SHARE`;if(!fresh?.active||fresh.role!=='admin')throw new ApiError(403,'Tu acceso de administración cambió.');
    await lockWorkspace(sql);const [count]=await sql`SELECT count(*)::int AS n FROM records`;if(count.n!==0)throw new ApiError(409,'Solo se restaura sobre un espacio vacío. No se sobrescriben registros existentes.');
    for(const upload of uploads)await sql`INSERT INTO uploads(path,sha256,uploaded_by,created_at) VALUES(${upload.path},${upload.sha256},${user.id},${upload.created_at}) ON CONFLICT(path) DO NOTHING`;
    for(const {kind,base,payload}of rows)await sql`INSERT INTO records(kind,id,payload,version,created_at,updated_at) VALUES(${kind},${base.id},${sql.json(payload as never)},${base.version},${base.createdAt},${base.updatedAt})`;
    for(const {kind,base,payload}of rows)await validateReferences(sql,kind,payload,base.id);
    for(const event of events)await sql`INSERT INTO telemetry_events(event_id,payload_hash,received_at) VALUES(${event.event_id},${event.payload_hash},${event.received_at}) ON CONFLICT(event_id) DO NOTHING`;
    await auditEvent(sql,user,'restore','workspace',null);
  });return json({count:rows.length});
}catch(e){return errorResponse(e);}}
