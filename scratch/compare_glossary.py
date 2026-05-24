"""
Compare glossary definitions: JSON (paraphrased) vs PDF (verbatim).
Outputs a side-by-side comparison for each term.
"""
import json
import re
import html
import sys

sys.stdout.reconfigure(encoding='utf-8')

# PDF glossary definitions (extracted from online_pdf_full_text.txt lines 3259-3417)
pdf_glossary = {
    "Charitable Donations": "means provision of cash, equipment, Member Company product or relevant third party product, for exclusive use for charitable or philanthropic purposes and/or to benefit a charitable or philanthropic cause. Charitable Donations may only be made to bona fide charities or other non-profit entities or bodies whose main objects are genuine charitable or philanthropic purposes.",
    
    "Clinical Research": "a type of research that studies tests and treatments and evaluates their effects on human health outcomes. This includes clinical investigations or interventional and non-interventional clinical performance studies where people volunteer to take part in order to test medical interventions including drugs, cells and other biological products, surgical procedures, radiological procedures, devices, behavioural treatments and preventive care.",
    
    "Company Events": "means activities of any type that are planned, budgeted, managed and executed in whole or in part by or on behalf of Member Companies to fulfil a legitimate, documented business need of the Member Company, including but not limited to a legitimate business need to interact with customers including Healthcare Professionals and/or Healthcare Organisations.",
    
    "Conference Vetting System (CVS)": "means the centralised decision-making process which reviews the compliance of Third Party Organised Educational Events with the Code and which is managed independently of MedTech Europe under the supervision of the MedTech Europe Compliance Panel. For more information see: http://www.ethicalmedtech.eu.",
    
    "Code": "means this MedTech Europe Code of Ethical Business Practice (including the incorporated Questions and Answers), the Disclosure Guidelines, and Part 2: Dispute Resolution Principles.",
    
    "Consulting Arrangement": "means any provision of service by a Healthcare Professional or Healthcare Organisation for or on behalf of a Member Company. Consulting arrangements include, but are not limited to marketing and Clinical Research activities, providing technical expertise for the development, testing, etc. of Medical Technology, providing feedback in post-market evaluations and market research, providing speaking services at Events, teaching other Healthcare Professionals, providing training on how to use the Member Company's Medical Technology, participating in research-related meetings, etc.",
    
    "Delegate": "means Healthcare Professionals that attend an Event neither as Faculty, nor as Healthcare Professionals providing services to Member Companies for the specific Event.",
    
    "Disclosure Guidelines": "means the Code provisions setting out the public disclosure requirements under the Code.",
    
    "Demonstration Products (Demos)": "means either single-use or multiple-use products provided free of charge by or on behalf of a Member Company to HCOs or HCPs, who are equipped and qualified to use them. Demos are supplied solely for the purpose of demonstrating safe and effective use and appropriate functionality of a product and are not intended for clinical use. Demos do not include the following: Samples; Evaluation Products; Products provided at no charge as part of a Charitable Donation or as part of a Research or Educational Grant; or Products provided at no additional charge as part of the overall purchase price in a commercial supply arrangement, e.g. as part of an agreed discount arrangement, or as substitute products provided pursuant to a warranty agreement.",
    
    "Educational Grants": "means provision of funding, Member Company or third party products or other in kind support to a Healthcare Organisation by or on behalf of a Member Company solely for the support and advancement of genuine medical education of Healthcare Professionals, patients and/or the public on clinical, scientific and/or healthcare topics relevant to the therapeutic areas in which the Member Company is interested and/or involved and where such support is provided solely for a specified intended purpose within this category.",
    
    "Employer Notification": "means the prior written notification provided to a Healthcare Organisation (e.g. hospital administration), a Healthcare Professional's superior or other locally-designated competent authority of any interaction, collaboration or other matter concerning any Member Company and any Healthcare Professional, the purpose and/or scope of which requires notification under this Code.",
    
    "Entertainment": "Entertainment includes, but is not limited to, dancing or arrangements where live music is the main attraction, sight-seeing trips, theatre excursions, sporting events (e.g. skiing, golf or football match) and other leisure arrangements. For the avoidance of doubt, incidental, background music shall not constitute Entertainment.",
    
    "Evaluation Products": "means either single-use or multiple-use products and/or equipment provided free of charge to a healthcare institution by or on behalf of a Member Company for purposes of obtaining defined, evaluative user feedback over a defined period of use when used within the scope of their intended purpose, as per the authorisation in the country where the supply occurs. Evaluation Products do not include the following: Demos; Samples; Products provided at no charge as part of a Charitable Donation or as part of a Research or Educational Grant; or Products provided at no additional charge as part of the overall purchase price in a commercial supply arrangement, e.g. as part of an agreed discount arrangement, or as substitute products provided pursuant to a warranty agreement.",
    
    "Event": "means either a Company Event or Third Party Organised Educational Event.",
    
    "Faculty": "means a podium speaker, moderator and/or chair, who presents during an Event. Poster- and abstract-presenters are not considered to be Faculty.",
    
    "Fair Market Value (FMV)": "means the value of the specified services (or products, if applicable) which would be paid by the Member Company to the other party (for example a Healthcare Professional or a Healthcare Organisation), each dealing at arm's length in an open and unrestricted market, and when neither party is under any compulsion to buy or sell, and both parties have reasonable knowledge of the relevant facts.",
    
    "Financial Hardship": "means in relation to a Healthcare Organisation extreme and unavoidable financial distress resulting from matters outside the Healthcare Organisation's control where the Healthcare Organisation is unable to operate and where patient care is consequently jeopardised. Financial distress resulting in whole or in part from mismanagement of the Healthcare Organisation's funds or other matters within its control is not considered to be Financial Hardship. Financial Hardship must be documented and objectively substantiated.",
    
    "Grants": "means either an Educational Grant or a Research Grant, or both.",
    
    "Guests": "means spouses, partners, family or guests of Healthcare Professionals, or any other person who does not have a bona fide professional interest in the information being shared at an Event.",
    
    "Healthcare Organisation (HCO)": "means any legal entity or body (irrespective of its legal or organisational form) that is a healthcare, medical or scientific association or organisation which may have a direct or indirect influence on the prescription, recommendation, purchase, order, supply, utilisation, sale or lease of Medical Technologies or related services such as a hospital or group purchasing organisation, clinic, laboratory, pharmacy, research institution, foundation, university or other teaching institution or learned or professional society (except for patient organisations); or through which one or more Healthcare Professionals provide services.",
    
    "Healthcare Professional (HCP)": "means any individual (with a clinical or non-clinical role; whether a government official, or employee or representative of a government agency or other public or private sector organisation; including but not limited to, physicians, nurses, technicians, laboratory scientists, researchers, research co-ordinators or procurement professionals) that in the course of their professional activities may directly or indirectly purchase, lease, recommend, administer, use, supply, procure or determine the purchase or lease of, or who may prescribe Medical Technologies or related services. This definition does not include a purchasing professional employed in the retail sector unless that individual purchaser arranges for the purchase of Member Companies' Medical Technologies or related services for or on behalf of medical or clinical personnel. For example, if a Member Company's Medical Technologies or related services are sold as part of the common merchandise of the retail outlet, interactions between the Member Company and the purchasing professional do not fall within the Code. However, where the Member Company's Medical Technologies or related services are sold in a retail pharmacy (even if this is located within a supermarket unit), interactions between the Member Company and the responsible purchasing professional will fall within the Code.",
    
    "In kind": "means the provision of Grants, Charitable Donations and other types of support in the form of goods or services other than money, including the provision of labour, lent or donated goods, or lent or donated services (e.g. catering services for Events, provision of venue space, company products and other services).",
    
    "Legitimate Business Need": "means a current and actual business objective pursued by a Member Company such as the advancement of medical education, Clinical Research and/or the safe and effective use of the Member Company's Medical Technology. Engaging a Healthcare Professional or a Healthcare Organisation for the purpose of influencing the prescription, recommendation, purchase, order, supply, utilisation, sale or lease of Medical Technologies or related services directly or indirectly by a Healthcare Professional or Healthcare Organisation is never deemed a Legitimate Business Need.",
    
    "Medical Technology or Medical Technologies": "Within the framework of the Code, Medical Technology refers to Medical Devices and In Vitro Diagnostics medical devices as defined in Regulation (EU) 2017/745 of the European Parliament and of the Council of 5 April 2017 on medical devices and Regulation (EU) 2017/746 of the European Parliament and of the Council of 5 April 2017 on in vitro diagnostic medical devices, as amended from time to time.",
    
    "Members": "means all full and associate corporate members (\"Member Companies\") of MedTech Europe as well as full and associate national association members of MedTech Europe (\"Member Associations\"), as defined in the MedTech Europe statutes and as applicable and amended from time to time.",
    
    "Preceptorship": "means a type of clinician-to-clinician training funded by a Member Company where the supervising clinician oversees the procedural training of the trainee clinician and the trainee does not have primary responsibility for the patient undergoing the procedure.",
    
    "Proctorship": "means a type of clinician-to-clinician training funded by a Member Company where the trainee clinician performs a procedure under the supervision of another clinician and where the trainee clinician has primary responsibility for the patient undergoing the procedure.",
    
    "Professional Conference Organiser (PCO)": "a for-profit company or organisation which specialises in the management of congresses, conferences, seminars and similar events.",
    
    "Product and Procedure Training and Education Event": "means a type of Company Event that is primarily intended to provide Healthcare Professionals with genuine education, including information and/or training on: The safe and effective use of Medical Technologies, therapies and/or related services, and/or; The safe and effective performance of clinical procedures, and/or; Related disease areas. In all cases the information and/or training directly concern a Member Company's Medical Technologies, therapies and/or related services.",
    
    "Research Grants": "means the provision by or on behalf of a Member Company of funding, products/equipment and/or In Kind services to any organisation that conducts research which is made for the sole purpose of supporting the development or furtherance of clearly specified bona fide, scientifically valid and legitimate research by the recipient the purpose of which is to advance medical, scientific and healthcare knowledge, Medical Technologies and/or clinical techniques designed to improve patient outcomes.",
    
    "Sales, Promotional and Other Business Meetings": "means any type of Company Event the objective of which is to effect the sale and/or promotion of a Members Company's medical technologies and/or related services, including meetings to discuss product features, benefits and use and/or commercial terms of supply.",
    
    "Samples": "means single-use or multiple-use products provided free of charge by or on behalf of a Member Company to HCOs or HCPs who are equipped and qualified to use them in order to enable HCPs to familiarise themselves with the products in clinical use. Samples do not include the following: Demos; Evaluation Products; products provided at no charge as part of a Charitable Donation or as part of a Research or Educational Grant; or products provided at no additional charge as part of the overall purchase price in a commercial supply arrangement, e.g. as part of an agreed discount arrangement, or as substitute products provided pursuant to a warranty agreement.",
    
    "Scholarships and Fellowships": "means Educational Grants provided to a Healthcare Organisation by or on behalf of a Member Company to support fellowships or scholarships offered by the Healthcare Organisation. Scholarships in this context means an Educational Grant provided to support a medical school undergraduate whereas a fellowship is a period of intensive training for post-graduate physicians in a chosen clinical sub-specialty (e.g. medical training after a residency). \"Scholars\" and \"Fellows\" shall be understood accordingly.",
    
    "Third Party Intermediary": "means any legal entity or person that markets, sells, promotes or otherwise brings to end-users Member Companies' products or related services, and may include distributors, wholesalers, distribution or sales agents, marketing agents, brokers, commissionary commercial agents and independent sales representatives.",
    
    "Third Party Organised Educational Events": "means activities of any type that are planned, budgeted, managed and executed in whole or in part by or on behalf of a person or entity other than a Member Company to fulfil Healthcare Professional medical educational needs.",
    
    "Third Party Organised Educational Conferences": "means a type of Third Party Organised Educational Event that is a genuine, independent, educational, scientific, or policy-making conference organised to promote scientific knowledge, medical advancement and/or the delivery of effective healthcare and is consistent with relevant guidelines established by professional societies or organisations for such educational meetings. These typically include conferences organised by national, regional, or specialty medical associations/societies, hospitals, Professional Conference Organisers (PCOs), patients organisations or accredited continuing medical education providers.",
    
    "Third Party Organised Procedure Training": "means a type of Third Party Organised Educational Event that is primarily intended to provide Healthcare Professionals with information and training on the safe and effective performance of one or more clinical procedures in circumstances where the information and training concern: Specific therapeutic, diagnostic or rehabilitative procedures, namely clinical courses of action, methods or techniques (rather than the use of Medical Technologies); and Practical demonstrations and/or training for HCPs, where the majority of the training programme is delivered in a clinical environment. For the avoidance of doubt, Proctorship and Preceptorship are not considered to constitute Third Party Organised Procedure Training.",
    
    "Virtual Event": "A Virtual Event is a Third-Party Organised or Company Organised Event that is characterised by the participation of Healthcare Professionals Delegates who attend exclusively remotely. As a result, a Virtual Event is not connected in any way with a physical Third Party Organised Educational Event. For example, the filming of presentations, discussions, etc. taking place during a Third Party Organised Educational Event (\"hybrid\" events), and their broadcasting to audiences not present at the physically attended Event—whether contemporaneously or after the Event—do not qualify as a Virtual Event, and therefore need to comply with all requirements of (in person) Third Party Organised Events.",
}

# Now extract JSON glossary definitions
with open(r'c:\Users\dicmi\Documents\GitHub\MTE-Code-App\src\data\codeData.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Find glossary chapter
glossary_chapter = None
for ch in data['chapters']:
    if ch['id'] == 'glossary':
        glossary_chapter = ch
        break

if not glossary_chapter:
    print("ERROR: Glossary chapter not found!")
    sys.exit(1)

# Extract definitions from legalText
legal_text = glossary_chapter['sections'][0]['legalText']

# Strip HTML to get plain text definitions
def strip_html(text):
    text = re.sub(r'\\n', '\n', text)
    text = re.sub(r'<br\s*/?>', '\n', text)
    text = re.sub(r'<[^>]+>', '', text)
    text = html.unescape(text)
    text = re.sub(r'[ \t]+', ' ', text)
    return text.strip()

plain_legal = strip_html(legal_text)

# Parse individual definitions from the JSON
json_defs = {}
lines = plain_legal.split('\n')
current_term = None
current_def = []

for line in lines:
    line = line.strip()
    if not line:
        continue
    
    # Check if this starts a new definition (bold term followed by colon)
    match = re.match(r'^([A-Z][^:]+):\s*(.*)$', line)
    if match and len(match.group(1)) < 80:
        if current_term:
            json_defs[current_term] = ' '.join(current_def).strip()
        current_term = match.group(1).strip()
        current_def = [match.group(2).strip()]
    else:
        if current_term:
            current_def.append(line)

if current_term:
    json_defs[current_term] = ' '.join(current_def).strip()

# Compare
print("# Glossary Verbatim Comparison: JSON vs PDF")
print()
print(f"PDF has {len(pdf_glossary)} definitions")
print(f"JSON has {len(json_defs)} definitions")
print()

# Check for missing terms
pdf_terms = set(pdf_glossary.keys())
json_terms = set(json_defs.keys())

# Normalize for matching
def normalize_term(t):
    return re.sub(r'\s+', ' ', t).strip().lower()

pdf_term_map = {normalize_term(k): k for k in pdf_terms}
json_term_map = {normalize_term(k): k for k in json_terms}

# Missing from JSON
missing = set(pdf_term_map.keys()) - set(json_term_map.keys())
if missing:
    print("## Terms in PDF but missing from JSON:")
    for m in sorted(missing):
        print(f"  - {pdf_term_map[m]}")
    print()

# Extra in JSON
extra = set(json_term_map.keys()) - set(pdf_term_map.keys())
if extra:
    print("## Terms in JSON but not in PDF:")
    for e in sorted(extra):
        print(f"  - {json_term_map[e]}")
    print()

# Compare definitions
print("## Definition Comparisons")
print()

issues_found = 0
for pdf_term, pdf_def in sorted(pdf_glossary.items()):
    norm_term = normalize_term(pdf_term)
    if norm_term not in json_term_map:
        continue
    
    json_term = json_term_map[norm_term]
    json_def = json_defs.get(json_term, "")
    
    # Normalize for comparison
    pdf_norm = re.sub(r'\s+', ' ', pdf_def).strip().lower()
    json_norm = re.sub(r'\s+', ' ', json_def).strip().lower()
    
    if pdf_norm == json_norm:
        continue  # Match!
    
    issues_found += 1
    
    # Calculate similarity
    pdf_len = len(pdf_norm)
    json_len = len(json_norm)
    pct = round(json_len / pdf_len * 100) if pdf_len > 0 else 0
    
    severity = "PARAPHRASED" if pct < 70 else "TRUNCATED" if pct < 95 else "MINOR DIFF"
    
    print(f"### {pdf_term} [{severity}] ({json_len}/{pdf_len} chars, {pct}%)")
    print()
    print("**JSON (current):**")
    print(f"> {json_def}")
    print()
    print("**PDF (correct):**")
    print(f"> {pdf_def}")
    print()
    print("---")
    print()

if issues_found == 0:
    print("All definitions match! (This is unlikely given the user's observation)")
else:
    print(f"\n**Total: {issues_found} definitions differ between JSON and PDF.**")
