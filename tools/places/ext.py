import re, json, sys
G=sys.argv[1]
def arr(src, var):
    i=src.index(f'var {var} = ')+len(f'var {var} = ')
    depth=0; j=i; ins=False
    while True:
        c=src[j]
        if ins:
            if c=='\\': j+=2; continue
            if c=='"': ins=False
        else:
            if c=='"': ins=True
            elif c in '[{': depth+=1
            elif c in ']}':
                depth-=1
                if depth==0: break
        j+=1
    return src[i:j+1]
def js2json(t):
    t=re.sub(r'([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:', r'\1"\2":', t)
    t=re.sub(r',(\s*[}\]])', r'\1', t)
    return json.loads(t)
u=open(G+'/x/package/dist/index.js').read()
regions=js2json(arr(u,'regions')); districts=js2json(arr(u,'districts')); cities=js2json(arr(u,'cities'))
r=open(G+'/react-uzbekistan-map/package/dist/index.js').read()
shapes=json.loads(re.sub(r',(\s*[}\]])', r'\1', arr(r,'districtShapes')))
json.dump({'regions':regions,'districts':districts,'cities':cities,'shapes':shapes},open(sys.argv[2],'w'),ensure_ascii=False)
print(len(regions),len(districts),len(cities),sum(len(v) for v in shapes.values()))
print(sum(len(d['d']) for v in shapes.values() for d in v))
print([ (c['names']['uz'], c.get('subordination'), c['parentSlug']) for c in cities[:12]])
print([r['slug']+':'+r['iso'] for r in regions])
