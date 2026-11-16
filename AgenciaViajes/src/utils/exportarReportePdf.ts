import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ConfiguracionReportePdf {
  tituloReporte: string;
  subtituloTabla: string;
  resumenKpis: string;
  filtrosTexto: string;
  columnas: string[];
  filas: (string | number)[][];
  nombreArchivo: string;
  orientacion?: 'portrait' | 'landscape';
  imagenGrafico?: string;
}

export function exportarReportePdf({
  tituloReporte,
  subtituloTabla,
  resumenKpis,
  filtrosTexto,
  columnas,
  filas,
  nombreArchivo,
  orientacion = 'portrait',
  imagenGrafico,
}: ConfiguracionReportePdf): void {
  const doc = new jsPDF({ orientation: orientacion, unit: 'mm', format: 'a4' });
  const anchoPagina = doc.internal.pageSize.getWidth();
  const altoPagina = doc.internal.pageSize.getHeight();
  const margenHorizontal = 14;
  const anchoUtil = anchoPagina - margenHorizontal * 2;

  const fechaGeneracion = new Date().toLocaleString('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  // Encabezado corporativo Viaja por Europa
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, anchoPagina, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text('VIAJA POR EUROPA', margenHorizontal, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(203, 213, 225);
  doc.text('Sistema de Gestión Transporte Europa', margenHorizontal, 20);
  doc.text(`Generado: ${fechaGeneracion}`, margenHorizontal, 26);

  // Título del reporte y metadatos
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13.5);
  doc.text(tituloReporte, margenHorizontal, 42);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(subtituloTabla, margenHorizontal, 48);
  doc.text(`Filtros aplicados: ${filtrosTexto}`, margenHorizontal, 53);

  // Caja de resumen ejecutivo (KPIs)
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margenHorizontal, 57, anchoUtil, 11, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.8);
  doc.setTextColor(30, 41, 59);
  doc.text(resumenKpis, margenHorizontal + 4, 64);

  let posicionTablaY = 73;

  // Espacio opcional para gráfico estadístico (bonificación)
  if (imagenGrafico) {
    const altoGrafico = 58;
    doc.addImage(imagenGrafico, 'PNG', margenHorizontal, posicionTablaY, anchoUtil, altoGrafico);
    posicionTablaY += altoGrafico + 6;
  }

  // Tabla de datos
  autoTable(doc, {
    startY: posicionTablaY,
    head: [columnas],
    body: filas,
    theme: 'striped',
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: margenHorizontal, right: margenHorizontal, bottom: 18 },
  });

  // Paginación real una vez renderizadas todas las hojas
  const totalPaginas = doc.getNumberOfPages();
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Viaja por Europa — Documento oficial de reporte operativo   |   Página ${i} de ${totalPaginas}`,
      margenHorizontal,
      altoPagina - 10
    );
  }

  doc.save(nombreArchivo);
}