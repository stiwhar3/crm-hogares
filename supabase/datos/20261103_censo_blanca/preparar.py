import json,glob,collections,openpyxl,re,sys
rcs=set(json.load(open('rcs.json')))
P='/root/.claude/uploads/3cebca08-5b8d-56c0-af33-0a7b60e8f78f/'
def n(v):
    v='' if v is None else str(v).strip()
    return str(int(v)) if re.fullmatch(r'[+-]?\d+',v) else v
E={}
skip=[]
for f,av in [('39cdd8f1-BUCADOR_BLANCA.xlsx',0),('e3d954fe-BUSCADOR_AVANZADA.xlsx',1)]:
    for r in list(openpyxl.load_workbook(P+f,read_only=True).active.iter_rows(values_only=True))[1:]:
        if r[0] in rcs: continue
        if av: rc,_,t,via,num,letra,bloque,esc,pl,pu,cp,anio,m2=r
        else: rc,_,t,via,num,esc,pl,pu,anio,m2=r;letra=bloque=''
        if not via or rc=='0505534VK3600N0001QD': skip.append(r);continue
        u={'rc':rc,'esc':n(esc),'planta':n(pl),'puerta':n(pu),'m2':str(m2),'anio':str(anio)}
        if letra: u['letra']=letra
        if bloque: u['bloque']=bloque
        if not u['esc']: del u['esc']
        E.setdefault((f"{t} {via}".strip(),str(num)),[]).append(u)
def pk(x):
    try: return (0,int(x),'')
    except: return (1,0,x)
eds=[]
for (via,num) in sorted(E,key=lambda k:(k[0],pk(k[1]))):
    us=sorted(E[(via,num)],key=lambda u:(u.get('letra',''),pk(u.get('esc','')),pk(u['planta']),pk(u['puerta'])))
    eds.append({'via':via,'num':num,'u':us})
docs=[];cur=[];size=0
for e in eds:
    s=len(json.dumps(e,ensure_ascii=False))
    if cur and size+s>180000: docs.append(cur);cur=[];size=0
    cur.append(e);size+=s
if cur: docs.append(cur)
out=[{'id':f'blanca-{i:02d}','zona':'BLANCA','d':{'zona':'BLANCA','parte':i,'edificios':d}} for i,d in enumerate(docs)]
json.dump(out,open('nuevos_censo.json','w'),ensure_ascii=False)
print('skip',skip)
print('docs',len(out),'edificios',len(eds),'viviendas',sum(len(e['u']) for e in eds))
c=collections.defaultdict(list)
for e in eds: c[e['via']].append(e['num'])
for k,v in c.items(): print(k,len(v),','.join(v))
