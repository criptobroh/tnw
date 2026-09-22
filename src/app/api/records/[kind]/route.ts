import { requireUser,assertOrigin } from '@/lib/auth';
import { createRecords } from '@/lib/data';
import { isKind } from '@/lib/domain';
import { json,readJson,errorResponse,ApiError } from '@/lib/http';
export async function POST(req:Request,{params}:{params:Promise<{kind:string}>}){try{assertOrigin(req);const user=await requireUser();const {kind}=await params;if(!isKind(kind))throw new ApiError(404,'Sección inexistente.');const [record]=await createRecords(user,kind,[await readJson(req)]);return json({record},201);}catch(e){return errorResponse(e);}}
