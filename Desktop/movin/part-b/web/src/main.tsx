import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import fixture from '../../fixtures/detections.json';
import { processDetections } from '../../src/inventory';
import type { PropertyDetections } from '../../src/types';

type Item = { id: string; label: string; quantity: number; volumeM3: number | null; confidence: number; needsReview?: boolean; reviewReason?: string };
type Room = { roomId: string; name: string; photoCount: number; items: Item[] };

const volumes: Record<string, number> = { Sofa: 1.8, Armchair: .7, 'Coffee table': .35, Tv: .15, Bookshelf: .8, Refrigerator: 1.1, 'Dining chair': .3, 'Dining table': .9, 'Double bed': 2.2, Wardrobe: 1.5, Nightstand: .2, Mirror: .1, Tetera: .02, Hervidor: .02, Ceainic: .02 };
const roomNames: Record<string, string> = { 'Living room': 'Salón', Kitchen: 'Cocina', Bathroom: 'Baño', Bedroom: 'Dormitorio', 'Dining room': 'Comedor' };
const itemNames: Record<string, string> = { Sofa: 'Sofá', Armchair: 'Sillón', 'Coffee table': 'Mesa de centro', Tv: 'Televisor', Bookshelf: 'Estantería', Refrigerator: 'Frigorífico', 'Dining chair': 'Silla de comedor', 'Dining table': 'Mesa de comedor', Table: 'Mesa de comedor', 'Double bed': 'Cama doble', Wardrobe: 'Armario', Nightstand: 'Mesita de noche', Mirror: 'Espejo', Person: 'Persona' };
const translateItem = (label: string) => itemNames[label] ?? label;
const manualItem = (label: string) => { const normalized = label.trim().toLocaleLowerCase(); if (normalized === 'ceainic') return { label: 'Tetera', volumeM3: .02 }; if (normalized === 'hervidor' || normalized === 'kettle') return { label: 'Hervidor', volumeM3: .02 }; const translated = translateItem(label.trim()); return { label: translated, volumeM3: volumes[translated] ?? null }; };
const quote = processDetections(fixture as unknown as PropertyDetections);
const inventoryRooms: Room[] = quote.rooms.map((room) => ({
  roomId: room.roomId,
  name: roomNames[room.name] ?? room.name,
  photoCount: room.photoCount,
  items: room.items.map((item) => ({
    id: item.id,
    label: translateItem(item.label),
    quantity: item.quantity,
    volumeM3: item.volumeM3,
    confidence: item.confidence,
    needsReview: item.needsReview,
    reviewReason: item.reviewReason,
  })),
}));

function App() {
  const [rooms, setRooms] = useState<Room[]>(inventoryRooms);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [undo, setUndo] = useState<{ roomId: string; item: Item } | null>(null);
  const [addingRoomId, setAddingRoomId] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemVolume, setNewItemVolume] = useState('');
  const [addError, setAddError] = useState('');
  React.useEffect(() => { const timer = window.setTimeout(() => setLoading(false), 700); return () => window.clearTimeout(timer); }, []);
  const total = useMemo(() => rooms.reduce((sum, room) => sum + room.items.reduce((s, item) => s + (item.volumeM3 ?? 0) * item.quantity, 0), 0), [rooms]);
  const updateQuantity = (roomId: string, id: string, quantity: number) => setRooms(rs => rs.map(r => r.roomId === roomId ? { ...r, items: r.items.map(i => i.id === id ? { ...i, quantity: Math.max(1, quantity) } : i) } : r));
  const remove = (roomId: string, item: Item) => { if (!window.confirm(`¿Eliminar ${item.label}?`)) return; setRooms(rs => rs.map(r => r.roomId === roomId ? { ...r, items: r.items.filter(i => i.id !== item.id) } : r)); setUndo({ roomId, item }); };
  const add = (roomId: string) => { const clean = newItemName.trim(); const volume = Number(newItemVolume.replace(',', '.')); if (!clean) { setAddError('Escribe el nombre del objeto.'); return; } if (!Number.isFinite(volume) || volume <= 0) { setAddError('Introduce un volumen mayor que 0 m³.'); return; } const manual = manualItem(clean); const label = manual.label; setRooms(rs => rs.map(r => r.roomId === roomId ? { ...r, items: [...r.items, { id: `${roomId}-${Date.now()}`, label, quantity: 1, volumeM3: volume, confidence: 1, needsReview: false, reviewReason: undefined }] } : r)); setNewItemName(''); setNewItemVolume(''); setAddError(''); setAddingRoomId(null); };
  if (loading) return <main className="shell center"><div className="spinner" aria-hidden="true"/><p>Analizando el inventario de tu casa…</p></main>;
  if (error) return <main className="shell center"><h1>No pudimos cargar el inventario</h1><button onClick={() => { setError(false); setLoading(true); }}>Intentar de nuevo</button></main>;
  if (confirmed) return <main className="shell center"><div className="check">✓</div><h1>Inventario confirmado</h1><p>Hemos registrado el inventario para tu presupuesto.</p><strong className="big-total">{total.toFixed(2)} m³</strong></main>;
  return <main className="shell"><header><div className="brand">MOVIN<span>.</span></div><p className="eyebrow">PASO 2 DE 2</p><h1>Revisa tu inventario</h1><p className="lede">Hemos analizado tus fotos. Ajusta las cantidades antes de preparar tu presupuesto.</p></header><div className="notice"><span>◎</span><div><strong>Revisa los elementos marcados</strong><br/><small>Algunos objetos necesitan tu confirmación.</small></div></div>{rooms.map(room => <section className="room" key={room.roomId}><div className="room-heading"><div><h2>{room.name}</h2><small>{room.photoCount} fotos</small></div>{addingRoomId === room.roomId ? <form className="add-form" onSubmit={e => { e.preventDefault(); add(room.roomId); }}><input autoFocus value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="Nombre del objeto" aria-label="Nombre del objeto"/><input type="number" min="0.001" step="0.001" value={newItemVolume} onChange={e => setNewItemVolume(e.target.value)} placeholder="Volumen (m³)" aria-label="Volumen en metros cúbicos" required/>{addError && <small className="add-error" role="alert">{addError}</small>}<button type="submit" className="text-button">Añadir</button><button type="button" className="text-button" onClick={() => { setAddingRoomId(null); setNewItemName(""); setNewItemVolume(""); setAddError(""); }}>Cancelar</button></form> : <button className="text-button" onClick={() => setAddingRoomId(room.roomId)}>+ Añadir</button>}</div>{room.items.length === 0 ? <div className="empty">No hemos detectado objetos para trasladar en esta habitación.</div> : room.items.map(item => <article className={`item ${item.needsReview ? 'review' : ''}`} key={item.id}><div className="item-main"><div className="item-title"><strong>{item.label}</strong>{item.needsReview && <span className="badge">Revisar</span>}</div><small>{item.volumeM3 === null ? 'Volumen desconocido' : `${(item.volumeM3 * item.quantity).toFixed(2)} m³ estimados`} · {Math.round(item.confidence * 100)}% de confianza</small></div><div className="item-actions"><label className="sr-only" htmlFor={item.id}>Cantidad de {item.label}</label><input id={item.id} type="number" min="1" value={item.quantity} onChange={e => updateQuantity(room.roomId, item.id, Number(e.target.value))}/><button className="remove" aria-label={`Eliminar ${item.label}`} onClick={() => remove(room.roomId, item)}>×</button></div></article>)}</section>)}{undo && <div className="undo">{undo.item.label} se ha eliminado. <button onClick={() => { setRooms(rs => rs.map(r => r.roomId === undo.roomId ? { ...r, items: [...r.items, undo.item] } : r)); setUndo(null); }}>Deshacer</button></div>}<footer><div><small>Volumen estimado</small><strong>{total.toFixed(2)} m³</strong></div><button className="primary" onClick={() => setConfirmed(true)}>Confirmar inventario <span>→</span></button></footer></main>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
