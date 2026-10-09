/* Shared public snapshot / local live monitor; credentials stay on the local server. */
'use strict';
globalThis.createCommoditySpot = function(block) {
  const node=(tag,cls='',text='')=>{const n=document.createElement(tag);n.className=cls;n.textContent=text;return n;};
  const root=node('div','commodity-spot');root.id=block.id;
  root.append(node('h3','',block.title));
  const meta=node('p','spot-meta',`现货及前收日期：${block.date} · 按价差率从小到大排列`);root.append(meta);
  const toolbar=node('div','spot-toolbar');
  const filter=node('input');filter.placeholder='搜索品种或合约';filter.setAttribute('aria-label','搜索品种或合约');
  const refresh=node('button','','刷新实时行情');refresh.type='button';
  const reset=node('button','','返回前收');reset.type='button';
  toolbar.append(filter,refresh,reset);root.append(toolbar);
  const message=node('p','spot-message',block.warning||'历史分位固定按前收计算；实时刷新仅更新期货价格，现货保持上方日期。');root.append(message);
  const scroller=node('div','spot-scroll');const table=node('table','spot-table');
  const head=node('thead');const header=node('tr');
  ['品种','合约','现货','前收','计价单位','价差率 ↑','一年分位（前收）','最新期货','日内变化（百分点）','行情时间','一年走势'].forEach(x=>{const th=node('th','',x);th.scope='col';header.append(th);});head.append(header);
  const body=node('tbody');table.append(head,body);scroller.append(table);root.append(scroller);
  root.append(node('p','spot-footnote',block.note));
  const local=node('a','spot-local','本机实时监控');local.href='http://127.0.0.1:30006/commodity-spot';local.target='_blank';local.rel='noopener';root.append(local);
  root.append(node('span','spot-footnote',' · 实时功能连接本机行情服务；其他设备需有可用的本机服务。'));
  const base=structuredClone(block.rows);let rows=structuredClone(base),isLive=false;const expanded=new Set();
  const fmt=(v,d=2,signed=false)=>v==null||!Number.isFinite(v)?'—':(signed&&v>0?'+':'')+v.toLocaleString('zh-CN',{minimumFractionDigits:d,maximumFractionDigits:d});
  const pct=v=>v==null?'—':fmt(v,2,true)+'%';
  function chart(product){
    const wrap=node('div','spot-chart');const points=block.series[product]||[];
    const valid=points.filter(p=>p[1]!=null&&Number.isFinite(p[1]));
    if(!valid.length){wrap.append(node('p','','暂无有效历史数据'));return wrap;}
    const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 1000 300');svg.setAttribute('role','img');svg.setAttribute('aria-label',product+'过去一年价差率走势');
    const title=document.createElementNS(ns,'title');title.textContent=product+'每日最近非交割月期现价差率';svg.append(title);
    const asof=new Date(block.date+'T00:00:00Z'),start=new Date(asof);start.setUTCFullYear(start.getUTCFullYear()-1);
    let lo=Math.min(0,...valid.map(p=>p[1])),hi=Math.max(0,...valid.map(p=>p[1]));let pad=Math.max((hi-lo)*.08,.1);lo-=pad;hi+=pad;
    const x=d=>65+(new Date(d+'T00:00:00Z')-start)/(asof-start)*910,y=v=>255-(v-lo)/(hi-lo)*225;
    function text(tx,ty,value){const t=document.createElementNS(ns,'text');t.setAttribute('x',tx);t.setAttribute('y',ty);t.textContent=value;svg.append(t);}
    for(let i=0;i<=4;i++){const v=lo+(hi-lo)*i/4,line=document.createElementNS(ns,'line');line.setAttribute('x1',65);line.setAttribute('x2',975);line.setAttribute('y1',y(v));line.setAttribute('y2',y(v));line.setAttribute('stroke','#dae4e5');svg.append(line);text(2,y(v)+4,v.toFixed(2)+'%');}
    let path='',connected=false;points.forEach(p=>{if(p[1]==null||!Number.isFinite(p[1])){connected=false;return;}path+=(connected?'L':'M')+x(p[0]).toFixed(2)+' '+y(p[1]).toFixed(2)+' ';connected=true;});
    const line=document.createElementNS(ns,'path');line.setAttribute('d',path);line.setAttribute('fill','none');line.setAttribute('stroke','#177b84');line.setAttribute('stroke-width','2');svg.append(line);
    valid.forEach(p=>{const c=document.createElementNS(ns,'circle');c.setAttribute('cx',x(p[0]));c.setAttribute('cy',y(p[1]));c.setAttribute('r','3');c.setAttribute('fill','#177b84');const t=document.createElementNS(ns,'title');t.textContent=`${p[0]} · ${p[2]} · ${p[1].toFixed(2)}%`;c.append(t);svg.append(c);});
    text(65,283,start.toISOString().slice(0,10));text(880,283,block.date);wrap.append(svg);
    wrap.append(node('p','spot-meta',`${valid.length}个有效交易日 · ${valid[0][0]} 至 ${valid[valid.length-1][0]} · 每日滚动选约，空缺不填充；悬停查看日期、合约及价差率。`));return wrap;
  }
  function render(){
    body.replaceChildren();const q=filter.value.trim().toLowerCase();
    rows.sort((a,b)=>(a.rate==null)-(b.rate==null)||(a.rate??0)-(b.rate??0)||a.product.localeCompare(b.product));
    rows.filter(r=>(r.name+r.product+r.contract).toLowerCase().includes(q)).forEach(r=>{
      const tr=node('tr');tr.dataset.product=r.product;
      const values=[`${r.name}(${r.product})`,r.contract,fmt(r.spot),fmt(r.close),r.unit,pct(r.rate),r.percentile==null?`—（${r.samples}日）`:`${fmt(r.percentile,1)}%（${r.samples}日）`,fmt(r.latest),fmt(r.change_pp,2,true),r.quote_time||'—'];
      values.forEach((v,i)=>{const td=node('td','',v);if(i===5||i===8){const value=i===5?r.rate:r.change_pp;if(value!=null)td.className=value<0?'spot-negative':'spot-positive';}if(i===6)td.title='前收分位，至少60个有效样本；实时刷新不改变分位';if(r.quote_error&&(i===5||i===7||i===9))td.title=r.quote_error;tr.append(td);});
      const cell=node('td'),button=node('button','spot-trend',expanded.has(r.product)?'收起':'展开');button.type='button';button.setAttribute('aria-expanded',String(expanded.has(r.product)));button.setAttribute('aria-label',r.name+'一年走势');button.onclick=()=>{expanded.has(r.product)?expanded.delete(r.product):expanded.add(r.product);render();};cell.append(button);tr.append(cell);body.append(tr);
      if(expanded.has(r.product)){const detail=node('tr','spot-detail');const td=node('td');td.colSpan=11;td.append(chart(r.product));detail.append(td);body.append(detail);}
    });
    header.children[5].textContent=isLive?'最新价差率 ↑':'价差率（前收） ↑';
  }
  filter.addEventListener('input',render);
  reset.onclick=()=>{rows=structuredClone(base);isLive=false;message.textContent='已返回前收快照；历史分位固定按前收计算。';render();};
  refresh.onclick=async()=>{
    refresh.disabled=true;reset.disabled=true;message.textContent='正在请求实时行情…';
    const endpoint=location.port==='30006'?'/api/commodity-spot/refresh':'http://127.0.0.1:30006/api/commodity-spot/refresh';
    try{
      const response=await fetch(endpoint,{cache:'no-store',signal:AbortSignal.timeout(45000)});
      if(!response.ok)throw new Error('行情服务返回 '+response.status);
      const payload=await response.json();if(payload.error)throw new Error(payload.error);
      if(payload.date!==block.date)throw new Error('网页与行情服务的前收日期不同，请先重新加载网页');
      if(!Array.isArray(payload.rows)||payload.rows.length!==base.length)throw new Error('行情结果不完整');
      const baseline=new Map(base.map(r=>[r.product,r]));
      if(new Set(payload.rows.map(r=>r.product)).size!==base.length||payload.rows.some(r=>{
        const b=baseline.get(r.product);return !b||b.contract!==r.contract||b.spot!==r.spot||b.close!==r.close;
      }))throw new Error('前收快照已发生修订，请重新加载网页');
      rows=payload.rows.map(r=>({...r,percentile:baseline.get(r.product).percentile,samples:baseline.get(r.product).samples}));
      isLive=true;const missing=rows.filter(r=>r.rate==null).length;
      message.textContent=`刷新于 ${payload.refreshed_at} · ${rows.length-missing}个品种返回可比行情`+(missing?`，${missing}个暂不可用（显示为—）`:'')+'。分位保持前收值。';render();
    }catch(error){
      // Remove earlier live quotes on failure; keep only clearly labelled closing values.
      rows=structuredClone(base);isLive=false;render();
      message.textContent='实时刷新失败，已显示前收快照。'+error.message+'。请确认本机行情服务已启动，或点击下方“本机实时监控”。';
    }finally{refresh.disabled=false;reset.disabled=false;}
  };
  render();return root;
};
