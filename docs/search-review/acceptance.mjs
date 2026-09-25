// Human-selected answer passages and contexts for new vocabulary; not a permanent test.
import {readFileSync,writeFileSync} from 'node:fs';
import {makeStage,query,BASE} from './review-tools.mjs';
const proposals=JSON.parse(readFileSync(new URL('./accepted-additions.json',import.meta.url))).proposals;
// ID | scope (c/d/both) | contextual suffix | direct answer passage IDs (or exact unit for a blank-title document)
const specs=`
1|c| travel|ch1-5-travel
2|c||annex4-verification-documents,ch10-section-0,intro-aims-and-principles-of-the-code
3|c||annex4-verification-documents,ch10-section-0,intro-aims-and-principles-of-the-code
4|c||annex4-verification-documents
5|c| intermediary|ch10-section-0
6|c||annex4-verification-documents
7|c||annex4-verification-documents
8|c||annex4-verification-documents
9|c||annex4-verification-documents
10|c||annex4-verification-documents
11|c| consulting|ch5-4-disclosure-and-transparency
12|c| employer|definition/employer-notification,ch1-6-transparency
13|c| consulting|ch5-4-disclosure-and-transparency
14|c| grant|ch4-1-general-principles,ch4-1-general-principles-qa-1
15|c||ch10-section-0
16|c||ch10-section-0
17|c||ch10-section-0
18|c||ch10-section-0
19|c||ch10-section-0
20|c| intermediary|ch10-section-0
21|c| intermediary|ch10-section-0
22|c| intermediary|ch10-section-0
23|c||ch10-section-0
24|c||ch4-1-general-principles
25|c||annex2-exclusions,ch4-3-educational-grants-qa-6
26|c| grants|ch4-1-general-principles,ch4-3-educational-grants-qa-6
27|c| grants|ch4-1-general-principles,ch9-1-general-principles
28|c||ch4-1-general-principles,ch4-3-educational-grants-qa-8
29|c||definition/financial-hardship,ch4-2-charitable-donations
30|c| hospital|ch4-2-charitable-donations-qa-1
31|c||ch4-2-charitable-donations-qa-2
32|c||ch4-2-charitable-donations,definition/charitable-donations
33|c||ch4-2-charitable-donations
34|c| consulting|ch5-3-compensation-and-fair-market-value,definition/fair-market-value-fmv
35|b||annex2-value-of-in-kind-contributions
36|b||annex2-value-of-in-kind-contributions
37|b||annex2-value-of-in-kind-contributions
38|b||annex2-value-of-in-kind-contributions
39|b||annex2-value-of-in-kind-contributions
40|b||annex2-what-is-an-in-kind-educational-grant,annex2-types-of-in-kind-educational-grant
41|b||annex2-what-is-an-in-kind-educational-grant,annex2-types-of-in-kind-educational-grant
42|b||annex2-what-is-an-in-kind-educational-grant,annex2-types-of-in-kind-educational-grant
43|b||annex2-types-of-in-kind-educational-grant,annex2-value-of-in-kind-contributions
44|b||annex2-value-of-in-kind-contributions
45|b||annex2-value-of-in-kind-contributions
46|c||ch6-4-collaborative-research,ch6-4-collaborative-research-qa-1,ch6-4-collaborative-research-qa-2
47|c||ch6-2-member-company-post-market-product-evaluation
48|c||ch6-2-member-company-post-market-product-evaluation,definition/evaluation-products
49|c||ch6-3-third-party-initiated-research-research-grants,definition/research-grants
50|c||ch7-section-0
52|c| royalty|ch7-section-0
53|c||part2-2-complaint-handling-procedure,part2-3-dispute-resolution-principles-and-procedures
54|c||part2-1-general-principles,part2-3-dispute-resolution-principles-and-procedures
55|c||part2-3-dispute-resolution-principles-and-procedures
56|c||part2-3-dispute-resolution-principles-and-procedures
57|c| complaint|part2-2-complaint-handling-procedure
58|c||part2-4-sanctions
59|c||annex7-criteria-for-tppt-determination
60|c||annex7-criteria-for-tppt-determination
61|c||annex7-criteria-for-tppt-determination
63|c||annex7-criteria-for-tppt-determination
64|c||ch1-1-event-programme
65|c||ch1-2-event-location-and-venue,ch1-2-event-location-and-venue-qa-2
66|c||ch1-2-event-location-and-venue,ch1-2-event-location-and-venue-qa-2
67|c||ch1-7-virtual-events,definition/virtual-event
68|d||dg-chapter-3-2-time-of-disclosure
69|d||dg-chapter-3-1-reporting-period
70|d||dg-chapter-3-1-reporting-period
71|d||dg-chapter-2-2-aggregate-disclosure
72|d||dg-chapter-2-2-aggregate-disclosure
73|d| reports|dg-chapter-2-1-general-obligation-qa-1
74|d| activities|dg-annex-3-structure
75|d||dg-chapter-1-1-scope-qa-3
76|d||dg-chapter-1-2-applicability-of-these-disclosure-guidelines
77|d| disclosures|dg-chapter-3-4-platform-of-disclosure,dg-chapter-3-6-retention-and-modification-of-the-disclosures
78|d| disclosure|dg-chapter-3-4-platform-of-disclosure
79|d||dg-chapter-3-6-retention-and-modification-of-the-disclosures,dg-chapter-3-6-retention-and-modification-of-the-disclosures-qa-1
80|d| disclosure|dg-chapter-3-6-retention-and-modification-of-the-disclosures,dg-chapter-3-6-retention-and-modification-of-the-disclosures-qa-1
81|d||dg-chapter-3-6-retention-and-modification-of-the-disclosures
82|d||dg-chapter-2-4-methodology,dg-annex-3-structure
83|d||dg-chapter-3-3-template-and-language-of-disclosure-qa-1
84|d||dg-annex-3-structure
85|d||dg-annex-3-structure
86|d||dg-annex-3-structure
87|d||dg-annex-3-structure
88|d||dg-annex-3-structure
89|d||dg-annex-3-structure,dg-annex-2-value-of-in-kind-contributions
90|d||dg-chapter-3-6-retention-and-modification-of-the-disclosures-qa-1
91|d||dg-chapter-3-4-platform-of-disclosure
92|c||ch8-section-0
94|c| local rules|intro-promoting-an-ethical-industry
95|c||ch6-2-member-company-post-market-product-evaluation
96|d||dg-chapter-2-2-aggregate-disclosure
97|d| reports|dg-chapter-3-4-platform-of-disclosure-qa-1
98|c||ch2-1-third-party-organised-educational-conferences,ch2-1-third-party-organised-educational-conferences-qa-2
99|c||ch1-1-event-programme,ch1-1-event-programme-qa-2,definition/entertainment
100|c| demonstration|ch9-2-demonstration-products-demos,definition/demonstration-products-demos
101|c| complaints|admin-3-medtech-europe-compliance-panel
102|c||ch1-7-virtual-events,definition/virtual-event
103|c| training|ch2-2-third-party-organised-procedure-training
104|d||dg-chapter-2-3-optional-object-specification
`.trim().split('\n').map(line=>{const[id,scope,suffix,ids]=line.split('|');return{id:'new-'+id.padStart(3,'0'),scope,suffix,ids:ids.split(',')};});
const stages=['original','fixes','expanded'].map(name=>makeStage(name));
const runs=[];
for(const p of proposals.filter(p=>p.disposition==='expand')){
 const spec=specs.find(s=>s.id===p.id);if(!spec)throw Error('Missing review specification '+p.id);
 for(const scope of spec.scope==='b'?['code','transparency']:[spec.scope==='c'?'code':'transparency']){
  const expectedIds=spec.ids.map(id=>scope==='code'?'code/'+id:'transparency/disclosure-guidelines/'+id.replace(/^annex2-/,'dg-annex-2-'));
  for(const id of expectedIds)if(!stages[0].indexes[scope].docs.some(d=>d.id===id))throw Error('Unknown answer '+id);
  for(const source of p.group.from){
   const q=source+spec.suffix;
   const measurements=stages.map(stage=>{const r=query(stage,scope,q);const ids=r.results.map(h=>h.id);const n=ids.findIndex(id=>expectedIds.includes(id));return{stage:stage.name,rank:n<0?null:n+1,hitAt3:n>=0&&n<3,top:ids.slice(0,5),concepts:r.concepts};});
   runs.push({proposal:p.id,family:p.family,scope,source,query:q,expectedIds,measurements});
  }
 }
}
const summary={sources:new Set(runs.map(r=>r.source)).size,runs:runs.length,stages:stages.map(s=>({name:s.name,hitAt3:runs.filter(r=>r.measurements.find(m=>m.stage===s.name).hitAt3).length}))};
const failures=runs.filter(r=>!r.measurements[2].hitAt3).map(({proposal,query,scope,measurements})=>({proposal,query,scope,rank:measurements[2].rank,top:measurements[2].top}));
writeFileSync(new URL('./acceptance.json',import.meta.url),JSON.stringify({base:BASE,note:'Answer passages and contexts selected from actual publication text, outside CI. Bare triggers are separately exercised in trigger-audit.json. Each source spelling is tested even when normalization shares its key.',summary,failures,runs},null,2)+'\n');
console.log(JSON.stringify({summary,failures},null,2));
