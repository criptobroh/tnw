import { createHash,randomUUID,timingSafeEqual } from 'node:crypto';
import { db } from '@/lib/db';
import { lockWorkspace,auditEvent,validateReferences } from '@/lib/data';
import { rateLimit } from '@/lib/rate-limit';
import { telemetrySchema,validObservation } from '@/lib/telemetry';
import { json,readJson,errorResponse,ApiError } from '@/lib/http';
export async function POST(req:Request){try{
  const expected=process.env.TNW_TELEMETRY_TOKEN;
  if(!expected)throw new ApiError(503,'La recepción de telemetría no está configurada.');
  const provided=req.headers.get('authorization')?.replace(/^Bearer /,'')??'';
  const hash=(s:string)=>createHash('sha256').update(s).digest();
  if(!timingSafeEqual(hash(provided),hash(expected)))throw new ApiError(401,'Credencial de integración inválida.');
  await rateLimit('telemetry:global',3000,60);
  const event=telemetrySchema.parse(await readJson(req,16384));
  if(!validObservation(event.observedAt))throw new ApiError(400,'La observación debe corresponder a las últimas 24 horas y no estar en el futuro.');
  const payloadHash=createHash('sha256').update(JSON.stringify(event)).digest('hex');
  const outcome=await db().begin(async sql=>{
    await lockWorkspace(sql);
    const [duplicate]=await sql`SELECT payload_hash FROM telemetry_events WHERE event_id=${event.eventId}`;
    if(duplicate){if(duplicate.payload_hash!==payloadHash)throw new ApiError(409,'El identificador del evento ya existe con otro contenido.');return {duplicate:true};}
    const [screen]=await sql`SELECT payload FROM records WHERE kind='screens' AND id=${event.screenId} FOR UPDATE`;if(!screen)throw new ApiError(404,'Pantalla no registrada.');
    let evidenceId:string|null=null;
    if(event.plays){
      const payload={screenId:event.screenId,campaignId:event.campaignId,capturedAt:event.observedAt,source:'player',status:'pending',fileUrl:'',notes:`Evento de player ${event.eventId}. Pendiente de revisión; no equivale a audiencia.`,plays:event.plays,sha256:''};
      await validateReferences(sql,'evidence',payload);evidenceId=randomUUID();
      await sql`INSERT INTO records(id,kind,payload) VALUES(${evidenceId},'evidence',${sql.json(payload)})`;
    }
    const newest=!screen.payload.lastSeen||Date.parse(event.observedAt)>=Date.parse(screen.payload.lastSeen);
    if(newest){const payload={...screen.payload,status:event.status,lastSeen:event.observedAt};await sql`UPDATE records SET payload=${sql.json(payload)},version=version+1,updated_at=now() WHERE kind='screens' AND id=${event.screenId}`;}
    await sql`INSERT INTO telemetry_events(event_id,payload_hash) VALUES(${event.eventId},${payloadHash})`;
    await auditEvent(sql,'integración:player','telemetry','screens',event.screenId);
    return {duplicate:false,evidenceId,signalUpdated:newest};
  });return json({ok:true,...outcome});
}catch(e){return errorResponse(e);}}
