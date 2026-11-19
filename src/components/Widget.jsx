import React from 'react';

export default function Widget({ title, icon, extra, children, className = '', tall = false }) {
  return (
    <section className={`widget ${tall ? 'tall' : ''} ${className}`}>
      <header className="widget-head">
        <div className="widget-title">
          {icon && <span className="widget-icon">{icon}</span>}
          <h2>{title}</h2>
        </div>
        {extra}
      </header>
      <div className="widget-body">{children}</div>
    </section>
  );
}
