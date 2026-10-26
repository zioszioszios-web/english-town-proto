import { WORD_SOURCES } from '../data/words/sources';
import { wordBankInfo } from '../data/words/catalog';
import { LEVELS } from '../data/levels';
import { element, action } from './dom';

export function sourcesPanel(back: () => void): HTMLElement {
  const panel = element('div', 'menu-panel scroll-panel sources-panel');
  const status = element('p', 'muted', LEVELS.map(level => {
    const info = wordBankInfo(level);
    return 'Lv'+level+'：'+(info.ready ? info.wordCount+' 字，'+info.reviewCount+' 筆待複核' : '單字準備中');
  }).join(' · '));
  panel.append(status);
  panel.append(element('p', '', '英文詞目依官方字表整理；中文、例句與主題由 AI 輔助產生。不確定內容標為待複核。重複字歸入最低等級。'));
  for (const source of WORD_SOURCES) {
    const card = element('article', 'source-card');
    const link = element('a', '', source.name);
    link.href = source.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
    card.append(link, element('p', '', source.author), element('p', 'muted', source.license));
    if ('licenseUrl' in source) {
      const license = element('a', '', '查看授權條款');
      license.href = source.licenseUrl; license.target = '_blank'; license.rel = 'noopener noreferrer'; card.append(license);
    }
    panel.append(card);
  }
  panel.append(element('p', 'muted', 'NAWL／TSL 衍生字庫的新增中文、例句與主題亦採 CC BY-SA 4.0。原始檔、版本、雜湊值與處理方式記錄在 data/sources/README.md。'),
    action('返回設定', back, 'ui-button quiet'));
  return panel;
}
