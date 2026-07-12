import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface AssetPdfData {
  id: number;
  name: string;
  serial_number: string;
  qr_code_key: string;
  condition: string;
  health_score: number;
  location: string;
  status: string;
  warranty_expiry?: string | null;
  category?: { name: string };
  current_holder?: { full_name: string; email: string };
}

export interface TimelinePdfEvent {
  type: string;
  date: string;
  title: string;
  description: string;
  status: string;
}

export interface ReportsPdfData {
  total_assets_count: number;
  utilization_rate: number;
  total_maintenance_cost: number;
  categories_utilization: Array<{
    category_name: string;
    allocated: number;
    total: number;
    rate: number;
  }>;
  idle_assets: Array<{
    name: string;
    serial_number: string;
    location: string;
    health_score: number;
    condition: string;
  }>;
  frequently_maintained: Array<{
    name: string;
    serial_number: string;
    repair_count: number;
    total_cost: number;
  }>;
  maintenance_trends: Array<{ month: string; cost: number }>;
}

export const generateAssetPassportPdf = (
  asset: AssetPdfData,
  timeline: TimelinePdfEvent[] = [],
) => {
  const doc = new jsPDF();
  const margin = 14;
  let y = 20;

  doc.setFontSize(18);
  doc.setTextColor(49, 46, 129);
  doc.text('AssetFlow — Asset Passport', margin, y);

  y += 10;
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin, y);

  y += 12;
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text(asset.name, margin, y);

  y += 8;
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);

  const details = [
    ['Serial Number', asset.serial_number],
    ['Passport ID', asset.qr_code_key],
    ['Category', asset.category?.name || 'Uncategorized'],
    ['Location', asset.location],
    ['Status', asset.status],
    ['Condition', asset.condition],
    ['Health Score', `${asset.health_score}%`],
    ['Warranty Expiry', asset.warranty_expiry || 'Not recorded'],
    ['Current Custodian', asset.current_holder?.full_name || 'In Central Storage'],
    ['Custodian Email', asset.current_holder?.email || '—'],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Field', 'Value']],
    body: details,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [79, 70, 229] },
    margin: { left: margin, right: margin },
  });

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text('Lifecycle Timeline', margin, y);
  y += 4;

  if (timeline.length > 0) {
    autoTable(doc, {
      startY: y + 4,
      head: [['Date', 'Event', 'Description']],
      body: timeline.map((event) => [
        new Date(event.date).toLocaleDateString(),
        event.title,
        event.description,
      ]),
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [79, 70, 229] },
      margin: { left: margin, right: margin },
    });
  } else {
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('No lifecycle events recorded.', margin, y + 8);
  }

  const safeName = asset.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  doc.save(`AssetFlow_Passport_${safeName}_${asset.serial_number}.pdf`);
};

export const generateReportsPdf = (data: ReportsPdfData) => {
  const doc = new jsPDF();
  const margin = 14;
  let y = 20;

  doc.setFontSize(18);
  doc.setTextColor(49, 46, 129);
  doc.text('AssetFlow — Analytics Report', margin, y);

  y += 10;
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin, y);

  y += 12;
  autoTable(doc, {
    startY: y,
    head: [['Metric', 'Value']],
    body: [
      ['Total Active Fleet', String(data.total_assets_count)],
      ['Average Deployment Rate', `${data.utilization_rate}%`],
      ['Cumulative Repair Costs', `$${data.total_maintenance_cost.toFixed(2)}`],
    ],
    theme: 'grid',
    styles: { fontSize: 10 },
    headStyles: { fillColor: [79, 70, 229] },
    margin: { left: margin, right: margin },
  });

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  doc.setFontSize(12);
  doc.text('Category Utilization', margin, y);

  autoTable(doc, {
    startY: y + 4,
    head: [['Category', 'Allocated', 'Total', 'Rate %']],
    body: data.categories_utilization.map((c) => [
      c.category_name,
      String(c.allocated),
      String(c.total),
      `${c.rate}%`,
    ]),
    theme: 'striped',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [79, 70, 229] },
    margin: { left: margin, right: margin },
  });

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  doc.setFontSize(12);
  doc.text('Monthly Maintenance Costs', margin, y);

  autoTable(doc, {
    startY: y + 4,
    head: [['Month', 'Cost ($)']],
    body: data.maintenance_trends.map((t) => [t.month, t.cost.toFixed(2)]),
    theme: 'striped',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [79, 70, 229] },
    margin: { left: margin, right: margin },
  });

  if (data.idle_assets.length > 0) {
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.text('Idle Assets', margin, y);

    autoTable(doc, {
      startY: y + 4,
      head: [['Asset', 'Serial', 'Location', 'Health', 'Condition']],
      body: data.idle_assets.map((a) => [
        a.name,
        a.serial_number,
        a.location,
        `${a.health_score}%`,
        a.condition,
      ]),
      theme: 'striped',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [79, 70, 229] },
      margin: { left: margin, right: margin },
    });
  }

  if (data.frequently_maintained.length > 0) {
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    if (y > 240) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(12);
    doc.text('Frequently Maintained Assets', margin, y);

    autoTable(doc, {
      startY: y + 4,
      head: [['Asset', 'Serial', 'Repairs', 'Total Cost']],
      body: data.frequently_maintained.map((a) => [
        a.name,
        a.serial_number,
        String(a.repair_count),
        `$${a.total_cost.toFixed(2)}`,
      ]),
      theme: 'striped',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [79, 70, 229] },
      margin: { left: margin, right: margin },
    });
  }

  doc.save(`AssetFlow_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
};
