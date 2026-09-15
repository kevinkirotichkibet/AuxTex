const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  in_production: 'In production',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#a9793d',
  in_production: '#21304a',
  shipped: '#3d4c3d',
  delivered: '#1c1a17',
  cancelled: '#a3341f',
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

export function statusColor(status: string): string {
  return STATUS_COLORS[status] ?? '#6b6558';
}
