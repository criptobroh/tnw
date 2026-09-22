import { z } from 'zod';
export const telemetrySchema=z.object({eventId:z.string().min(8).max(160).regex(/^[a-zA-Z0-9_.:-]+$/),screenId:z.uuid(),observedAt:z.iso.datetime({offset:true}),status:z.enum(['online','offline','maintenance','unknown']),plays:z.number().int().min(0).max(100000).optional(),campaignId:z.uuid().optional()}).refine(x=>!x.plays||!!x.campaignId,{message:'Las reproducciones deben vincularse a una campaña.'});
export function validObservation(iso:string,now=Date.now()){const age=now-Date.parse(iso);return Number.isFinite(age)&&age>=-300000&&age<=86400000;}
