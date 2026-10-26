"""Validate authored batches against downloaded source entries and assemble lv1.json."""
from pathlib import Path
import json,re,sys
ROOT=Path(__file__).resolve().parent.parent
TOPICS={'F':'food_drink','H':'health_body','R':'travel_lodging','S':'school_sports','W':'work_business','N':'nature_outdoor','C':'transport_city','D':'daily_life','P':'people_feelings','T':'time_numbers','O':'other'}
level=int(sys.argv[1]) if len(sys.argv)>1 else 1
sources={1:'moe-lv1-raw.json',2:'ceec-lv2-raw.json',3:'nawl-lv3-raw.json',4:'tsl-lv4-raw.json'}
raw=json.loads((ROOT/'data/sources'/sources[level]).read_text(encoding='utf-8'))
indices={entry['word']:index+1 for index,entry in enumerate(raw['words'])}
words=[];seen=set()
for batch in sorted((ROOT/f'data/word-batches/lv{level}').glob('*.tsv')):
 for row,line in enumerate(batch.read_text(encoding='utf-8').splitlines(),1):
  if not line.strip() or line.startswith('#'):continue
  parts=[part.strip() for part in line.split('|')]
  if len(parts)!=6:raise ValueError(f'{batch.name}:{row}: expected six fields')
  word,pos,zh,example,example_zh,tags=parts
  key=word.casefold().strip()
  if key not in indices:raise ValueError(f'{batch.name}:{row}: not in official source: {word}')
  if key in seen:raise ValueError(f'Duplicate word: {word}')
  seen.add(key)
  review='?' in tags;tags=tags.replace('?','')
  topics=[TOPICS[tag] for tag in tags.split(',') if tag]
  if not all([pos,zh,example,example_zh]) or not 1<=len(zh.split(';'))<=3:raise ValueError(f'Incomplete enrichment: {word}')
  if not re.search(r'(?<![a-z])'+re.escape(key)+r'(?![a-z])',example.casefold()):raise ValueError(f'Example does not use exact headword: {word}')
  words.append({'id':f'lv{level}-{indices[key]:04d}','word':word,'pos':pos,'zh':zh.split(';'),'example':example,'exampleZh':example_zh,'level':level,'topics':topics,'source':raw['source'],'review':review})
words.sort(key=lambda entry:entry['id'])
output=ROOT/f'src/data/words/lv{level}.json';output.parent.mkdir(parents=True,exist_ok=True)
output.write_text(json.dumps(words,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'Validated {len(words)} / {raw["uniqueWordCount"]} authored entries; {sum(word["review"] for word in words)} flagged for review.')
