import { requireUser,assertOrigin } from '@/lib/auth';
import { createRecords } from '@/lib/data';
import { isKind } from '@/lib/domain';
import { json,readJson,errorResponse,ApiError } from '@/lib/http';
export async function POST(req:Request){try{assertOrigin(req);const user=await requireUser();const input=await readJson(req,2_000_000);if(typeof input.kind!=='string'||!isKind(input.kind)||!Array.isArray(input.records))throw new ApiError(400,'Elegí una sección e incluí una lista de registros.');const rows=await createRecords(user,input.kind,input.records);return json({count:rows.length},201);}catch(e){return errorResponse(e);}}
