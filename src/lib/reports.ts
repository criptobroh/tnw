import { createHash } from 'node:crypto';
import { db } from './db';
import { mapRecord } from './data';
import type { Campaign,Evidence,Screen,Client } from './types';
export function reportHash(token:string){return createHash('sha256').update(token).digest('hex');}
export async function getReport(token:string){
  if(!/^[a-zA-Z0-9_-]{43}$/.test(token))return null;
  const [share]=await db()`SELECT * FROM shared_reports WHERE token_hash=${reportHash(token)} AND expires_at>now() AND revoked=false`;
  if(!share)return null;
  const [row]=await db()`SELECT * FROM records WHERE kind='campaigns' AND id=${share.campaign_id}`;
  if(!row)return null;
  const campaign=mapRecord(row as never) as unknown as Campaign;
  const rows=await db()`SELECT * FROM records WHERE (kind='screens' AND id IN ${db()(campaign.screenIds.length?campaign.screenIds:['00000000-0000-0000-0000-000000000000'])}) OR (kind='evidence' AND payload->>'campaignId'=${campaign.id} AND payload->>'status'='verified') OR (kind='clients' AND id=${campaign.clientId||'00000000-0000-0000-0000-000000000000'})`;
  return {campaign,screens:rows.filter(r=>r.kind==='screens').map(r=>mapRecord(r as never)) as unknown as Screen[],evidence:rows.filter(r=>r.kind==='evidence').map(r=>mapRecord(r as never)) as unknown as Evidence[],client:rows.filter(r=>r.kind==='clients').map(r=>mapRecord(r as never))[0] as unknown as Client|undefined,expiresAt:new Date(share.expires_at).toISOString()};
}
