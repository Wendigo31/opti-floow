import { useEffect, useRef, useState } from 'react';
import { Eraser } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Zone de signature au doigt ; `onChange` reçoit le PNG (ou null si vide). */
export function SignaturePad({ onChange }: { onChange: (png: Blob | null) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ratio = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * ratio;
    c.height = c.offsetHeight * ratio;
    const ctx = c.getContext('2d');
    if (ctx) { ctx.scale(ratio, ratio); ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.strokeStyle = '#111'; }
  }, []);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const done = () => {
    drawing.current = false;
    ref.current?.toBlob((b) => onChange(b), 'image/png');
  };
  const clear = () => {
    const c = ref.current;
    c?.getContext('2d')?.clearRect(0, 0, c.width, c.height);
    setEmpty(true);
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <canvas
        ref={ref}
        className="h-40 w-full touch-none rounded-lg border bg-white"
        onPointerDown={(e) => { drawing.current = true; const p = pos(e); const ctx = ref.current?.getContext('2d'); ctx?.beginPath(); ctx?.moveTo(p.x, p.y); e.currentTarget.setPointerCapture(e.pointerId); }}
        onPointerMove={(e) => { if (!drawing.current) return; const p = pos(e); const ctx = ref.current?.getContext('2d'); ctx?.lineTo(p.x, p.y); ctx?.stroke(); setEmpty(false); }}
        onPointerUp={done}
        onPointerLeave={() => drawing.current && done()}
        aria-label="Zone de signature"
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{empty ? 'Faites signer le destinataire avec le doigt' : 'Signature enregistrée'}</span>
        <Button type="button" size="sm" variant="ghost" className="gap-1" onClick={clear}><Eraser className="h-3.5 w-3.5" /> Effacer</Button>
      </div>
    </div>
  );
}
