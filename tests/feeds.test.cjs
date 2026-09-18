const test = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const vm = require('node:vm');

function collector(fetch) {
  const jobs = new Map();
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync('lib/feeds.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(code,{exports:module.exports,require:()=>({database:()=>({jobs})}),fetch,AbortSignal,console:{error(){}},URL});
  return {api:module.exports,jobs};
}
const response = data => ({ok:true,json:async()=>data});
test('Brazil pagination, Portuguese titles, valid application links and source filter values',async()=>{
  const requests=[];
  const {api,jobs}=collector(async raw=>{
    const u=new URL(raw); requests.push(u);
    if(u.host!=='api.smartrecruiters.com')throw new Error('source unavailable');
    if(!u.pathname.includes('/BoschGroup/'))return response({content:[],totalFound:0});
    if(u.pathname.endsWith('/postings')) {
      assert.equal(u.searchParams.get('country'),'br');
      if(u.searchParams.get('offset')==='0')return response({content:Array.from({length:100},(_,i)=>({id:String(i),name:'Operador de caixa'})),totalFound:101});
      return response({content:[{id:'101',name:'Desenvolvedor Júnior',location:{city:'Campinas',country:'br'},ref:'https://api.smartrecruiters.com/v1/companies/BoschGroup/postings/101'}],totalFound:101});
    }
    return response({id:'101',name:'Desenvolvedor Júnior',location:{city:'Campinas',country:'br'},postingUrl:'https://jobs.smartrecruiters.com/BoschGroup/101',active:true,jobAd:{sections:{jobDescription:{text:'Desenvolvimento de aplicações'}}}});
  });
  await api.collectPublicFeeds();
  const rows=[...jobs.values()].map(JSON.parse);
  assert.equal(rows.length,1);
  assert.equal(rows[0].country,'Brasil');
  assert.equal(rows[0].source,'SmartRecruiters');
  assert.equal(rows[0].level,'Júnior');
  assert.equal(rows[0].url,'https://jobs.smartrecruiters.com/BoschGroup/101');
  assert.ok(requests.some(u=>u.searchParams.get('offset')==='100'));
});
test('inactive jobs and unrelated job titles are excluded',async()=>{
  const {api,jobs}=collector(async raw=>{
    const u=new URL(raw);
    if(u.host!=='api.smartrecruiters.com')throw new Error('unavailable');
    if(u.pathname.endsWith('/postings'))return response({content:[{id:'1',name:'Software Engineer'},{id:'2',name:'Gerente comercial',industry:{label:'Software'}}],totalFound:2});
    return response({id:'1',name:'Software Engineer',active:false});
  });
  await api.collectPublicFeeds(); assert.equal(jobs.size,0);
});
test('Workable keeps country instead of losing it when city is present',async()=>{
  const {api,jobs}=collector(async raw=>{
    if(!raw.includes('apply.workable.com'))throw new Error('unavailable');
    return response({jobs:[{title:'Software Engineer',location:{city:'Campinas',country:'Brazil'},url:'https://apply.workable.com/fioneer/j/example',description:''}]});
  });
  await api.collectPublicFeeds();
  const row=JSON.parse([...jobs.values()][0]); assert.equal(row.country,'Brasil'); assert.equal(row.source,'Workable');
});
