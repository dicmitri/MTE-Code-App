// Revision-pinned editorial integration; never imported by the application.
import {readFileSync,writeFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
const base=read('./curated-base.json');
// Each row was reviewed for general-English meaning by the integrator.
// family | source unit(s) | sources ; targets | semantic explanation
const rows=`
people|code/glossary|general practitioner,family doctor;physician,healthcare professional|Specific medical roles, without broadening other health professions to physicians.
documentation|code/intro,code/ch4,code/ch10,code/annex4|paper trail,audit trail;documentation,records|A traceable documentary record; not a permission or mandatory document list.
documentation|code/intro,code/ch10|record keeping,recordkeeping,keeping records;documentation,records|Maintaining documented evidence.
documentation|code/annex4|supporting paperwork,documentary evidence,supporting documents;documentation|Documents supporting verification.
documentation|code/ch4,code/ch5,code/ch10|put in writing,written record;documentation,written|Written documentation; does not imply approval.
documentation|code/annex4|proof of attendance,attendance certificate;attendance proof|Evidence of participation, without claiming any particular document is required.
documentation|code/annex4|expense receipts,proof of spending;documentation|Specific evidence of expenditure.
documentation|code/annex4|proof of travel,travel documentation;travel proof|Evidence of travel; tickets are one form.
documentation|code/annex4|spending breakdown,expense breakdown;budget breakdown|A breakdown of expenditure.
documentation|code/annex4|enrolment certificate,proof of enrolment,proof of enrollment;enrollment|Evidence of enrolment.
approvals|code/ch4,code/ch5|sign off,signoff,give the go-ahead;approval,approve|Ordinary approval language, distinct from notification.
approvals|code/ch1,code/ch5|advance notice,prior notice;notification|Notice given beforehand, without implying consent.
approvals|code/ch4|pre approval,prior authorisation,prior authorization;approval|Approval obtained in advance.
approvals|code/ch4|independent review,impartial review;review process|A review independent of interested decision makers; no department-specific rule.
diligence|code/ch10|background check,background screening,integrity check,pre engagement checks;due diligence|Pre-engagement investigation is a due-diligence activity.
diligence|code/ch10|vetting a distributor,screen a distributor;due diligence|Specific business-partner screening; not medical screening.
diligence|code/ch10|supplier screening,partner screening,third party screening;due diligence|Commercial counterparty due diligence.
diligence|code/ch10|risk analysis,risk review,risk evaluation;risk assessment|Reviewing and evaluating risks.
diligence|code/ch10|ongoing compliance checks,compliance monitoring,continuing oversight;monitoring,oversight|Continuing review of compliance.
diligence|code/ch10|supervision;oversight|Supervision is oversight, without automatically meaning audit.
diligence|code/ch10|contractual duties,contract duties,contractual requirements;contractual obligations,obligations|Obligations arising from a contract.
diligence|code/ch10|terminate a contract,end a contract,contract cancellation;termination|Ending a contractual relationship.
diligence|code/ch10|remedial action,remediation,remedial measures;corrective action,corrective measures|Action to correct a problem, not necessarily a sanction.
procurement|code/ch4,code/annex2|competitive bidding,tendering,bidding process;purchasing arrangements|A competitive purchasing procedure; not necessarily public procurement.
procurement|code/ch4,code/annex2|public tender,government procurement;public procurement|Public-sector purchasing only.
procurement|code/ch4|purchasing process,buying process;procurement|General purchasing, without classifying it as public.
procurement|code/ch4|price reduction;price concession|Reduced price; no implication that funding is a discount.
procurement|code/ch4|added value offer;value adds|Additional commercial value, not an educational grant.
finance|code/ch4,code/glossary|financial difficulties,financial distress,money problems,financial trouble;financial hardship|Difficulty meeting financial needs, without importing a qualification threshold.
finance|code/ch4|running costs,operating costs,operating expenses,day to day costs;general running|Costs of running an organisation; no eligibility conclusion.
finance|code/ch4|emergency relief;disaster|Aid after emergencies; no permission inferred.
finance|code/ch4|philanthropic donation,charity donation;charitable donation|Donation for charitable purposes.
finance|code/ch4|fundraising dinner,charity fundraiser;fundraiser,fundraising|Fundraising activity; the cause is not assumed from bare fundraiser.
finance|code/ch5|going rate,market rate,market price;fair market value|Ordinary market-based valuation terminology, not a calculation formula.
finance|code/annex2,transparency/dg-annex-2|carrying value,carrying amount;book value|Accounting amount carried on the books.
finance|code/annex2,transparency/dg-annex-2|asset depreciation;depreciation|Decline in asset value.
finance|code/annex2,transparency/dg-annex-2|manufacturing costs,production costs;cost of manufacture|Costs of producing goods.
finance|code/annex2,transparency/dg-annex-2|delivery costs,shipping costs,freight costs;logistics|Transport-related logistics costs.
finance|code/annex2,transparency/dg-annex-2|rental value,equivalent rent; rental equivalent|Value equivalent to rent, not ownership value.
in-kind|code/annex2,transparency/dg-annex-2|non cash contribution,noncash contribution,non monetary contribution;in kind|Contribution made in goods or services rather than money.
in-kind|code/annex2,transparency/dg-annex-2|non cash support,noncash support,goods instead of cash;in kind|Non-monetary support, without equating all free products with grants.
in-kind|code/annex2,transparency/dg-annex-2|donated staff time,donated services,donated equipment;in kind|Donations of time, services, or goods are noncash contributions; no grant classification.
in-kind|code/annex2,transparency/dg-annex-2|staff hours,employee time;hours spent,time spent|Staff time spent providing services.
in-kind|code/annex2,transparency/dg-annex-2|used equipment,second hand equipment;used goods|Equipment is a narrower kind of goods.
in-kind|code/annex2,transparency/dg-annex-2|borrowed equipment,loaned equipment;loaned goods,loan|Temporary possession implies a loan, not evaluation.
research|code/ch6|joint research,research partnership,cooperative research;collaborative research|Research undertaken together.
research|code/ch6|after sale product evaluation,post sale product evaluation;post-market product evaluation|Evaluation after commercial sale, without equating it with clinical research.
research|code/ch6|user feedback,product user feedback;feedback|Feedback from product users; preserves product context where possible.
research|code/ch6|study grant;research grant|A grant to support a research study, not all research funding.
research|code/ch7|royalty income,licensing royalties;royalty|Income from licensing rights, without claiming every licence fee is a royalty.
research|code/ch7|inventor payment;royalty,compensation|Payment to an inventor can be compensation; royalty is too specific and reviewed below.
research|code/ch7|co development,joint development;development|Collaborative development; no implied ownership.
complaints|code/part2|lodge a grievance,file a grievance,raise a complaint;complaint|Submitting a complaint.
complaints|code/part2|settle a dispute,dispute settlement,amicable settlement;mutual settlement,amicable solution|Resolving a dispute by agreement.
complaints|code/part2|challenge a decision,contest a decision;appeal|Challenging a decision, not a claim that an appeal is available.
complaints|code/part2|unidentified complainant,unnamed complainant;anonymous complaint|A complaint without an identified complainant.
complaints|code/part2|keep confidential,keep private;confidentially,confidential|Privacy of handling, not anonymity of submission.
complaints|code/part2|written rebuke,formal reprimand;written reprimand|A formal written rebuke is a reprimand.
training|code/annex7|practical workshop,skills workshop;practical sessions,hands-on sessions|Training involving practice, without deleting the practical distinction.
training|code/annex7|surgical simulation,simulated surgery;simulation|Simulation of surgery, not live surgery.
training|code/annex7|standalone course,stand alone course;stand-alone|An independent course; no Code event classification.
training|code/ch9|return equipment,equipment return;return|Returning equipment, without implying it was an evaluation product.
training|code/annex7|cadaver training,cadaver lab;cadaver|Cadaver-based learning; not automatically the Code's defined event category.
events|code/ch1|event timetable,conference schedule;programme,agenda|A programme or agenda gives an event's timetable.
events|code/ch1|peak holiday season,holiday season;holiday,touristic season|Seasonal holiday context, without prescribing dates.
events|code/ch1|holiday resort,ski resort,beach resort;resort|Specific resorts, without implying disallowed venues.
events|code/ch2|online seminar;virtual event,online|A seminar held online.
disclosure|transparency/dg-chapter-3|publication deadline,disclosure deadline,disclosure due date;time of disclosure,time of publication|A deadline is a constraint on publication timing; no date is encoded.
disclosure|transparency/dg-chapter-3|reporting year;reporting period|A period covered by a report; distinct from the year of publication.
disclosure|transparency/dg-chapter-3|annual reporting,yearly disclosure;annual,reporting period|Annual reporting concerns frequency and period, not a fiscal-year assumption.
disclosure|transparency/dg-chapter-2|combined amount,combined total,total amount;aggregate amount,aggregated sum|Amounts combined into a total.
disclosure|transparency/dg-chapter-2|itemized disclosure,itemised payments,itemized payments;itemised|Disclosure broken down into individual items.
disclosure|transparency/dg-chapter-2|subsidiary;affiliate|A subsidiary is an affiliated company; not every affiliate is a subsidiary.
disclosure|transparency/dg-chapter-1|overseas activity,international activity;cross-border|Activity involving a foreign location, without encoding geography.
disclosure|transparency/dg-chapter-1|voluntary reporting,optional disclosure;voluntarily disclose|Optional disclosure rather than a required category.
disclosure|transparency/dg-chapter-1|duplicate reporting,double reporting;same information twice|Reporting the same information twice.
disclosure|transparency/dg-chapter-3|publicly available;publicly accessible|Public availability, without specifying access periods.
disclosure|transparency/dg-chapter-3|broken link,dead link;link|A nonfunctioning link, not a guarantee that search answers how to repair it.
disclosure|transparency/dg-chapter-3|correct published data,amend published data;modify,amendment|Correction is modification of the published data.
disclosure|transparency/dg-chapter-3|data correction,correct an error;amendment,modification|Correcting information, without implying a sanction.
disclosure|transparency/dg-chapter-3|retention period,how long online;retention,remain|How long information is retained or remains available.
disclosure|transparency/dg-chapter-2,transparency/dg-annex-3|calculation method,calculation approach;methodology,calculation rules|The method used to calculate and report data.
disclosure|transparency/dg-chapter-3|currency conversion rate;exchange rate|Rate used for currency conversion.
disclosure|transparency/dg-annex-3|withdraw consent,revoke consent,withdraw permission;consent withdrawal|Withdrawal of consent, without conflating partial consent.
disclosure|transparency/dg-annex-3|partial permission;partial consent|Permission given only in part.
disclosure|transparency/dg-annex-3|cancelled grant,canceled grant; cancellation|Cancellation of a grant; no reporting treatment encoded.
disclosure|transparency/dg-annex-3|several year agreement,long term agreement;multi-year agreements|Multi-year needs several years; long-term may be shorter and is reviewed below.
disclosure|transparency/dg-annex-3|including vat,with vat;vat included|VAT included in a value.
disclosure|transparency/dg-annex-3|excluding vat,without vat;vat excluded,vat exclusive|VAT excluded from a value.
disclosure|transparency/dg-chapter-3|change history,revision history;traceable|History of revisions used to trace versions.
disclosure|transparency/dg-chapter-3|data accuracy,accurate reporting;accuracy|Accuracy of reported data.
finance|code/ch8|raffle,lottery;prize draw|A raffle or lottery awards a prize by chance; no permission or conditions encoded.
disclosure|transparency/dg-chapter-1|extra disclosures,additional reporting;additional transfers,voluntarily disclose|Reject additional transfers as not entailed by extra reporting; refined below.
governance|code/intro|stricter,more restrictive;more stringent|Greater strictness, without overriding local requirements.
equipment|code/ch6|retain equipment ownership,retain ownership,keep ownership;retain title|Keeping legal ownership, without implying a loan is an evaluation.
disclosure|transparency/dg-chapter-2|payment breakdown,individual payment breakdown;itemised|Individual payment details, distinct from an aggregate amount.
disclosure|transparency/dg-chapter-3|downloadable;download|Something available to download; no promise to index its contents.
events|code/ch2|free booth,complimentary booth;booth space|A booth offered without charge remains exhibition booth space; not a grant classification.
events|code/ch1|golf weekend,golf holiday,ski weekend,ski holiday;leisure,entertainment|Recreational holidays; no automatic social-event classification.
equipment|code/ch9|resale,onward sale;on-sale|Offering an item for onward sale; no permission or category equivalence.
complaints|code/admin|recusal,recuse oneself;refrain from participating|Withdrawal from participation, without encoding who must withdraw.
events|code/ch1|fully online event,entirely online event;virtual event|Wholly virtual events, preserving the hybrid distinction.
events|code/ch2|moved online,shifted online;made virtual|Moving an activity into a virtual format.
disclosure|transparency/dg-chapter-2|grant purpose,purpose of grant;purpose,object|A grant has a purpose or object; does not imply that the grant is educational or disclosure is mandatory.
`.trim().split('\n');
const proposals=rows.map((row,i)=>{const [family,units,mapping,reason]=row.split('|');const[from,to]=mapping.split(';').map(a=>a.split(',').map(p=>p.trim()));return{id:'new-'+String(i+1).padStart(3,'0'),family,units:units.split(','),group:{from,to},reason};});
// Remove alternatives that are not entailed by the source phrase in ordinary English.
for(const p of proposals){if(p.group.from.includes('extra disclosures'))p.group.to=['additional','disclosure'];if(p.group.from.includes('inventor payment'))p.group.to=['compensation'];if(p.group.from.includes('long term agreement'))p.group.from=p.group.from.filter(s=>s!=='long term agreement');}
const rejectedIds=new Set(['new-009','new-031','new-049','new-051','new-062','new-065','new-077','new-093']);
for(const p of proposals)p.disposition=rejectedIds.has(p.id)?'refine/remove':'expand';
const groups=[...base.groups,...proposals.filter(p=>!rejectedIds.has(p.id)).map(p=>p.group)];
writeFileSync(new URL('../../src/data/search/phrasebook.json',import.meta.url),'{\n  "groups": [\n'+groups.map(g=>'    '+JSON.stringify(g)).join(',\n')+'\n  ]\n}\n');
writeFileSync(new URL('./accepted-additions.json',import.meta.url),JSON.stringify({base:'56b5f0ef982f413a10fd85d0c1c76b3070cad84a',note:'Initial curated proposals; acceptance and query evidence are completed in the evaluation report.',proposals},null,2)+'\n');
console.log({groups:groups.length,proposals:proposals.length});
