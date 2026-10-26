export function element<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = ''): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag); node.className = className; node.textContent = text; return node;
}
export function action(text: string, callback: () => void, className = 'ui-button'): HTMLButtonElement {
  const button = element('button', className, text); button.type = 'button'; button.addEventListener('click', callback); return button;
}
