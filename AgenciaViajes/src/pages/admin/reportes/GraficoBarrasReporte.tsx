import { useEffect, type RefObject } from 'react';

export interface DatoGraficoBarra {
  etiqueta: string;
  valor: number;
  valorFormateado: string;
}

interface GraficoBarrasReporteProps {
  titulo: string;
  subtitulo?: string;
  datos: DatoGraficoBarra[];
  colorBarra?: string;
  lineaReferencia?: {
    valor: number;
    etiqueta: string;
  };
  canvasRef: RefObject<HTMLCanvasElement | null>;
}

export default function GraficoBarrasReporte({
  titulo,
  subtitulo,
  datos,
  colorBarra = '#2563eb',
  lineaReferencia,
  canvasRef,
}: GraficoBarrasReporteProps) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Proporción 910x290 (coincide con 182mm x 58mm del PDF)
    const width = 910;
    const height = 290;
    const dpr = 2;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Fondo blanco
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Borde sutil
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

    // Título y subtítulo del gráfico
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(titulo, 24, 28);

    if (subtitulo) {
      ctx.fillStyle = '#64748b';
      ctx.font = '12px sans-serif';
      ctx.fillText(subtitulo, 24, 46);
    }

    if (datos.length === 0) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No hay datos suficientes para graficar.', width / 2, height / 2 + 10);
      return;
    }

    const padLeft = 64;
    const padRight = 28;
    const padTop = 68;
    const padBottom = 46;
    const chartW = width - padLeft - padRight;
    const chartH = height - padTop - padBottom;

    const maxDato = Math.max(
      ...datos.map((d) => d.valor),
      lineaReferencia ? lineaReferencia.valor : 0,
      1
    );
    const maxEscala = maxDato * 1.15;

    // Líneas guía horizontales
    const pasosGrid = 4;
    ctx.font = '11px sans-serif';
    for (let i = 0; i <= pasosGrid; i++) {
      const y = padTop + chartH - (chartH * i) / pasosGrid;
      ctx.strokeStyle = i === 0 ? '#cbd5e1' : '#f1f5f9';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(padLeft + chartW, y);
      ctx.stroke();

      const valGrid = (maxEscala * i) / pasosGrid;
      const textoEje =
        valGrid >= 1_000_000
          ? `${(valGrid / 1_000_000).toFixed(1)}M`
          : valGrid >= 1_000
          ? `${Math.round(valGrid / 1_000)}k`
          : Math.round(valGrid).toString();

      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'right';
      ctx.fillText(textoEje, padLeft - 10, y + 4);
    }

    // Barras
    const slotW = chartW / datos.length;
    const barW = Math.min(56, slotW * 0.56);

    datos.forEach((item, index) => {
      const barH = (item.valor / maxEscala) * chartH;
      const x = padLeft + index * slotW + (slotW - barW) / 2;
      const y = padTop + chartH - barH;

      ctx.fillStyle = colorBarra;
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, [5, 5, 0, 0]);
      ctx.fill();

      // Valor encima de la barra
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(item.valorFormateado, x + barW / 2, Math.max(y - 6, padTop - 4));

      // Etiqueta eje X
      ctx.fillStyle = '#475569';
      ctx.font = '11px sans-serif';
      const etiquetaCorta =
        item.etiqueta.length > 16 ? `${item.etiqueta.slice(0, 15)}…` : item.etiqueta;
      ctx.fillText(etiquetaCorta, x + barW / 2, padTop + chartH + 18);
    });

    // Línea de referencia opcional (ej. promedio general)
    if (lineaReferencia && lineaReferencia.valor > 0) {
      const refY = padTop + chartH - (lineaReferencia.valor / maxEscala) * chartH;
      ctx.save();
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(padLeft, refY);
      ctx.lineTo(padLeft + chartW, refY);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = '#dc2626';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(lineaReferencia.etiqueta, padLeft + chartW, refY - 6);
    }
  }, [titulo, subtitulo, datos, colorBarra, lineaReferencia, canvasRef]);

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '14px',
        padding: '1rem',
        boxShadow: '0 10px 25px rgba(15, 23, 42, 0.06)',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '8px' }}
      />
    </div>
  );
}