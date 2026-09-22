import { randomUUID } from 'node:crypto';
import type { Sql, TransactionSql } from 'postgres';
import { db, isDatabaseConfigured } from './db';
import { getUser } from './auth';
import { canWrite, isKind, parseRecord, businessDate, evidenceMatchesCampaign, findCapacityConflict, screenCompatibilityIssue, type CapacityCampaign, type CapacityScreen } from './domain';
import { ApiError } from './http';
import { emptyData, type User, type Kind, type Bootstrap, type WorkspaceData } from './types';

type Connection = Sql | TransactionSql;
type Row={id:string;kind:Kind;payload:Record<string,unknown>;version:number;created_at:Date;updated_at:Date};
export const mapRecord=(row:Row)=>({...row.payload,id:row.id,version:row.version,createdAt:new Date(row.created_at).toISOString(),updatedAt:new Date(row.updated_at).toISOString()});
export async function loadData(connection:Connection=db()):Promise<WorkspaceData>{
  const rows=await connection<Row[]>`SELECT * FROM records ORDER BY created_at DESC`;
  const data=emptyData();
  for(const row of rows)if(isKind(row.kind))(data[row.kind] as unknown[]).push(mapRecord(row));
  return data;
}
export async function getBootstrap():Promise<Bootstrap>{
  const user=await getUser();
  if(!user)throw new ApiError(401,'Iniciá sesión para acceder.');
  const [data,audit]=await Promise.all([loadData(),db()`SELECT id,actor,action,kind,entity_id,at FROM audit ORDER BY at DESC LIMIT 60`]);
  return {data,user,integrations:{database:isDatabaseConfigured(),storage:!!process.env.BLOB_READ_WRITE_TOKEN,ai:process.env.TNW_AI_ENABLED==='true'&&!!(process.env.OPENAI_API_KEY||process.env.AI_GATEWAY_API_KEY||process.env.VERCEL_OIDC_TOKEN),telemetry:!!process.env.TNW_TELEMETRY_TOKEN,latinAd:false},audit:audit.map(a=>({id:a.id,actor:a.actor,action:a.action,kind:a.kind,entityId:a.entity_id??'',at:new Date(a.at).toISOString()}))};
}
export async function auditEvent(sql:Connection,user:User|string,action:string,kind:string,id:string|null){await sql`INSERT INTO audit (id,actor,action,kind,entity_id,at) VALUES (${randomUUID()},${typeof user==='string'?user:user.email},${action},${kind},${id},now())`;}
// A workspace advisory lock serializes mutations and reference validation, while
// optimistic versions still reject stale forms. Prevents concurrent delete/create races.
export async function lockWorkspace(sql:Connection){await sql`SELECT pg_advisory_xact_lock(84692022)`;}
/** Lock user before workspace consistently; role changes cannot race a committed mutation. */
export async function requireFreshWriter(sql:Connection,user:User,kind:Kind):Promise<User>{
  const [actor]=await sql<(User&{active:boolean})[]>`SELECT id,name,email,role,active FROM users WHERE id=${user.id} FOR SHARE`;
  if(!actor?.active)throw new ApiError(401,'Tu acceso ya no está activo. Iniciá sesión nuevamente.');
  if(!canWrite(actor.role,kind))throw new ApiError(403,'Tu rol actual no permite editar esta sección.');
  return {id:actor.id,name:actor.name,email:actor.email,role:actor.role};
}
export async function validateReferences(sql:Connection,kind:Kind,p:Record<string,unknown>,id?:string){
  const refs:{kind:Kind;id:string}[]=[];
  if(p.operatorId)refs.push({kind:'operators',id:String(p.operatorId)});
  if(p.clientId)refs.push({kind:'clients',id:String(p.clientId)});
  if(p.screenId)refs.push({kind:'screens',id:String(p.screenId)});
  if(p.campaignId)refs.push({kind:'campaigns',id:String(p.campaignId)});
  for(const sid of (p.screenIds as string[]??[]))refs.push({kind:'screens',id:sid});
  for(const ref of refs){const [found]=await sql`SELECT payload FROM records WHERE kind=${ref.kind} AND id=${ref.id}`;if(!found)throw new ApiError(400,'Una pantalla, cliente, campaña u operador ya no existe. Actualizá los datos.');}
  if(kind==='campaigns'&&['active','scheduled'].includes(String(p.status))&&(!p.clientId||!(p.screenIds as string[]).length))throw new ApiError(400,'Una campaña programada o activa necesita cliente y pantallas.');
  if((kind==='campaigns'||kind==='quotes')&&(p.screenIds as string[]).length){
    const screens=await sql`SELECT id,payload FROM records WHERE kind='screens' AND id IN ${sql(p.screenIds as string[])}`;
    if(screens.some(s=>s.payload.currency!==p.currency))throw new ApiError(400,'Las pantallas y la propuesta/campaña deben usar la misma moneda. No se convierten divisas automáticamente.');
    if(kind==='campaigns'&&screens.some(s=>Number(p.spotSeconds)>s.payload.slotSeconds))throw new ApiError(400,'El spot excede la duración admitida por alguna pantalla.');
    if(kind==='campaigns'&&['active','scheduled'].includes(String(p.status))){
      const existing=await sql`SELECT id,payload FROM records WHERE kind='campaigns'
        AND id<>${id??'00000000-0000-0000-0000-000000000000'}
        AND payload->>'status' IN ('active','scheduled')
        AND payload->>'startDate'<=${String(p.endDate)} AND payload->>'endDate'>=${String(p.startDate)}`;
      const campaigns=[...existing.map(row=>({...row.payload,id:row.id}) as CapacityCampaign),p as unknown as CapacityCampaign];
      for(const screen of screens){
        const conflict=findCapacityConflict({...screen.payload,id:screen.id} as CapacityScreen,campaigns);
        if(conflict)throw new ApiError(409,`No hay cupo local en ${screen.payload.name} el ${conflict.date}: ${conflict.usedSeconds} segundos sobre un loop de ${conflict.capacitySeconds}. Ajustá pantallas, fechas o duración. Esto no reserva inventario en un CMS externo.`);
      }
    }
  }
  if(kind==='evidence'){
    if(Date.parse(String(p.capturedAt))>Date.now()+5*60*1000)throw new ApiError(400,'La captura no puede estar en el futuro.');
    if(p.source!=='player'&&Number(p.plays)>0)throw new ApiError(400,'Una foto no registra reproducciones. El conteo ingresa desde el player.');
    if(p.fileUrl){const path=new URL(String(p.fileUrl),'https://tnw.lol').searchParams.get('path')??'';const [upload]=await sql`SELECT sha256 FROM uploads WHERE path=${path}`;if(!upload||upload.sha256!==p.sha256)throw new ApiError(400,'La imagen y su huella no coinciden con un archivo de TNW. Subí la imagen nuevamente.');}
    if(p.campaignId){const [campaign]=await sql`SELECT payload FROM records WHERE id=${String(p.campaignId)} AND kind='campaigns'`;if(!campaign.payload.screenIds.includes(p.screenId))throw new ApiError(400,'La pantalla no pertenece a la campaña seleccionada.');const day=businessDate(String(p.capturedAt));if(!day||day<campaign.payload.startDate||day>campaign.payload.endDate)throw new ApiError(400,'La evidencia debe estar dentro del período de la campaña, según la fecha de Buenos Aires.');}
  }
  if(kind==='screens'&&p.externalId){const [same]=await sql`SELECT id FROM records WHERE kind='screens' AND payload->>'externalId'=${String(p.externalId)} AND id<>${id??'00000000-0000-0000-0000-000000000000'}`;if(same)throw new ApiError(409,'Este identificador externo ya está asignado a otra pantalla.');}
  if(kind==='screens'&&id){
    const linked=await sql`SELECT id,kind,payload FROM records WHERE kind IN ('campaigns','quotes') AND (payload->'screenIds') ? ${id}`;
    const issue=screenCompatibilityIssue(
      {...p,id} as unknown as CapacityScreen,
      linked.filter(row=>row.kind==='campaigns').map(row=>({...row.payload,id:row.id}) as CapacityCampaign),
      linked.filter(row=>row.kind==='quotes').map(row=>row.payload),
    );
    if(issue)throw new ApiError(409,issue);
  }
}
export async function createRecords(user:User,kind:Kind,inputs:unknown[]){
  if(!canWrite(user.role,kind))throw new ApiError(403,'Tu rol no puede editar esta sección.');
  if(!inputs.length||inputs.length>200)throw new ApiError(400,'Importá entre 1 y 200 registros por vez.');
  return db().begin(async sql=>{
    const actor=await requireFreshWriter(sql,user,kind);
    await lockWorkspace(sql);
    const results=[];
    for(const input of inputs){
      const payload=parseRecord(kind,input);
      if(kind==='screens'){payload.lastSeen='';if(payload.status==='online')payload.status='unknown';}
      if(kind==='evidence'&&payload.source==='player')throw new ApiError(400,'Las reproducciones del player ingresan por telemetría autenticada.');
      await validateReferences(sql,kind,payload);
      const id=randomUUID();
      const [row]=await sql<Row[]>`INSERT INTO records(id,kind,payload,version,created_at,updated_at) VALUES (${id},${kind},${sql.json(payload as never)},1,now(),now()) RETURNING *`;
      await auditEvent(sql,actor,'create',kind,id);results.push(mapRecord(row));
    }return results;
  });
}
export async function updateRecord(user:User,kind:Kind,id:string,input:Record<string,unknown>){
  if(!canWrite(user.role,kind))throw new ApiError(403,'Tu rol no puede editar esta sección.');
  const version=Number(input.version);if(!Number.isInteger(version)||version<1)throw new ApiError(400,'Falta la versión del registro.');
  return db().begin(async sql=>{
    const actor=await requireFreshWriter(sql,user,kind);
    await lockWorkspace(sql);
    const [old]=await sql<Row[]>`SELECT * FROM records WHERE id=${id} AND kind=${kind} FOR UPDATE`;
    if(!old)throw new ApiError(404,'Registro no encontrado.');
    if(old.version!==version)throw new ApiError(409,'Otro usuario modificó este registro. Actualizá antes de guardar.');
    const payload=parseRecord(kind,{...old.payload,...input});
    if(kind==='screens'){payload.lastSeen=old.payload.lastSeen;if(payload.status==='online'&&old.payload.status!=='online')payload.status='unknown';}
    if(kind==='evidence'){
      if(old.payload.source==='player'){for(const key of ['plays','screenId','campaignId','capturedAt','source'])if(payload[key]!==old.payload[key])throw new ApiError(400,'Los datos del player son inmutables; podés revisar su estado.');}
      else if(payload.source==='player')throw new ApiError(400,'La fuente player está reservada a telemetría.');
    }
    await validateReferences(sql,kind,payload,id);
    // Screen assignment must preserve existing evidence relations.
    if(kind==='campaigns'){
      const linked=await sql`SELECT payload FROM records WHERE kind='evidence' AND payload->>'campaignId'=${id}`;
      if(linked.some(r=>!evidenceMatchesCampaign(r.payload,payload as never)))throw new ApiError(409,'El cambio dejaría evidencias fuera de las pantallas o fechas de la campaña en Buenos Aires.');
    }
    const [row]=await sql<Row[]>`UPDATE records SET payload=${sql.json(payload as never)},version=version+1,updated_at=now() WHERE id=${id} AND kind=${kind} RETURNING *`;
    await auditEvent(sql,actor,'update',kind,id);return mapRecord(row);
  });
}
export async function deleteRecord(user:User,kind:Kind,id:string,version:number){
  if(!canWrite(user.role,kind))throw new ApiError(403,'Tu rol no puede eliminar registros en esta sección.');
  return db().begin(async sql=>{
    const actor=await requireFreshWriter(sql,user,kind);
    await lockWorkspace(sql);
    const [old]=await sql`SELECT version FROM records WHERE id=${id} AND kind=${kind} FOR UPDATE`;
    if(!old)throw new ApiError(404,'Registro no encontrado.');
    if(old.version!==version)throw new ApiError(409,'El registro cambió. Actualizá antes de eliminar.');
    const linked=await sql`SELECT id FROM records WHERE id<>${id} AND (payload->>'screenId'=${id} OR payload->>'campaignId'=${id} OR payload->>'operatorId'=${id} OR payload->>'clientId'=${id} OR (payload->'screenIds') ? ${id}) LIMIT 1`;
    if(linked.length)throw new ApiError(409,'Este registro está vinculado a otros. Quitá esas relaciones antes de eliminar.');
    await sql`DELETE FROM records WHERE id=${id} AND kind=${kind}`;
    await auditEvent(sql,actor,'delete',kind,id);return {ok:true};
  });
}
