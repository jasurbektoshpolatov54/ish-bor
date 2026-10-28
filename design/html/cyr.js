window.toCyr=function(){
 const M={'_':'_',a:'а',b:'б',d:'д',f:'ф',g:'г',h:'ҳ',i:'и',j:'ж',k:'к',l:'л',m:'м',n:'н',o:'о',p:'п',q:'қ',r:'р',s:'с',t:'т',u:'у',v:'в',x:'х',y:'й',z:'з',c:'с',w:'в'};
 const V='aeiouAEIOUаеиоуўэяёюАЕИОУЎЭЯЁЮ';
 const BR=['Payme','Click','Uzum','Bank','Paynet','Multicard','Excel','PaymeGo','ClickPass'];
 function word(w){
  if(/^[A-Z]{2,}$/.test(w)||w.includes('@')||BR.includes(w))return w;
  if(w==='km')return 'км';
  let o='';
  for(let i=0;i<w.length;i++){
   const c=w[i],n=w[i+1]||'',L=c.toLowerCase(),up=c!==L;
   const U=x=>up?x.toUpperCase():x;
   const apo=/[‘ʻ'`]/.test(n);
   if((L==='o'||L==='g')&&apo){o+=U(L==='o'?'ў':'ғ');i++;continue}
   if(L==='s'&&n.toLowerCase()==='h'){o+=U('ш');i++;continue}
   if(L==='c'&&n.toLowerCase()==='h'){o+=U('ч');i++;continue}
   if(L==='y'&&n&&'aoue'.includes(n.toLowerCase())&&!/[‘ʻ'`]/.test(w[i+2]||'')){const m={a:'я',o:'ё',u:'ю',e:'е'}[n.toLowerCase()];o+=U(m);i++;continue}
   if(L==='e'){const prev=o[o.length-1];o+=U((!prev||V.includes(prev))?'э':'е');continue}
   if(c==='’'){o+='ъ';continue}
   o+=M[L]?U(M[L]):c;
  }
  return o;
 }
 const tw=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let nd;const ns=[];
 while(nd=tw.nextNode())ns.push(nd);
 ns.forEach(t=>{if(t.parentNode.closest('script,style'))return;
  if(t.nodeValue==='Lotin'||t.nodeValue==='Кирилл')return;
  if(/^[A-Z]$/.test(t.nodeValue)&&t.parentNode.closest('.tile'))return;
  t.nodeValue=t.nodeValue.replace(/[A-Za-z][A-Za-z‘ʻ’'`]*/g,word)});
 document.querySelectorAll('.seg').forEach(sg=>{const sp=[...sg.children];if(sp.length===2&&sp.some(x=>x.textContent==='Кирилл')){sp.forEach(x=>x.classList.toggle('on',x.textContent==='Кирилл'))}});
};
