import { database } from "@/lib/database";
import { collectPublicFeeds, feedDiagnostics } from "@/lib/feeds";
export const runtime = "nodejs";
let loading: Promise<number> | null = null;
export async function GET(request:Request){
  const store=database();
  if(store.jobs.size===0){
    loading ??= collectPublicFeeds().finally(()=>{loading=null});
    await loading;
  }
  const body:{jobs:unknown[];diagnostics?:typeof feedDiagnostics}={jobs:[...store.jobs.values()].map((value)=>JSON.parse(value))};
  if(new URL(request.url).searchParams.get("debug")==="1") body.diagnostics=feedDiagnostics;
  return Response.json(body, {headers:{"Cache-Control":"no-store"}});
}
