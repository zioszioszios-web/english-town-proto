"""Parse numbered TSL 1.2 rows, retaining source spelling and excluding lower-level words."""
from pathlib import Path
import hashlib,json,re,unicodedata
ROOT=Path(__file__).resolve().parent.parent
SHA='935b89bdad27755b91f5b1b49b755af3dd7ee60c50d7b899f36520691c88eea8'
def normalize(word):
 word=''.join(c for c in unicodedata.normalize('NFKD',word) if not unicodedata.combining(c))
 return re.sub(r'\s+',' ',word.strip().replace('-', '').replace(chr(8217),chr(39))).casefold()
def build():
 source=ROOT/'data/sources/tsl-1.2-alphabetized.txt'
 if hashlib.sha256(source.read_bytes()).hexdigest()!=SHA:raise ValueError('TSL source hash mismatch')
 entries=[{'number':int(m[1]),'original':m[2]} for line in source.read_text(encoding='utf-8-sig').splitlines() if (m:=re.fullmatch(r'(\d+)\.\s+(.+)',line))]
 if len(entries)!=1250 or [e['number'] for e in entries]!=list(range(1,1251)):raise ValueError('TSL row numbering mismatch')
 lower={normalize(w['word']) for level in [1,2,3] for w in json.loads((ROOT/f'src/data/words/lv{level}.json').read_text(encoding='utf-8'))}
 # Recognized alternate spellings, not synonyms or freely generated inflections.
 for a,b in [('adviser','advisor'),('doughnut','donut')]:
  if normalize(a) in lower:lower.add(normalize(b))
 for item in json.loads((ROOT/'data/sources/ceec-raw-groups.json').read_text(encoding='utf-8'))['entries']:
  match=re.fullmatch(r'([a-z]+)\(s\)',item['entry'])
  if match and {normalize(match[1]),normalize(match[1]+'s')}&lower:lower.update([normalize(match[1]),normalize(match[1]+'s')])
 selected=[];excluded=[]
 for item in entries:
  key=normalize(item['original'])
  if key in lower:excluded.append(item)
  else:
   canonical=''.join(c for c in unicodedata.normalize('NFKD',item['original']) if not unicodedata.combining(c)).casefold()
   if not re.fullmatch('[a-z]+(?:-[a-z]+)*',canonical):raise ValueError('Unexpected TSL word: '+canonical)
   selected.append({'word':canonical,**item})
 output={'source':'TSL-1.2','sha256':SHA,'sourceWordCount':1250,'excludedCount':len(excluded),'uniqueWordCount':len(selected),
 'normalization':'Case/hyphen/accent equivalence; explicit adviser/advisor, doughnut/donut and CEEC optional plural spellings; synonyms remain distinct. Accentless canonical spelling retains original text.','excluded':excluded,'words':selected}
 (ROOT/'data/sources/tsl-lv4-raw.json').write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print(json.dumps({k:output[k] for k in ['sourceWordCount','excludedCount','uniqueWordCount']}))
 print(', '.join(e['word'] for e in selected[:100]))
if __name__=='__main__':build()
