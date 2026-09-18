import {database} from "@/lib/database";
import {z} from "zod";
export const runtime="nodejs";
const job=z.object({id:z.string().min(1).max(150),title:z.string().min(1).max(300),company:z.string().min(1).max(200),location:z.string().max(200),level:z.string().max(80),type:z.string().max(80),mode:z.string().max(80),area:z.string().max(100),salary:z.string().max(100),source:z.string().max(80),url:z.string().url(),description:z.string().max(20000),tags:z.array(z.string().max(60)).max(20),checked:z.string(),expires:z.string().nullable().optional()});
export async function POST(req:Request){const token=process.env.INGEST_TOKEN;if(!token||req.headers.get("authorization")!==`Bearer ${token}`)return new Response("Não autorizado",{status:401});try{const rows=z.array(job).max(100).parse(await req.json());for(const row of rows)database().jobs.set(row.id,JSON.stringify(row));return Response.json({received:rows.length});}catch{return Response.json({error:"Lote inválido"},{status:400});}}
