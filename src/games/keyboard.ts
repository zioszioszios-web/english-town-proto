import { action, element } from '../ui/dom';
export function screenKeyboard(key: (value: string) => void): HTMLElement {
  const keyboard = element('div', 'screen-keyboard');
  keyboard.setAttribute('aria-label', '英文螢幕鍵盤');
  for (const letters of ['qwertyuiop', 'asdfghjkl', 'zxcvbnm', "'-."]) {
    const row = element('div', 'keyboard-row');
    for (const letter of letters) row.append(action(letter, () => key(letter), 'key'));
    keyboard.append(row);
  }
  const row = element('div', 'keyboard-row');
  row.append(action('空白', () => key(' '), 'key wide'), action('⌫ 刪除', () => key('Backspace'), 'key wide'), action('確認', () => key('Enter'), 'key wide'));
  keyboard.append(row); return keyboard;
}
export function physicalKey(event: Event): string | null {
  const key = (event as KeyboardEvent).key;
  if (/^[a-z '.-]$/i.test(key) || key === 'Backspace' || key === 'Enter') { event.preventDefault(); return key.toLowerCase() === 'enter' ? 'Enter' : key; }
  return null;
}
