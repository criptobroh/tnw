import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { requireRole,assertOrigin,requestOrigin } from '@/lib/auth';
import { db } from '@/lib/db';
import { auditEvent,requireFreshWriter,lockWorkspace } from '@/lib/data';
import { reportHash } from '@/lib/reports';
import { rateLimit } from '@/lib/rate-limit';
import { json,readJson,errorResponse,ApiError } from '@/lib/http';
export async function POST(req:Request){try{assertOrigin(req);const user=await requireRole('admin','sales');await rateLimit(`share:${user.id}`,60);const {campaignId,days}=z.object({campaignId:z.uuid(),days:z.number().int().min(1).max(30).default(7)}).parse(await readJson(req));const token=randomBytes(32).toString('base64url');const expiresAt=new Date(Date.now()+days*86400000).toISOString();await db().begin(async sql=>{await requireFreshWriter(sql,user,'campaigns');await lockWorkspace(sql);const [campaign]=await sql`SELECT id FROM records WHERE kind='campaigns' AND id=${campaignId}`;if(!campaign)throw new ApiError(404,'Campaña inexistente.');await sql`INSERT INTO shared_reports(token_hash,campaign_id,expires_at,created_by) VALUES(${reportHash(token)},${campaignId},${expiresAt},${user.id})`;await auditEvent(sql,user,'share','campaigns',campaignId);});return json({url:`${requestOrigin(req)}/reports/${token}`,expiresAt},201);}catch(e){return errorResponse(e);}}
export async function DELETE(req:Request){try{assertOrigin(req);const user=await requireRole('admin','sales');const {campaignId}=z.object({campaignId:z.uuid()}).parse(await readJson(req));await db().begin(async sql=>{await requireFreshWriter(sql,user,'campaigns');await lockWorkspace(sql);await sql`UPDATE shared_reports SET revoked=true WHERE campaign_id=${campaignId}`;await auditEvent(sql,user,'revoke-shares','campaigns',campaignId);});return json({ok:true});}catch(e){return errorResponse(e);}}
