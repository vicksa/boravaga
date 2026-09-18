"""Coleta vagas de feeds públicos e páginas autorizadas.

Suporta:
- JSON-LD JobPosting em páginas públicas permitidas por robots.txt;
- Greenhouse Job Board API pública;
- Lever Postings API pública.
Nunca faz login, contorna CAPTCHA ou ignora robots.txt.
"""
import argparse, datetime, hashlib, html, json, os, re, time
from html.parser import HTMLParser
from urllib.request import Request, urlopen
from urllib.robotparser import RobotFileParser
from urllib.parse import urlparse

UA = 'BoraVagaAcademic/0.2'
class Parser(HTMLParser):
    def __init__(self): super().__init__(); self.inside=False; self.parts=[]; self.scripts=[]
    def handle_starttag(self, tag, attrs):
        if tag=='script' and dict(attrs).get('type','').lower()=='application/ld+json': self.inside=True; self.parts=[]
    def handle_data(self,data):
        if self.inside:self.parts.append(data)
    def handle_endtag(self,tag):
        if tag=='script' and self.inside:self.scripts.append(''.join(self.parts)); self.inside=False

def objects(value):
    if isinstance(value,list):
        for item in value: yield from objects(item)
    elif isinstance(value,dict):
        kind=value.get('@type',[])
        if kind=='JobPosting' or isinstance(kind,list) and 'JobPosting' in kind: yield value
        for k in ('@graph','itemListElement','item'):
            if k in value: yield from objects(value[k])

def parse_jsonld(text):
    p=Parser();p.feed(text);out=[]
    for script in p.scripts:
        try: out.extend(objects(json.loads(script)))
        except (ValueError,TypeError): continue
    return out

def read(url, max_bytes=4_000_000):
    with urlopen(Request(url,headers={'User-Agent':UA,'Accept':'application/json,text/html'}),timeout=25) as r:
        body=r.read(max_bytes+1)
        if len(body)>max_bytes: raise ValueError('Resposta acima do limite')
        return body.decode('utf-8',errors='replace')

def clean(value): return re.sub(r'\s+',' ',html.unescape(re.sub('<[^>]+>',' ',value or ''))).strip()
def first(value): return value[0] if isinstance(value,list) and value else value

def normalize(j,source,url,kind='jsonld'):
    if kind=='greenhouse':
        company=source.get('company', 'Não informado'); title=j.get('title',''); location=first(j.get('location',{}).get('name','Não informado'))
        description=j.get('content',''); link=j.get('absolute_url',url); employment=j.get('metadata',[])
        mode='Remoto' if re.search(r'remote|remoto',f'{location} {description}',re.I) else 'Não informado'
        area='Tecnologia' if re.search(r'developer|engineer|software|data|devops|tech',title,re.I) else 'Não informado'
        tags=[]; expires=None
    elif kind=='lever':
        company=source.get('company','Não informado'); title=j.get('text',''); location=first(j.get('categories',{}).get('location','Não informado'))
        description=j.get('descriptionPlain') or clean(j.get('description','')); link=j.get('hostedUrl') or j.get('applyUrl') or url
        mode='Remoto' if re.search(r'remote|remoto',f'{location} {description}',re.I) else 'Não informado'; area=j.get('categories',{}).get('team','Não informado'); tags=j.get('lists',[]); expires=None
    else:
        company=(j.get('hiringOrganization') or {}).get('name','Não informado'); title=j.get('title','').strip(); link=url
        loc=first(j.get('jobLocation',{})); addr=loc.get('address',{}) if isinstance(loc,dict) else {}
        location=', '.join(str(addr[k]) for k in ('addressLocality','addressRegion') if addr.get(k)) or 'Não informado'
        description=j.get('description',''); employment=j.get('employmentType','Não informado'); mode='Remoto' if j.get('jobLocationType')=='TELECOMMUTE' else 'Não informado'; area='Não informado'; tags=[]
        expires=j.get('validThrough')
        if expires:
            dt=datetime.datetime.fromisoformat(expires.replace('Z','+00:00'))
            if not dt.tzinfo: dt=dt.replace(tzinfo=datetime.timezone.utc)
            expires=dt.isoformat().replace('+00:00','Z')
            if dt<datetime.datetime.now(datetime.timezone.utc): return None
    title=clean(title)
    if not title: raise ValueError('Título ausente')
    level='Não informado'
    for pattern,label in [(r'\b(j[uú]nior|jr)\b','Júnior'),(r'\bpleno\b','Pleno'),(r'\b(s[eê]nior|sr)\b','Sênior')]:
        if re.search(pattern,title,re.I): level=label; break
    if re.search(r'est[aá]gio|estagi[aá]ri|intern',title,re.I): employment='Estágio'
    elif isinstance(employment,list): employment=', '.join(employment)
    elif employment not in ('CLT','PJ','Temporário','Estágio'): employment='Não informado'
    key='|'.join([title,company,location]).casefold()
    return dict(id=hashlib.sha256(key.encode()).hexdigest(),title=title,company=company,location=location,level=level,type=employment,mode=mode,area=area or 'Não informado',salary='Salário não informado',source=source.get('name','Fonte pública'),url=link,description=clean(description),tags=[clean(t) for t in tags if isinstance(t,str)][:20],checked=datetime.datetime.now(datetime.timezone.utc).isoformat().replace('+00:00','Z'),expires=expires)

def allowed(url):
    parts=urlparse(url)
    if parts.scheme!='https' or not parts.hostname: raise ValueError('A URL precisa usar HTTPS')
    robots=RobotFileParser(); robots.parse(read(f'https://{parts.netloc}/robots.txt',100_000).splitlines())
    if not robots.can_fetch(UA,url): raise ValueError('Coleta não permitida por robots.txt')
    return max(3,robots.crawl_delay(UA) or 0)

def fetch_source(source):
    kind=source.get('type','jsonld'); rows=[]
    if kind=='greenhouse':
        token=source.get('board_token'); url=f'https://boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true'; payload=json.loads(read(url)); rows=[normalize(j,source,url,'greenhouse') for j in payload.get('jobs',[])]
    elif kind=='lever':
        site=source.get('site'); url=f'https://api.lever.co/v0/postings/{site}?mode=json'; payload=json.loads(read(url)); rows=[normalize(j,source,url,'lever') for j in payload]
    else:
        hosts=set(source.get('allowed_hosts',[]))
        for url in source.get('urls',[]):
            if urlparse(url).hostname not in hosts: raise ValueError('URL fora dos hosts autorizados')
            time.sleep(allowed(url)); rows.extend(normalize(j,source,url) for j in parse_jsonld(read(url)))
    return [r for r in rows if r]

def run(config):
    output={}
    for source in config:
        if not source.get('enabled'): print(source['name']+': desativada (adicione autorização/token quando tiver)'); continue
        try:
            delay=source.get('delay_seconds',3); time.sleep(delay if source.get('type') in ('greenhouse','lever') else 0)
            for row in fetch_source(source): output[row['id']]=row
            print(f"{source['name']}: {sum(1 for r in output.values() if r['source']==source['name'])} vagas")
        except Exception as exc: print(f"{source['name']}: {type(exc).__name__}: {exc}")
    return list(output.values())

if __name__=='__main__':
    ap=argparse.ArgumentParser(); ap.add_argument('--config',default='collector/sources.json'); ap.add_argument('--output',default='collector/jobs.json'); ap.add_argument('--send',action='store_true'); args=ap.parse_args()
    rows=run(json.load(open(args.config))); open(args.output,'w').write(json.dumps(rows,ensure_ascii=False,indent=2)); print(f'{len(rows)} vagas coletadas')
    if args.send:
        endpoint=os.environ['BORAVAGA_URL'].rstrip('/')+'/api/ingest'; token=os.environ['INGEST_TOKEN']
        if not endpoint.startswith('https://'): raise ValueError('Use HTTPS')
        for i in range(0,len(rows),100):
            req=Request(endpoint,data=json.dumps(rows[i:i+100]).encode(),headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'},method='POST')
            with urlopen(req,timeout=30) as r: print(r.status)
