import json,re,difflib
D=json.load(open('raw.json'))
def ph(s):
    s=s.lower().replace('а','a').replace(' city','')
    s=re.sub(r'[^a-z]','',s)
    for a,b in [('dzh','j'),('dj','j'),('kh','h'),('x','h'),('ts','s'),('yo','o'),('ya','a'),('y','i'),('q','k'),('gh','g'),('w','v'),('ee','e')]: s=s.replace(a,b)
    s=re.sub(r'[aou]','a',s); s=re.sub(r'[ei]','e',s)
    return s
allshapes=[(r,s) for r,v in D['shapes'].items() for s in v]
def best(x, iscity):
    reg=x['regionIso']; regs={reg} | ({'UZ-TO','UZ-TK'} if reg in ('UZ-TO','UZ-TK') else set())
    cands=[s for r,s in allshapes if r in regs]
    def score(s):
        sc=difflib.SequenceMatcher(None, ph(x['names']['en']), ph(s['name'])).ratio()
        if iscity == s['name'].endswith(' city'): sc+=0.05
        return sc
    b=max(cands,key=score); return b, score(b)
low=[]
res={}
for kind in ['districts','cities']:
  for x in D[kind]:
    b,sc=best(x, kind=='cities')
    res[kind+':'+x['slug']]=(b['id'],sc)
    if sc<0.8: low.append((kind,x['regionIso'],x['names']['en'],b['name'],round(sc,2)))
print(len(low)); 
for l in low: print(l)
json.dump(res,open('match.json','w'))
