import { database } from "@/lib/database";
import { collectPublicFeeds } from "@/lib/feeds";
export const runtime = "nodejs";
let loading: Promise<number> | null = null;
export async function GET(){
  const store=database();
  if(store.jobs.size===0){
    loading ??= collectPublicFeeds().finally(()=>{loading=null});
    await loading;
  }
  return Response.json({jobs:[...store.jobs.values()].map((value)=>JSON.parse(value))}, {headers:{"Cache-Control":"no-store"}});
}
