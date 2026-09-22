import { db } from './db';
import { ApiError } from './http';
export async function rateLimit(key:string,limit=30,seconds=3600){
  const [row]=await db()`INSERT INTO rate_limits(key,count,reset_at) VALUES(${key},1,now()+${seconds}*interval '1 second') ON CONFLICT(key) DO UPDATE SET count=CASE WHEN rate_limits.reset_at<=now() THEN 1 ELSE LEAST(rate_limits.count+1,${limit+1}) END, reset_at=CASE WHEN rate_limits.reset_at<=now() THEN now()+${seconds}*interval '1 second' ELSE rate_limits.reset_at END RETURNING count`;
  if(row.count>limit)throw new ApiError(429,'Alcanzaste el límite de solicitudes. Intentá más tarde.');
}
