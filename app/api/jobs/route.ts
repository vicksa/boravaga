import { database } from "@/lib/database";
export const runtime = "nodejs";
export async function GET(){
  const store=database();
  return Response.json({jobs:[...store.jobs.values()].map((value)=>JSON.parse(value))}, {headers:{"Cache-Control":"no-store"}});
}
