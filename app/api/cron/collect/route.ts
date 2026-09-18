import {database} from "@/lib/database";
export const runtime="nodejs";
export async function GET(req:Request){if(req.headers.get("authorization")!==`Bearer ${process.env.CRON_SECRET}`)return new Response("Unauthorized",{status:401});
 // Sites that disallow automated extraction remain disabled. This endpoint is the
 // safe scheduler hook for approved feeds or APIs added later.
 return Response.json({ok:true,received:database().jobs.size,message:"Nenhuma fonte autorizada configurada"});}
