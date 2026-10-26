"""Parse the official CEEC alphabetized list by column, preserving source groups."""
from pathlib import Path
import hashlib,json,re
import pdfplumber
ROOT=Path(__file__).resolve().parent.parent
SOURCE=ROOT/'data/sources/ceec-111-vocabulary.pdf'
SHA='27b010f8230b2e8763653ddb35783fe9e0140c143b0040f13839046aebb2a126'
def rows():
 if hashlib.sha256(SOURCE.read_bytes()).hexdigest()!=SHA:raise ValueError('CEEC source hash mismatch')
 result=[];buffer=''
 with pdfplumber.open(SOURCE) as pdf:
  for page_index in range(64,115):
   page=pdf.pages[page_index]
   for left,right in [(50,225),(225,390),(390,560)]:
    for line in (page.crop((left,0,right,page.height)).extract_text() or '').splitlines():
     line=line.strip()
     if not line or re.search('[\u4e00-\u9fff]',line) or re.fullmatch('[A-Z]',line):continue
     if re.fullmatch(r'\d+',line) and not (buffer and line in '123456'):continue
     buffer=(buffer+' '+line).strip()
     if not re.search(r'\s[1-6]$',buffer):continue
     match=re.fullmatch(r'(.+?)\s+((?:(?:n|v|adj|adv|prep|conj|pron|art|int|interj|aux|num|det)\.?|[()/ .-])+?)\s+([1-6])',buffer)
     if not match:raise ValueError(f'Cannot parse PDF page {page_index+1}: {buffer}')
     result.append({'raw':buffer,'entry':match[1],'pos':match[2],'sourceLevel':int(match[3]),'page':page_index+1})
     buffer=''
 if buffer:raise ValueError('Unfinished source row: '+buffer)
 return result

def normalize(value):
 return re.sub(r'\s+',' ',value.replace(chr(8217),chr(39)).strip()).casefold()
def expand(entries):
 output={}
 for entry in entries:
  text=entry['entry'].replace('sportswoma','sportswoman') if entry['pos']=='n n.' else entry['entry']
  pos='n.' if entry['pos']=='n n.' else entry['pos']
  if re.search(r'\s+\(',text):
   base=text.split(' (')[0];aliases=[part.strip() for part in re.search(r'\((.+)\)',text).group(1).split(',')]
   records=[(base,aliases)]
  else:
   pieces=[part.strip() for part in text.split('/')]
   primary=next((part for part in pieces if part.isascii()),pieces[0])
   match=re.fullmatch(r'(.+?)\(([^)]+)\)',primary)
   if match:
    base,suffix=match.groups();derived=suffix if suffix=='argument' else base+suffix
    records=[(base,pieces[1:]+[derived])] if suffix=='s' else [(base,pieces[1:]),(derived,[])]
   else:records=[(primary,[p for p in pieces if p!=primary])]
  for headword,aliases in records:
   key=normalize(headword)
   if not re.fullmatch(r"[a-z]+(?:[ .'-][a-z]*)*\.?",key):raise ValueError('Unexpected canonical word: '+key)
   item=output.setdefault(key,{'word':key,'pos':pos,'sourceEntries':[],'aliases':[]})
   item['sourceEntries'].append(entry);item['aliases']=sorted(set(item['aliases']+[normalize(a) for a in aliases]))
 return sorted(output.values(),key=lambda entry:entry['word'])
def build():
 entries=rows();words=expand(entries)
 (ROOT/'data/sources/ceec-raw-groups.json').write_text(json.dumps({'source':'CEEC-111','sha256':SHA,'pdfPages':[65,115],'count':len(entries),'entries':entries},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 lv1=json.loads((ROOT/'data/sources/moe-lv1-raw.json').read_text(encoding='utf-8'));lower=set()
 for word in lv1['words']:
  lower.add(word['word'].replace('-',''))
  for source in word['sourceEntries']:lower.update(normalize(alias).replace('-','') for alias in source['aliases'])
 selected=[];excluded=[]
 for word in words:
  family={value.replace('-','') for value in [word['word'],*word['aliases']]}
  optional_plural=any('(s)' in entry['entry'] for entry in word['sourceEntries'])
  same_spelling=any(entry['entry'] in ['adviser/advisor','afterward/afterwards','amid/amidst','backward/backwards','blond/blonde','cafe/caf'+chr(233),'caf'+chr(233)+'/cafe','disk/disc','downward/downwards','fianc'+chr(233)+'/fiance','forward/forwards','Internet/internet','judgment/judgement','madam/ma'+chr(8217)+'am','O.K./OK/okay','outward/outwards','toward/towards','upward/upwards','whiskey/whisky'] for entry in word['sourceEntries'])
  if word['word'].replace('-','') in lower or ((optional_plural or same_spelling) and family&lower):excluded.append(word['word'])
  else:selected.append(word)
 output={'source':'CEEC-111','sha256':SHA,'groupCount':len(entries),'sourceWordCount':len(words),'uniqueWordCount':len(selected),
 'excludedCount':len(excluded),'excluded':excluded,'normalization':'First slash spelling, preferring ASCII; suffixes expanded; pronoun forms kept as aliases; exact lower-level words and explicit spelling/plural forms excluded; synonyms do not propagate lower levels.',
 'repairs':[{'page':107,'extracted':'sportsman/sportswoma n n.','rejoined':'sportsman/sportswoman n.','reason':'Line break splits final n.'}],'words':selected}
 (ROOT/'data/sources/ceec-lv2-raw.json').write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print(json.dumps({key:output[key] for key in ['groupCount','sourceWordCount','uniqueWordCount','excludedCount']}))
 print('First 100:',', '.join(word['word'] for word in selected[:100]))
if __name__=='__main__':build()
