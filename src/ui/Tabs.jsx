import { useId, useRef } from 'react';
import { playSound } from '../audio/synth.js';

/** Barra de pestañas con teclado (← → Inicio Fin). tabs: [{ id, label, badge }]. El contenido lo pinta quien la usa. */
export function Tabs({ tabs, value, onChange, label, className = '' }) {
  const refs = useRef({});
  const prefix = useId();
  const move = (event, index) => {
    const next = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: tabs.length - 1 }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    const target = tabs[(next + tabs.length) % tabs.length];
    onChange(target.id);
    refs.current[target.id]?.focus();
  };
  return <div className={`ui-tabs ${className}`} role="tablist" aria-label={label}>
    {tabs.map((tab, index) => <button type="button" role="tab" key={tab.id} id={`${prefix}-tab-${tab.id}`} ref={node => { refs.current[tab.id] = node; }}
      aria-selected={tab.id === value} tabIndex={tab.id === value ? 0 : -1} className={tab.id === value ? 'on' : ''}
      onClick={() => { if (tab.id !== value) playSound('click'); onChange(tab.id); }} onKeyDown={event => move(event, index)}>
      {tab.label}{tab.badge > 0 && <span className="ui-tabs__badge">{tab.badge}</span>}
    </button>)}
  </div>;
}
