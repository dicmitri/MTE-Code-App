import json
import re
import html
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

def extract_words(text):
    if not text: return []
    text = re.sub(r'<[^>]+>', ' ', text)
    text = html.unescape(text)
    text = re.sub(r'^Q&A\s+\d+:\s*', '', text)
    # Split into words, keeping only alphanumeric
    words = [re.sub(r'[^a-zA-Z0-9]', '', w).lower() for w in text.split()]
    return [w for w in words if w]

json_path = os.path.join('src', 'data', 'codeData.json')
with open(json_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

json_words = []
for chapter in data['chapters']:
    if chapter.get('id') in ['changelog']: continue # Ignore changelog
    for section in chapter.get('sections', []):
        json_words.extend(extract_words(section.get('legalText', '')))
        for qa in section.get('qas', []):
            json_words.extend(extract_words(qa.get('q', '')))
            json_words.extend(extract_words(qa.get('a', '')))

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
pdf_words = extract_words(pdf_clean_text)

# We want to find a sequence of words in pdf_words (e.g. > 15 words) that is completely missing in json_words.
# To do this efficiently, we can use a rolling window or SequenceMatcher.
from difflib import SequenceMatcher

sm = SequenceMatcher(None, pdf_words, json_words)
missing_in_json = []

for tag, i1, i2, j1, j2 in sm.get_opcodes():
    if tag == 'delete' or tag == 'replace':
        # PDF has words from i1 to i2 that are NOT in JSON (or replaced by JSON j1 to j2)
        pdf_chunk = pdf_words[i1:i2]
        if len(pdf_chunk) > 20: # arbitrary threshold for a "missing paragraph"
            missing_in_json.append((i1, i2, pdf_chunk))

print(f"Found {len(missing_in_json)} large chunks of text in PDF missing from JSON:")
for i1, i2, chunk in missing_in_json:
    print(f"Index {i1}-{i2}: {' '.join(chunk[:10])}... {' '.join(chunk[-10:])} (Len: {len(chunk)})")
