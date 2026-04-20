import { useState } from 'react';

const KEYS = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M', '@', '#'],
  ['!', '$', '%', '&', '*', '.', '⌫']
];

export default function VirtualKeyboard({ visible, onToggle }) {
  const [shifted, setShifted] = useState(false);

  if (!visible) {
    return (
      <button type="button" className="vkb-toggle" onClick={onToggle} title="Open virtual keyboard">
        ⌨
      </button>
    );
  }

  const getActiveInput = () => {
    const el = document.activeElement;
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return el;
    return null;
  };

  const handleKey = (key) => {
    const input = getActiveInput();
    if (!input) return;

    // Use native input value setter to work with React
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value'
    )?.set || Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, 'value'
    )?.set;

    if (key === '⌫') {
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const val = input.value;
      if (start === end && start > 0) {
        const newVal = val.slice(0, start - 1) + val.slice(end);
        nativeInputValueSetter?.call(input, newVal);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.setSelectionRange(start - 1, start - 1);
      } else if (start !== end) {
        const newVal = val.slice(0, start) + val.slice(end);
        nativeInputValueSetter?.call(input, newVal);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.setSelectionRange(start, start);
      }
    } else {
      const char = shifted ? key.toUpperCase() : key.toLowerCase();
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const val = input.value;
      const newVal = val.slice(0, start) + char + val.slice(end);
      nativeInputValueSetter?.call(input, newVal);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.setSelectionRange(start + 1, start + 1);
      setShifted(false);
    }
  };

  return (
    <div className="vkb-container">
      <div className="vkb-header">
        <span>Virtual Keyboard — click an input field, then type here</span>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button type="button" className={`vkb-key vkb-key--fn${shifted ? ' vkb-key--active' : ''}`} onClick={() => setShifted(!shifted)}>⇧</button>
          <button type="button" className="vkb-key vkb-key--fn" onClick={onToggle}>✕</button>
        </div>
      </div>
      <div className="vkb-rows">
        {KEYS.map((row, i) => (
          <div key={i} className="vkb-row">
            {row.map((key) => (
              <button type="button" key={key} className={`vkb-key${key === '⌫' ? ' vkb-key--fn' : ''}`} onMouseDown={(e) => { e.preventDefault(); handleKey(key); }}>
                {key === '⌫' ? '⌫' : shifted ? key.toUpperCase() : key.toLowerCase()}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
