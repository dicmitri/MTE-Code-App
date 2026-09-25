// Editorial measurement, not a CI test. Read README.md before interpreting relevance labels.
import { readFileSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { makeStage, query, selfRetrieval, BASE, currentPhrasebook } from './review-tools.mjs';
const input = JSON.parse(readFileSync(new URL('./queries.json', import.meta.url), 'utf8'));
const relevance=JSON.parse(readFileSync(new URL('./retained-relevance.json',import.meta.url),'utf8'));
if(relevance.sourcePinned!==BASE)throw Error('Relevance judgments belong to a different revision.');
if(input.base !== BASE) throw new Error('Review queries belong to a different source revision.');
const output = {base:BASE,queryCount:input.queries.length,stages:[]};
for(const name of ['original','fixes','expanded']) {
 const stage=makeStage(name);
 const rows=input.queries.map(q=>{
   const result=query(stage,q.scope,q.query);
   const ids=result.results.map(h=>h.id);
   const rank=ids.findIndex(id=>q.expectedIds.includes(id));
   const judgmentRecord=relevance.queries.find(r=>r.scope===q.scope&&r.query===q.query);
   const judgments=judgmentRecord?Object.fromEntries(Object.entries(judgmentRecord.judgments).map(([id,j])=>[id,j.relevant?1:0])):{};
   const top=ids.slice(0,5);
   const fullyJudged=top.every(id=>Object.hasOwn(judgments,id));
   return {scope:q.scope,category:q.category,query:q.query,answerRank:rank<0?null:rank+1,hitAt3:rank>=0&&rank<3,
     returnedPrecisionAt5:fullyJudged&&top.length?top.filter(id=>judgments[id]>0).length/top.length:null,
     fixedPrecisionAt5:fullyJudged?top.filter(id=>judgments[id]>0).length/5:null,
     top:result.results.slice(0,5).map(h=>({id:h.id,score:Number(h.score.toFixed(5))})),
     unmatched:result.concepts.filter(c=>!c.matched).map(c=>c.label)};
 });
 const summary={};
 for(const scope of ['code','transparency']) for(const category of ['all','retained','gap','contrast']) {
   const subset=rows.filter(r=>r.scope===scope&&(category==='all'||r.category===category));
   if(!subset.length)continue;
   const judged=subset.filter(r=>r.returnedPrecisionAt5!==null);
   summary[scope+'/'+category]={queries:subset.length,hitAt3:subset.filter(r=>r.hitAt3).length,
      meanReturnedPrecisionAt5:judged.length===subset.length?judged.reduce((s,r)=>s+r.returnedPrecisionAt5,0)/judged.length:null,
      meanFixedPrecisionAt5:judged.length===subset.length?judged.reduce((s,r)=>s+r.fixedPrecisionAt5,0)/judged.length:null,fullyJudged:judged.length};
 }
 const times=[];
 for(let pass=0;pass<6;pass++)for(const q of input.queries){const start=performance.now();query(stage,q.scope,q.query);if(pass)times.push(performance.now()-start);}
 times.sort((a,b)=>a-b);
 output.stages.push({name,selfRetrieval:selfRetrieval(stage),summary,buildMs:stage.buildMs,queryMedianMs:times[Math.floor(times.length*.5)],queryP95Ms:times[Math.floor(times.length*.95)],rows});
}
const original=output.stages[0].rows;
output.regressions=output.stages[2].rows.filter((r,i)=>original[i].hitAt3&&!r.hitAt3).map(r=>({scope:r.scope,query:r.query,answerRank:r.answerRank}));
const pb=currentPhrasebook();const expanded=makeStage('expanded');
const triggers=[];
for(const [groupIndex,g]of pb.groups.entries())for(const source of (g.same||g.from))for(const scope of ['code','transparency']) {
 const r=query(expanded,scope,source);
 const expansions=r.concepts.flatMap(c=>c.members.filter(m=>m.source==='phrasebook'||m.source==='glossary'||m.source==='abbreviation'));
 triggers.push({group:groupIndex,source,scope,top:r.results.slice(0,3).map(h=>h.id),matchedExpansions:expansions.filter(m=>m.matched).map(m=>m.text),unmatched:r.concepts.filter(c=>!c.matched).map(c=>c.label)});
}
output.triggerSummary={groups:pb.groups.length,sources:new Set(pb.groups.flatMap(g=>g.same||g.from)).size,runs:triggers.length,zeroResults:triggers.filter(t=>!t.top.length).length};
output.collisions=Object.fromEntries(Object.entries(expanded.indexes).map(([s,i])=>[s,i.phrasebookStemCollisions||[]]));
writeFileSync(new URL('./evaluation.json',import.meta.url),JSON.stringify(output,null,2)+'\n');
writeFileSync(new URL('./trigger-audit.json',import.meta.url),JSON.stringify({base:BASE,note:'Every authored source exercised in both scopes. A hit alone is not proof of semantic relevance; consult candidate reviews and source coverage.',runs:triggers},null,2)+'\n');
console.log(JSON.stringify({stages:output.stages.map(({name,summary,selfRetrieval,buildMs,queryP95Ms})=>({name,summary,selfRetrieval,buildMs,queryP95Ms})),regressions:output.regressions,triggerSummary:output.triggerSummary},null,2));
