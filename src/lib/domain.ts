import { z } from 'zod';
import type { Kind, Role, Screen, Quote, Campaign, Evidence, WorkspaceData } from './types';

const text = z.string().trim().max(300).default('');
const name = z.string().trim().min(2, 'Ingresá al menos 2 caracteres.').max(160);
const notes = z.string().trim().max(6000).default('');
const id = z.union([z.uuid(), z.literal('')]).default('');
const money = z.number().finite().min(0).max(1e12).default(0);
const currency = z.enum(['ARS','USD']).default('ARS');
const date = z.iso.date();
const optionalDate = z.union([date,z.literal('')]).default('');
const timestamp = z.union([z.iso.datetime({offset:true}),z.literal('')]).default('');
const email = z.union([z.email().max(200), z.literal('')]).default('');
const ids = z.array(z.uuid()).max(200).default([]).transform(v=>[...new Set(v)]);
const datesValid = (x: {startDate:string;endDate:string}) => x.endDate >= x.startDate;
const schemas = {
  screens: z.object({name,city:name,province:text,address:text,latitude:z.number().min(-90).max(90),longitude:z.number().min(-180).max(180),ownership:z.enum(['own','partner']).default('own'),environment:z.enum(['outdoor','indoor']).default('outdoor'),status:z.enum(['online','offline','maintenance','unknown']).default('unknown'),operatorId:id,width:z.number().positive().max(200).default(6),height:z.number().positive().max(200).default(3),resolution:text,slotSeconds:z.number().int().min(1).max(300).default(10),loopSeconds:z.number().int().min(1).max(3600).default(120),operatingHours:z.number().min(0).max(24).default(18),monthlyRate:money,monthlyCost:money,currency,lastSeen:timestamp,notes,externalId:text}).refine(x=>x.slotSeconds<=x.loopSeconds,{message:'El spot no puede durar más que el loop.'}),
  clients: z.object({name,company:text,email,phone:text,type:z.enum(['agency','direct']).default('direct'),notes}),
  operators: z.object({name,city:name,contact:text,email,phone:text,status:z.enum(['prospect','contacted','negotiating','active']).default('prospect'),notes}),
  campaigns: z.object({name,clientId:id,screenIds:ids,startDate:date,endDate:date,status:z.enum(['draft','scheduled','active','completed','paused']).default('draft'),budget:money,currency,spotSeconds:z.number().int().min(1).max(300).default(10),playsTarget:z.number().int().min(0).max(1e10).default(0),notes}).refine(datesValid,{message:'La fecha de fin debe ser igual o posterior al inicio.'}),
  evidence: z.object({screenId:z.uuid(),campaignId:id,capturedAt:z.iso.datetime({offset:true}),source:z.enum(['manual','camera','player']).default('manual'),status:z.enum(['pending','verified','rejected']).default('pending'),fileUrl:z.string().max(1500).default('').refine(v=>!v || /^\/api\/files\?path=tnw%2F/.test(v),'Usá una foto subida al almacenamiento privado de TNW.'),notes,plays:z.number().int().min(0).max(1e9).default(0),sha256:z.union([z.string().regex(/^[a-f0-9]{64}$/),z.literal('')]).default('')}).refine(x=>x.source==='player'||!!x.fileUrl,{message:'La evidencia visual requiere una imagen.'}),
  incidents: z.object({screenId:z.uuid(),title:name,priority:z.enum(['low','medium','high','critical']).default('medium'),status:z.enum(['open','in_progress','resolved']).default('open'),assignee:text,dueDate:optionalDate,notes}),
  opportunities: z.object({name,city:name,address:text,stage:z.enum(['idea','survey','permits','installation','live']).default('idea'),owner:text,investment:money,monthlyRevenue:money,monthlyCost:money,currency,notes}),
  quotes: z.object({name,clientId:id,screenIds:ids,startDate:date,endDate:date,baseAmount:money,adjustmentPercent:z.number().min(0).max(500).default(0),agencyPercent:z.number().min(0).max(100).default(15),serviceAmount:money,taxPercent:z.number().min(0).max(100).default(0),currency,status:z.enum(['draft','sent','accepted','declined']).default('draft'),notes}).refine(datesValid,{message:'Revisá el período de la propuesta.'}),
};
export const kinds = Object.keys(schemas) as Kind[];
export function isKind(value:string): value is Kind { return kinds.includes(value as Kind); }
export function parseRecord(kind: Kind, input: unknown): Record<string, unknown> { return schemas[kind].parse(input) as Record<string, unknown>; }
const permissions: Record<Role,Kind[]> = {admin:kinds,operations:['screens','evidence','incidents','operators'],sales:['clients','operators','campaigns','quotes','opportunities'],viewer:[]};
export function canWrite(role:Role,kind:Kind) {return permissions[role]?.includes(kind) ?? false;}
export function roundMoney(value: number): number {
  // Shift the decimal exponent before rounding: 10.075 must round to 10.08, not 10.07.
  const [coefficient, exponent = '0'] = value.toString().split('e');
  return Number(`${Math.round(Number(`${coefficient}e${Number(exponent) + 2}`))}e-2`);
}
export function quoteTotals(q: Pick<Quote,'baseAmount'|'adjustmentPercent'|'agencyPercent'|'serviceAmount'|'taxPercent'>) {
  const round=roundMoney;
  const adjustedBase=round(q.baseAmount*(1+q.adjustmentPercent/100));
  const subtotal=round(adjustedBase+q.serviceAmount);
  const commission=round(adjustedBase*q.agencyPercent/100);
  const tax=round(subtotal*q.taxPercent/100);
  return {adjustedBase,subtotal,commission,tax,total:round(subtotal+tax),net:round(subtotal-commission)};
}
export function screenStatus(screen:Pick<Screen,'status'|'lastSeen'>,now=Date.now()):Screen['status'] {
  if(screen.status==='maintenance') return 'maintenance';
  const age=now-Date.parse(screen.lastSeen);
  if(!Number.isFinite(age)||age< -60000||age>15*60*1000) return 'unknown';
  return screen.status;
}
export function plannedPlaysPerDay(screen:Pick<Screen,'operatingHours'|'loopSeconds'>) {return screen.loopSeconds>0?Math.floor(screen.operatingHours*3600/screen.loopSeconds):0;}
export function csvCell(value:unknown) {const s=Array.isArray(value)?value.join('|'):String(value??'');return '"'+(typeof value!=='number'&&/^[\u0000-\u0020]*[=+\-@]|^[\t\r\n]/.test(s)?"'"+s:s).replace(/"/g,'""')+'"';}

export const BUSINESS_TIME_ZONE = 'America/Argentina/Buenos_Aires';
const businessDateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });

/** Same instant always maps to the same commercial day, regardless of the submitted offset. */
export function businessDate(timestamp: string | Date | number): string {
  const value = new Date(timestamp);
  if (!Number.isFinite(value.getTime())) return '';
  const parts = businessDateFormatter.formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(p => p.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function evidenceMatchesCampaign(
  evidence: Pick<Evidence, 'screenId' | 'capturedAt'>,
  campaign: Pick<Campaign, 'screenIds' | 'startDate' | 'endDate'>,
): boolean {
  const day = businessDate(evidence.capturedAt);
  return !!day && campaign.screenIds.includes(evidence.screenId) && day >= campaign.startDate && day <= campaign.endDate;
}

export type CapacityCampaign = Pick<Campaign, 'screenIds' | 'startDate' | 'endDate' | 'status' | 'spotSeconds' | 'currency'> & { id?: string; name?: string };
export type CapacityScreen = Pick<Screen, 'id' | 'loopSeconds' | 'slotSeconds' | 'currency'>;
export interface CapacityConflict { date: string; usedSeconds: number; capacitySeconds: number }

/** One spot per loop. Inclusive dates end at the start of the following calendar day. */
export function findCapacityConflict(screen: CapacityScreen, campaigns: readonly CapacityCampaign[], excludeId?: string): CapacityConflict | null {
  const changes = new Map<number, number>();
  for (const campaign of campaigns) {
    if ((excludeId && campaign.id === excludeId) || !campaign.screenIds.includes(screen.id) || !['active', 'scheduled'].includes(campaign.status)) continue;
    const start = Date.parse(`${campaign.startDate}T00:00:00.000Z`);
    const end = Date.parse(`${campaign.endDate}T00:00:00.000Z`) + 86400000;
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
    changes.set(start, (changes.get(start) ?? 0) + campaign.spotSeconds);
    changes.set(end, (changes.get(end) ?? 0) - campaign.spotSeconds);
  }
  let used = 0;
  for (const [day, delta] of [...changes.entries()].sort((a, b) => a[0] - b[0])) {
    used += delta;
    if (used > screen.loopSeconds) return { date: new Date(day).toISOString().slice(0, 10), usedSeconds: used, capacitySeconds: screen.loopSeconds };
  }
  return null;
}

/** Reverse relation validation: editing a screen cannot invalidate existing commercial records. */
export function screenCompatibilityIssue(
  screen: CapacityScreen,
  campaigns: readonly CapacityCampaign[],
  quotes: readonly Pick<Quote, 'screenIds' | 'currency'>[],
): string | null {
  const related = campaigns.filter(campaign => campaign.screenIds.includes(screen.id));
  if (related.some(campaign => campaign.currency !== screen.currency) || quotes.some(quote => quote.screenIds.includes(screen.id) && quote.currency !== screen.currency)) {
    return 'La moneda es incompatible con una campaña o propuesta vinculada. Conservá su moneda o resolvé los vínculos antes de cambiarla.';
  }
  if (related.some(campaign => campaign.spotSeconds > screen.slotSeconds)) {
    return 'La duración admitida por la pantalla dejaría fuera una campaña vinculada. Revisá primero sus spots.';
  }
  const conflict = findCapacityConflict(screen, related);
  return conflict ? `El loop no alcanza para las campañas del ${conflict.date}: ${conflict.usedSeconds} segundos reservados sobre ${conflict.capacitySeconds} disponibles.` : null;
}
export function summarizeWorkspace(data:WorkspaceData) {
  return {screens:data.screens.length,online:data.screens.filter(s=>screenStatus(s)==='online').length,unknown:data.screens.filter(s=>screenStatus(s)==='unknown').length,cities:[...new Set(data.screens.map(s=>s.city))],activeCampaigns:data.campaigns.filter(c=>c.status==='active').length,openIncidents:data.incidents.filter(i=>i.status!=='resolved').length,verifiedEvidence:data.evidence.filter(e=>e.status==='verified').length,recordedPlays:data.evidence.filter(e=>e.source==='player'&&e.status==='verified').reduce((n,e)=>n+e.plays,0)};
}
