import json
import re
import html
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

def normalize_text(text):
    if not text: return ""
    text = re.sub(r'<[^>]+>', ' ', text)
    text = html.unescape(text)
    # Remove Q&A prefix
    text = re.sub(r'^Q&A\s+\d+:\s*', '', text)
    text = re.sub(r'[^a-zA-Z0-9]', '', text).lower()
    return text

json_path = os.path.join('src', 'data', 'codeData.json')
with open(json_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

pdf_text_raw = open('scratch/online_pdf_full_text.txt', encoding='utf-8').read()

pdf_lines = pdf_text_raw.split('\n')
clean_pdf_lines = []
for line in pdf_lines:
    l = line.strip()
    if l.startswith('--- PAGE'): continue
    if 'MEDTECH EUROPE' in l and 'CODE OF ETHICAL BUSINESS PRACTICE' in l: continue
    if l == 'QUESTIONS AND ANSWERS': continue
    if re.match(r'^\d+$', l): continue
    if l.isupper() and len(l) < 50: continue
    clean_pdf_lines.append(line)

pdf_clean_text = ' '.join(clean_pdf_lines)
pdf_norm = normalize_text(pdf_clean_text)

issues = []

for chapter in data['chapters']:
    ch_id = chapter.get('id', 'unknown')
    for s_idx, section in enumerate(chapter.get('sections', [])):
        legal = section.get('legalText', '')
        if legal:
            legal_norm = normalize_text(legal)
            if legal_norm not in pdf_norm:
                issues.append((f"[{ch_id}] Section {s_idx+1} legalText", legal_norm))
        
        for q_idx, qa in enumerate(section.get('qas', [])):
            q_norm = normalize_text(qa.get('q', ''))
            a_norm = normalize_text(qa.get('a', ''))
            if q_norm and q_norm not in pdf_norm:
                issues.append((f"[{ch_id}] Section {s_idx+1} Q&A {q_idx+1} QUESTION", q_norm))
            if a_norm and a_norm not in pdf_norm:
                issues.append((f"[{ch_id}] Section {s_idx+1} Q&A {q_idx+1} ANSWER", a_norm))

if not issues:
    print("All JSON content perfectly matches the PDF.")
else:
    print(f"Found {len(issues)} issues where JSON content is not in the PDF:")
    for issue, norm in issues:
        print(f"{issue}: {norm[:50]}...{norm[-50:]}")
