"""Extract the official MOE alphabetical lists, never the repeated topical appendix.
Usage: python scripts/parse_moe_words.py
Requires pdfplumber. Original PDF and its SHA-256 are pinned below.
"""
from pathlib import Path
from collections import defaultdict
import hashlib, json, re
import pdfplumber
ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'data/sources/moe-english-curriculum-2018.pdf'
EXPECTED_SHA256 = '83dde39b16dfd3df84e6d9b2abca4cb7e822d925c8b3d1f4cb0df01527fb0abe'
SOURCE_URL = 'https://stv.naer.edu.tw/data/course_outline/pta_18518_3555074_59836.pdf'

def split_entries(text):
    output, start, depth = [], 0, 0
    for index, char in enumerate(text + ','):
        if char == '(': depth += 1
        elif char == ')': depth -= 1
        elif char == ',' and depth == 0:
            entry = re.sub(r'\s+', ' ', text[start:index]).strip()
            if entry: output.append(entry)
            start = index + 1
        if depth < 0: raise ValueError('Unbalanced parentheses in source')
    if depth: raise ValueError('Unbalanced parentheses in source')
    return output

def parse():
    raw = SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest() != EXPECTED_SHA256: raise ValueError('Official source SHA-256 does not match')
    sections = {'basic': [], 'additional': []}
    current = None
    with pdfplumber.open(SOURCE) as pdf:
        for page_index in range(55, 61):
            for line in (pdf.pages[page_index].extract_text() or '').splitlines():
                if line.startswith('表一'): current = 'basic'; continue
                if line.startswith('表二'): current = 'additional'; continue
                if line.startswith('表三'): current = None; break
                if current is None or not re.search('[A-Za-z]', line): continue
                if re.search('[\u4e00-\u9fff]', line): raise ValueError(f'Unexpected Chinese text in alphabetical list: {line}')
                sections[current].append(re.sub(r'^[A-Z]-\s*', ', ', line))
    entries = []
    for section, lines in sections.items():
        for source_entry in split_entries(' '.join(lines)):
            headword = re.sub(r'\s*\([^)]*\)', '', source_entry).strip()
            aliases = [s.strip() for group in re.findall(r'\(([^)]*)\)', source_entry) for s in group.split(',')]
            # Slash spellings remain one source entry; the first form is the display word.
            slash_forms = headword.split('/')
            word = slash_forms[0].replace('’', "'").casefold()
            aliases.extend(slash_forms[1:])
            if not re.fullmatch(r"[a-z]+(?:[ .'-][a-z]*)*\.?", word): raise ValueError(f'Unexpected headword: {source_entry}')
            entries.append({'word': word, 'raw': source_entry, 'section': section, 'aliases': aliases})
    grouped = defaultdict(list)
    for entry in entries: grouped[entry['word']].append(entry)
    words = [{'word': word, 'sourceEntries': values} for word, values in sorted(grouped.items())]
    return {'source': 'MOE-2018-2000', 'url': SOURCE_URL, 'sha256': EXPECTED_SHA256,
            'pdfPages': [56, 61], 'sectionCounts': {key: len(split_entries(' '.join(value))) for key, value in sections.items()},
            'rawEntryCount': len(entries), 'uniqueWordCount': len(words),
            'normalization': 'Case-insensitive headwords; phrases retained; parenthetical forms stored as aliases; first slash form used as headword.',
            'duplicates': {word: [entry['raw'] for entry in values] for word, values in grouped.items() if len(values) > 1},
            'words': words}

if __name__ == '__main__':
    output = parse()
    target = ROOT / 'data/sources/moe-lv1-raw.json'
    target.write_text(json.dumps(output, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({key: output[key] for key in ['sectionCounts', 'rawEntryCount', 'uniqueWordCount', 'duplicates']}, ensure_ascii=False))
