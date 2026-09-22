import { z } from 'zod';
import { requireUser,assertOrigin } from '@/lib/auth';
import { updateRecord,deleteRecord } from '@/lib/data';
import { isKind } from '@/lib/domain';
import { json,readJson,errorResponse,ApiError } from '@/lib/http';
type Context={params:Promise<{kind:string;id:string}>};
export async function PATCH(req:Request,{params}:Context){try{assertOrigin(req);const user=await requireUser();const {kind,id}=await params;if(!isKind(kind))throw new ApiError(404,'Sección inexistente.');z.uuid().parse(id);return json({record:await updateRecord(user,kind,id,await readJson(req))});}catch(e){return errorResponse(e);}}
export async function DELETE(req:Request,{params}:Context){try{assertOrigin(req);const user=await requireUser();const {kind,id}=await params;if(!isKind(kind))throw new ApiError(404,'Sección inexistente.');z.uuid().parse(id);const {version}=z.object({version:z.number().int().positive()}).parse(await readJson(req));return json(await deleteRecord(user,kind,id,version));}catch(e){return errorResponse(e);}}
