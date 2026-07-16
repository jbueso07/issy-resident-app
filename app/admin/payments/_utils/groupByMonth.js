// app/admin/payments/_utils/groupByMonth.js
// ISSY Admin - Group payments by month for FlatList rendering
//
// Sprint 3 D10: convierte un array de payments (ya ordenado desc por fecha
// desde el backend) en un array plano con headers + items intercalados,
// apto para FlatList.
//
// Trade-off conocido: las stats por mes se calculan sobre los items
// VISIBLES (paginated). Si el admin scrollea más, los stats del mes
// anterior pueden cambiar (aparecen más items de ese mes). Aceptable
// para D10 — si en el futuro se quiere stats exactas server-side, sería
// endpoint nuevo.

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// Fix TZ (corrimiento de mes): charge_due_date llega como DATE-only
// ('YYYY-MM-DD'). `new Date('2026-08-01')` lo ancla a medianoche UTC y
// getFullYear()/getMonth() (hora local, UTC-6) lo retroceden a julio 31.
// Para date-only derivamos año/mes directo del string; timestamps ISO
// completos (created_at, paid_at) conservan el comportamiento local actual.
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

export const monthPartsOf = (dateStr) => {
  if (!dateStr) return null;
  if (typeof dateStr === 'string' && DATE_ONLY_RE.test(dateStr)) {
    return { year: Number(dateStr.slice(0, 4)), month: Number(dateStr.slice(5, 7)) - 1 };
  }
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return { year: d.getFullYear(), month: d.getMonth() };
};

// Key canónico de mes — único punto de verdad para groupByMonth y para el
// filtro de meses colapsados de ChargesTab (mismo formato `${year}-${MM}`).
export const monthKeyOf = (dateStr) => {
  const parts = monthPartsOf(dateStr);
  return parts ? `${parts.year}-${String(parts.month).padStart(2, '0')}` : null;
};

/**
 * Agrupa payments por mes (year+month) según el dateField indicado.
 *
 * @param {Array} payments - lista de payments del endpoint /admin/payments
 * @param {string} [dateField='charge_due_date'] - 'charge_due_date' | 'created_at' | 'paid_at' | 'verified_at'
 * @description charge_due_date es el "mes objetivo" del cobro (cuándo aplica),
 *              independiente de cuándo se creó o se pagó. Es el default desde
 *              que el backend lo expone como alias top-level del JOIN con
 *              community_charges. Fallback automático a created_at si null
 *              (ej. payments huérfanos sin charge padre).
 * @returns {Array<{
 *   type: 'header' | 'item',
 *   key: string,
 *   // headers:
 *   year?: number,
 *   month?: number,
 *   label?: string,
 *   stats?: { collected: number, pending: number, total: number, count: number },
 *   // items:
 *   payment?: Object,
 * }>}
 */
export function groupByMonth(payments = [], dateField = 'charge_due_date') {
  if (!Array.isArray(payments) || payments.length === 0) return [];

  // 1. Agrupar por (year, month)
  // Map preserva orden de inserción — útil porque el input ya viene ordenado
  // desc, pero ordenamos explícitamente abajo para ser defensivos.
  const groups = new Map();

  for (const p of payments) {
    // Si el dateField está null/missing (ej. paid_at en un payment sin pagar),
    // fallback a created_at para no perder el item.
    const dateStr = p[dateField] || p.created_at;
    if (!dateStr) continue;
    const parts = monthPartsOf(dateStr);
    if (!parts) continue;
    const { year, month } = parts; // month 0-indexed
    const groupKey = `${year}-${String(month).padStart(2, '0')}`;

    if (!groups.has(groupKey)) {
      groups.set(groupKey, { year, month, key: groupKey, payments: [] });
    }
    groups.get(groupKey).payments.push(p);
  }

  // 2. Ordenar grupos desc (más reciente primero)
  const sortedGroups = Array.from(groups.values()).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });

  // 3. Construir array plano + calcular stats por mes
  const out = [];
  for (const g of sortedGroups) {
    let collected = 0;
    let pending = 0;
    let count = 0;
    for (const p of g.payments) {
      count++;
      if (p.status === 'paid') {
        // Usar verified_amount si está, sino amount (consistente con KpiCard)
        collected += parseFloat(p.verified_amount ?? p.amount ?? 0) || 0;
      } else if (p.status !== 'cancelled') {
        pending += parseFloat(p.amount ?? 0) || 0;
      }
    }
    const total = collected + pending; // excluye cancelled

    out.push({
      type: 'header',
      key: `header-${g.key}`,
      year: g.year,
      month: g.month,
      label: `${MONTHS_ES[g.month]} ${g.year}`,
      stats: { collected, pending, total, count },
    });

    for (const p of g.payments) {
      out.push({
        type: 'item',
        key: `item-${p.id}`,
        payment: p,
      });
    }
  }

  return out;
}
