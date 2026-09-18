import {database} from "@/lib/database";

type Job = {country:string;id:string;title:string;company:string;location:string;level:string;type:string;mode:string;area:string;salary:string;source:string;url:string;description:string;tags:string[];checked:string;expires?:string|null};

const SOURCES = [
  {name:"Pague Menos e Extrafarma", kind:"gupy", slug:"paguemenosextrafarma"},
  {name:"Bosch", kind:"smartrecruiters", slug:"BoschGroup"},
  {name:"TOPdesk", kind:"smartrecruiters", slug:"TOPdesk"},
  {name:"KOSTAL", kind:"smartrecruiters", slug:"KOSTALGroup"},
  {name:"Nielsen", kind:"smartrecruiters", slug:"TheNielsenCompany"},
  {name:"SAP Fioneer", kind:"workable", slug:"fioneer"},
] as const;
const IT = /\b(tecnolog|ti\b|it\b|software|desenvolv|program|front[- ]?end|back[- ]?end|full[- ]?stack|devops|dados|data|sistemas|qa\b|suporte técnico|infraestrutura|cloud|nuvem|segurança da informação|cibersegurança|ux\b|ui\b|mobile|android|ios|banco de dados|machine learning|inteligência artificial|scrum master|product manager)\b/i;
const clean=(v:unknown)=>String(v??"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
const first=(v:unknown)=>Array.isArray(v)?v[0]:v;
function id(s:string){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return `feed-${(h>>>0).toString(16)}`}
function level(title:string){return /\b(j[uú]nior|jr)\b/i.test(title)?"Júnior":/\bpleno\b/i.test(title)?"Pleno":/\b(s[eê]nior|sr)\b/i.test(title)?"Sênior":"Não informado"}
function make(source:string,title:string,company:string,location:string,description:string,url:string,type="Não informado",tags:string[]=[]):Job|null{
  title=clean(title); description=clean(description); if(!title||!IT.test(`${title} ${description}`)||!url)return null;
  const key=`${title}|${company}|${location}`.toLowerCase();
  const country=/brasil|brazil|s[aã]o paulo|rio de janeiro|campinas|curitiba|bras[ií]lia|bauru|fortaleza|recife|salvador|belo horizonte|porto alegre|goi[aâ]nia|manaus|florian[oó]polis/i.test(location)?"Brasil":"Exterior";
  return {country,id:id(key),title,company:clean(company)||source,location:clean(location)||"Não informado",level:level(title),type:/est[aá]gio|intern/i.test(title)?"Estágio":type,mode:/remote|remoto|home office/i.test(`${title} ${description}`)?"Remoto":"Não informado",area:"Tecnologia",salary:"Salário não informado",source,url,description,tags:tags.map(clean).filter(Boolean).slice(0,20),checked:new Date().toISOString(),expires:null};
}
async function smart(source:typeof SOURCES[number]){
  const r=await fetch(`https://api.smartrecruiters.com/v1/companies/${source.slug}/postings?limit=100`,{headers:{accept:"application/json"},cache:"no-store"});
  if(!r.ok)throw new Error(`${source.name}: ${r.status}`);
  const data=await r.json() as {content?:any[]};
  return (data.content??[]).map((j:any)=>{const sections=j.jobAd?.sections??{};const description=Object.values(sections).map((v:any)=>typeof v==="object"?v.text??"":String(v)).join(" ");const loc=j.location?.city||j.location?.country||"Não informado";const ref=j.ref||j.id;return make(source.name,j.name,source.name,loc,description,`https://jobs.smartrecruiters.com/${source.slug}/${ref}`,j.typeOfEmployment?.label??"Não informado",j.jobAd?.sections?Object.keys(j.jobAd.sections):[])}).filter(Boolean) as Job[];
}
async function workable(source:typeof SOURCES[number]){
  const r=await fetch(`https://apply.workable.com/api/v1/widget/accounts/${source.slug}`,{headers:{accept:"application/json"},cache:"no-store"});
  if(!r.ok)throw new Error(`${source.name}: ${r.status}`);
  const data=await r.json() as any; const jobs=Array.isArray(data)?data:data.jobs??[];
  return jobs.map((j:any)=>make(source.name,j.title,source.name,j.location?.city??j.location??"Não informado",j.description??"",j.url??`https://apply.workable.com/${source.slug}/`,j.employment_type??"Não informado",j.department?[j.department]:[])).filter(Boolean) as Job[];
}
async function gupy(source:typeof SOURCES[number]){
  const r=await fetch(`https://${source.slug}.gupy.io/api/job_postings`,{headers:{accept:"application/json"},cache:"no-store"});
  if(!r.ok)throw new Error(`${source.name}: ${r.status}`);
  const data=await r.json() as any; const jobs=Array.isArray(data)?data:data.data??data.jobPostings??[];
  return jobs.map((j:any)=>make(source.name,j.name??j.title,source.name,j.city??j.location,j.description??"",j.jobUrl??j.url??`https://${source.slug}.gupy.io/`,j.type??"Não informado",j.tags??[])).filter(Boolean) as Job[];
}
export async function collectPublicFeeds(){
  const store=database(); const batches=await Promise.allSettled(SOURCES.map(s=>s.kind==="gupy"?gupy(s):s.kind==="workable"?workable(s):smart(s)));
  for(const [i,b] of batches.entries()){ if(b.status==="fulfilled")for(const job of b.value)store.jobs.set(job.id,JSON.stringify(job)); else console.error("BoraVaga feed failed", SOURCES[i].name, b.reason); }
  return store.jobs.size;
}
