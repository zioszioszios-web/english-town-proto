"""Parse the pinned official NAWL 1.2 file; deduct published lower-level headwords."""
from pathlib import Path
import hashlib,json,re
ROOT=Path(__file__).resolve().parent.parent
SHA='88a99099e10010ea40992cca4a5119102d05a0f2888ee5d43d4c8b4afd597fef'
def normalize(word):
 return re.sub(r'\s+',' ',word.strip().replace('-','').replace(chr(8217),chr(39))).casefold()
def build():
 source=ROOT/'data/sources/nawl-1.2-alphabetized.txt'
 if hashlib.sha256(source.read_bytes()).hexdigest()!=SHA:raise ValueError('NAWL source hash mismatch')
 entries=[{'word':line.strip(),'line':i+1} for i,line in enumerate(source.read_text(encoding='utf-8-sig').splitlines()) if i>=6 and line.strip()]
 if len(entries)!=957 or not all(re.fullmatch('[a-z]+',item['word']) for item in entries):raise ValueError('Unexpected NAWL word rows')
 lower={normalize(w['word']) for level in [1,2] for w in json.loads((ROOT/f'src/data/words/lv{level}.json').read_text(encoding='utf-8'))}
 selected=[item for item in entries if normalize(item['word']) not in lower]
 excluded=[item['word'] for item in entries if normalize(item['word']) in lower]
 output={'source':'NAWL-1.2','sha256':SHA,'sourceWordCount':len(entries),'excludedCount':len(excluded),'uniqueWordCount':len(selected),'excluded':excluded,
 'normalization':'Case, apostrophe and hyphen variants share identity; deduct lower-level headwords, not synonyms. Original prefixes remain in the list.','words':selected}
 (ROOT/'data/sources/nawl-lv3-raw.json').write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print(json.dumps({k:output[k] for k in ['sourceWordCount','excludedCount','uniqueWordCount']}))
 print(', '.join(item['word'] for item in selected[:100]))
if __name__=='__main__':build()
