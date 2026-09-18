"""Coletor de JobPosting JSON-LD em páginas públicas configuradas.
Não contorna login, CAPTCHA, robots.txt ou bloqueios HTTP.
"""
import argparse, datetime, hashlib, json, os, re, time
from html.parser import HTMLParser
from urllib.request import Request, urlopen
from urllib.robotparser import RobotFileParser
from urllib.parse import urlparse

UA = 'BoraVagaAcademic/0.1'
class Parser(HTMLParser):
    def __init__(self):
        super().__init__(); self.inside=False; self.parts=[]; self.scripts=[]
    def handle_starttag(self, tag, attrs):
        if tag=='script' and dict(attrs).get('type','').lower()=='application/ld+json': self.inside=True; self.parts=[]
    def handle_data(self,data):
        if self.inside:self.parts.append(data)
    def handle_endtag(self,tag):
        if tag=='script' and self.inside:self.scripts.append(''.join(self.parts));self.inside=False

def objects(value):
    if isinstance(value,list):
        for item in value:yield from objects(item)
    elif isinstance(value,dict):
        kind=value.get('@type',[])
        if kind=='JobPosting' or isinstance(kind,list) and 'JobPosting' in kind:yield value
        for k in ('@graph','itemListElement','item'):
            if k in value:yield from objects(value[k])

def parse(text):
    p=Parser();p.feed(text);out=[]
    for script in p.scripts:
        try:out.extend(objects(json.loads(script)))
        except (ValueError,TypeError):continue
    return out

def read(url):
    with urlopen(Request(url,headers={'User-Agent':UA}),timeout=25) as r:
        body=r.read(4_000_001)
        if len(body)>4_000_000:raise ValueError('Página acima do limite')
        return body.decode('utf-8',errors='replace')

def normalize(j,source,url):
    company=j.get('hiringOrganization',{}).get('name','Não informado')
    title=j.get('title','').strip()
    if not title:raise ValueError('Título ausente')
    level='Não informado'
    # Só usa nível explicitamente escrito no título; não deduz por anos de experiência.
    for pattern,label in [(r'\b(j[uú]nior|jr)\b','Júnior'),(r'\bpleno\b','Pleno'),(r'\b(s[eê]nior|sr)\b','Sênior')]:
        if re.search(pattern,title,re.I):level=label;break
    loc=j.get('jobLocation',{})
    if isinstance(loc,list):loc=loc[0] if loc else {}
    addr=loc.get('address',{}) if isinstance(loc,dict) else {}
    location=', '.join(str(addr[k]) for k in ('addressLocality','addressRegion') if addr.get(k)) or 'Não informado'
    kind=j.get('employmentType','Não informado')
    if isinstance(kind,list):kind=', '.join(kind)
    if kind=='INTERN' or re.search(r'est[aá]gio|estagi[aá]ri',title,re.I):kind='Estágio'
    elif kind not in ('CLT','PJ','Temporário','Estágio'):kind='Não informado'
    expires=j.get('validThrough')
    if expires:
        dt=datetime.datetime.fromisoformat(expires.replace('Z','+00:00'))
        if not dt.tzinfo:dt=dt.replace(tzinfo=datetime.timezone.utc)
        expires=dt.isoformat().replace('+00:00','Z')
        if dt<datetime.datetime.now(datetime.timezone.utc):return None
    # Mesmo cargo/empresa/localidade resulta no mesmo id entre fontes.
    key='|'.join([title,company,location]).casefold()
    return dict(id=hashlib.sha256(key.encode()).hexdigest(), title=title,company=company,location=location,level=level,type=kind,mode='Remoto' if j.get('jobLocationType')=='TELECOMMUTE' else 'Não informado',area='Não informado',salary='Salário não informado',source=source,url=url,description=re.sub('<[^>]+>',' ',j.get('description','')),tags=[],checked=datetime.datetime.now(datetime.timezone.utc).isoformat().replace('+00:00','Z'),expires=expires)

def run(config):
    output={}
    for source in config:
        if not source.get('enabled'):print(source['name']+': desativada (validação pendente)');continue
        for url in source['urls']:
            try:
                parts=urlparse(url)
                if parts.scheme!='https' or parts.hostname not in source['allowed_hosts']:raise ValueError('URL fora da fonte configurada')
                robot=RobotFileParser();robot.parse(read(f'https://{parts.netloc}/robots.txt').splitlines())
                if not robot.can_fetch(UA,url):raise ValueError('Coleta não permitida por robots.txt')
                time.sleep(max(3,robot.crawl_delay(UA) or 0))
                for j in parse(read(url)):
                    row=normalize(j,source['name'],url)
                    if row:output[row['id']]=row
            except Exception as exc:print(f'{source["name"]}: {type(exc).__name__}: {exc}')
    return list(output.values())

if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--config',default='collector/sources.json');ap.add_argument('--output',default='collector/jobs.json');ap.add_argument('--send',action='store_true');args=ap.parse_args()
    rows=run(json.load(open(args.config)));open(args.output,'w').write(json.dumps(rows,ensure_ascii=False,indent=2));print(f'{len(rows)} vagas coletadas')
    if args.send:
        endpoint=os.environ['BORAVAGA_URL'].rstrip('/')+'/api/ingest';token=os.environ['INGEST_TOKEN']
        if not endpoint.startswith('https://'):raise ValueError('Use HTTPS')
        for i in range(0,len(rows),100):
            req=Request(endpoint,data=json.dumps(rows[i:i+100]).encode(),headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'},method='POST')
            with urlopen(req,timeout=30) as r:print(r.status)
