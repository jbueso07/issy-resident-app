// app/admin/payments/_components/StatementModal.js
// ISSY Admin - Account Statement Modal

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
// Legacy API: el módulo de pagos usa expo-file-system/legacy (downloadAsync +
// cacheDirectory) — mismo patrón que PaymentDetailModal / ChargeDetailModal.
import * as FileSystem from 'expo-file-system/legacy';
import { COLORS, scale } from '../_constants';
import { formatCurrency, formatDate, getAuthHeaders } from '../_helpers';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.joinissy.com';

export function StatementModal({
  visible,
  onClose,
  locationId,
  locationName,
  users,
}) {
  const { t } = useTranslation();
  const [selectedUser, setSelectedUser] = useState(null);
  const [userPayments, setUserPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [step, setStep] = useState('select');
  // Frente 2 / Fase 4 — reporte por estado (consolidado de la comunidad).
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [generatingByState, setGeneratingByState] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  const filteredUsers = users?.filter(user => {
    const query = searchQuery.toLowerCase();
    const name = (user.full_name || user.name || '').toLowerCase();
    const unit = (user.unit_number || '').toLowerCase();
    const email = (user.email || '').toLowerCase();
    return name.includes(query) || unit.includes(query) || email.includes(query);
  }) || [];

  const fetchUserPayments = useCallback(async (userId) => {
    if (!locationId || !userId) return;
    
    try {
      setLoading(true);
      const headers = await getAuthHeaders();
      
      const paymentsResponse = await fetch(
        `${API_URL}/api/community-payments/admin/payments?location_id=${locationId}&user_id=${userId}`,
        { headers }
      );
      const paymentsData = await paymentsResponse.json();
      
      const chargesResponse = await fetch(
        `${API_URL}/api/community-payments/admin/charges?location_id=${locationId}`,
        { headers }
      );
      const chargesData = await chargesResponse.json();
      
      const results = [];
      const paidChargeIds = new Set();
      
      if (paymentsData.success && paymentsData.data) {
        paymentsData.data.forEach(payment => {
          paidChargeIds.add(payment.charge_id);
          results.push({
            id: payment.id,
            charge_id: payment.charge_id,
            title: payment.charge?.title || "Cobro",
            amount: payment.charge?.amount || payment.amount,
            due_date: payment.charge?.due_date,
            created_at: payment.created_at,
            status: payment.status,
            payment_method: payment.payment_method,
            paid_at: payment.paid_at,
          });
        });
      }
      
      if (chargesData.success && chargesData.data) {
        chargesData.data.forEach(charge => {
          if (paidChargeIds.has(charge.id)) return;
          const appliesToUser = charge.applies_to === "all" || (charge.specific_users && charge.specific_users.includes(userId));
          if (appliesToUser && charge.status === "active") {
            results.push({
              id: charge.id,
              charge_id: charge.id,
              title: charge.title,
              amount: charge.amount,
              due_date: charge.due_date,
              created_at: charge.created_at,
              status: "pending",
              payment_method: null,
              paid_at: null,
            });
          }
        });
      }
      
      results.sort((a, b) => new Date(b.due_date || b.created_at) - new Date(a.due_date || a.created_at));
      setUserPayments(results);
    } catch (error) {
      console.error("Error fetching user payments:", error);
      Alert.alert("Error", "No se pudo cargar el historial");
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setStep('preview');
    fetchUserPayments(user.id);
  };

  const handleBack = () => {
    setStep('select');
    setSelectedUser(null);
    setUserPayments([]);
  };

  const calculateTotals = () => {
    let totalCharged = 0;
    let totalPaid = 0;
    let totalPending = 0;

    userPayments.forEach(item => {
      const amount = parseFloat(item.amount) || 0;
      totalCharged += amount;
      if (item.status === 'paid') {
        totalPaid += amount;
      } else {
        totalPending += amount;
      }
    });

    return { totalCharged, totalPaid, totalPending };
  };

  const generatePDFHtml = () => {
    const { totalCharged, totalPaid, totalPending } = calculateTotals();
    const today = new Date().toLocaleDateString("es-HN", { year: "numeric", month: "long", day: "numeric" });
    const userName = selectedUser?.full_name || selectedUser?.name || "Residente";
    const userHouse = selectedUser?.house_number || selectedUser?.unit_number || "";
    const userEmail = selectedUser?.email || "";
    const userPhone = selectedUser?.phone || "";
    
    const monthlyTotals = {};
    userPayments.forEach(item => {
      const date = new Date(item.due_date || item.created_at);
      const monthKey = date.toLocaleDateString("es-HN", { year: "numeric", month: "short" });
      if (!monthlyTotals[monthKey]) monthlyTotals[monthKey] = { paid: 0, pending: 0 };
      const amount = parseFloat(item.amount) || 0;
      if (item.status === "paid") monthlyTotals[monthKey].paid += amount;
      else monthlyTotals[monthKey].pending += amount;
    });
    
    const paymentsHtml = userPayments.map(item => {
      const isPaid = item.status === "paid";
      const statusText = isPaid ? "Pagado" : item.status === "proof_submitted" ? "En revisión" : "Pendiente";
      const paidDate = item.paid_at ? new Date(item.paid_at).toLocaleDateString("es-HN", { day: "2-digit", month: "short" }) : "-";
      return `<tr>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${formatDate(item.due_date || item.created_at)}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${item.title || "Cobro"}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">L ${parseFloat(item.amount).toFixed(2)}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;">${paidDate}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;color:${isPaid ? "#1f2937" : "#d97706"};font-weight:600;">${statusText}</td>
      </tr>`;
    }).join("");
    
    const monthlySummaryHtml = Object.entries(monthlyTotals).map(([month, totals]) => 
      `<tr><td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${month}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;color:#059669;">L ${totals.paid.toFixed(2)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;color:#d97706;">L ${totals.pending.toFixed(2)}</td></tr>`
    ).join("");
    
    const logoSvg = `<svg width="80" height="32" viewBox="0 0 80 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <text x="0" y="26" font-family="Arial Black, sans-serif" font-size="28" font-weight="900" fill="#0F1A1A">ISSY</text>
      <circle cx="72" cy="24" r="4" fill="#AAFF00"/>
    </svg>`;
    
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Estado de Cuenta</title>
    <style>
      body{font-family:"Helvetica Neue",Arial,sans-serif;margin:0;padding:24px 32px;color:#1f2937;font-size:13px;}
      .header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;padding-bottom:12px;border-bottom:2px solid #0F1A1A;}
      .logo-section{display:flex;flex-direction:column;}
      .website{font-size:10px;color:#6b7280;margin-top:2px;}
      .doc-info{text-align:right;}
      .doc-title{font-size:18px;font-weight:700;color:#0F1A1A;}
      .doc-date{font-size:11px;color:#6b7280;margin-top:2px;}
      .section{margin-bottom:16px;}
      .section-title{font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;}
      .info-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;}
      .info-box{background:#f9fafb;padding:8px 10px;border-radius:6px;}
      .info-label{color:#6b7280;font-size:9px;text-transform:uppercase;}
      .info-value{font-weight:600;font-size:13px;color:#1f2937;margin-top:2px;}
      .summary-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px;}
      .summary-box{padding:12px;border-radius:6px;text-align:center;}
      .summary-box.total{background:#f3f4f6;}
      .summary-box.paid{background:#d1fae5;}
      .summary-box.pending{background:#fef3c7;}
      .summary-label{font-size:10px;color:#6b7280;}
      .summary-value{font-size:18px;font-weight:700;margin-top:4px;}
      .summary-box.total .summary-value{color:#1f2937;}
      .summary-box.paid .summary-value{color:#059669;}
      .summary-box.pending .summary-value{color:#d97706;}
      table{width:100%;border-collapse:collapse;font-size:12px;}
      th{background:#0F1A1A;color:white;padding:8px;text-align:left;font-weight:600;font-size:10px;}
      .monthly-table{margin-top:8px;}
      .monthly-table th{background:#374151;padding:6px 8px;}
      .footer{margin-top:20px;padding-top:12px;border-top:1px solid #e5e7eb;text-align:center;}
      .footer p{color:#6b7280;font-size:10px;margin:2px 0;}
    </style></head>
    <body>
      <div class="header">
        <div class="logo-section">${logoSvg}<div class="website">www.joinissy.com</div></div>
        <div class="doc-info"><div class="doc-title">Estado de Cuenta</div><div class="doc-date">${today}</div></div>
      </div>
      <div class="section">
        <div class="section-title">Información del Residente</div>
        <div class="info-grid">
          <div class="info-box"><div class="info-label">Nombre</div><div class="info-value">${userName}</div></div>
          <div class="info-box"><div class="info-label">No. Casa</div><div class="info-value">${userHouse || "N/A"}</div></div>
          <div class="info-box"><div class="info-label">Teléfono</div><div class="info-value">${userPhone || "N/A"}</div></div>
          <div class="info-box"><div class="info-label">Email</div><div class="info-value">${userEmail || "N/A"}</div></div>
          <div class="info-box" style="grid-column:span 2;"><div class="info-label">Comunidad</div><div class="info-value">${locationName || "N/A"}</div></div>
        </div>
      </div>
      <div class="section">
        <div class="section-title">Resumen</div>
        <div class="summary-grid">
          <div class="summary-box total"><div class="summary-label">Total Cargos</div><div class="summary-value">L ${totalCharged.toFixed(2)}</div></div>
          <div class="summary-box paid"><div class="summary-label">Total Pagado</div><div class="summary-value">L ${totalPaid.toFixed(2)}</div></div>
          <div class="summary-box pending"><div class="summary-label">Saldo Pendiente</div><div class="summary-value">L ${totalPending.toFixed(2)}</div></div>
        </div>
      </div>
      ${Object.keys(monthlyTotals).length > 0 ? `<div class="section">
        <div class="section-title">Resumen por Mes</div>
        <table class="monthly-table"><thead><tr><th>Mes</th><th style="text-align:right;">Pagado</th><th style="text-align:right;">Pendiente</th></tr></thead>
        <tbody>${monthlySummaryHtml}</tbody></table>
      </div>` : ""}
      <div class="section">
        <div class="section-title">Detalle de Movimientos</div>
        <table><thead><tr><th>Vencimiento</th><th>Concepto</th><th style="text-align:right;">Monto</th><th style="text-align:center;">Fecha Pago</th><th style="text-align:center;">Estado</th></tr></thead>
        <tbody>${paymentsHtml || '<tr><td colspan="5" style="padding:16px;text-align:center;color:#9ca3af;">No hay movimientos</td></tr>'}</tbody></table>
      </div>
      <div class="footer"><p><strong>ISSY</strong> - Sistema de Gestión de Comunidades</p><p>Este documento es informativo y no constituye una factura fiscal</p></div>
    </body></html>`;
  };

  const handleGeneratePDF = async () => {
    try {
      setGenerating(true);
      const html = generatePDFHtml();
      const { uri } = await Print.printToFileAsync({ html });
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Compartir Estado de Cuenta',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Error', 'Compartir no disponible');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Error', 'Error al generar el PDF');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateConsolidatedPDF = async () => {
    if (!users || users.length === 0) {
      Alert.alert("Error", "No hay residentes para generar el reporte");
      return;
    }
    
    try {
      setGeneratingAll(true);
      const headers = await getAuthHeaders();
      
      const chargesResponse = await fetch(
        `${API_URL}/api/community-payments/admin/charges?location_id=${locationId}`,
        { headers }
      );
      const chargesData = await chargesResponse.json();

      // Bug A (surfacing): mismo patrón que payments. Si el fetch de
      // /admin/charges falla o devuelve success:false, abortamos en vez de
      // generar un reporte incompleto (sin charges → todo pending=0 y math
      // sin sentido).
      if (!chargesResponse.ok || !chargesData.success) {
        console.error('Consolidado: fallo al cargar /admin/charges', {
          ok: chargesResponse.ok,
          status: chargesResponse.status,
          error: chargesData?.error,
        });
        Alert.alert(
          'Error',
          'No se pudieron cargar los cobros. No se generó el reporte. Intentá de nuevo en unos segundos.'
        );
        return; // el finally setea setGeneratingAll(false)
      }

      // Bug A (fix definitivo frontend): /admin/payments SIN limit (o con limit
      // grande) revienta con "TypeError: fetch failed" — el paso 5 del handler
      // (resolver units con .in('user_id', [~480 UUIDs])) genera una URL gigante
      // que PostgREST rechaza. Confirmado con curl: limit=100 funciona, sin limit
      // falla. Paginamos en lotes de 100 + offset y concatenamos hasta agotar.
      // (El fix de fondo del backend queda propuesto aparte, no aplicado.)
      let payments = [];
      let pmOffset = 0;
      const PAGE = 100;
      while (true) {
        const r = await fetch(
          `${API_URL}/api/community-payments/admin/payments?location_id=${locationId}&limit=${PAGE}&offset=${pmOffset}`,
          { headers }
        );
        const j = await r.json();
        if (!r.ok || !j.success) {
          console.error('[Reporte] payments page fail', {
            ok: r.ok,
            status: r.status,
            error: j?.error,
            offset: pmOffset,
          });
          Alert.alert('Error', 'No se pudieron cargar los pagos. Intentá de nuevo.');
          return; // el finally setea setGeneratingAll(false)
        }
        const batch = j.data || [];
        payments = payments.concat(batch);
        if (batch.length < PAGE) break; // última página
        pmOffset += PAGE;
      }

      const charges = chargesData.success ? chargesData.data || [] : [];
      
      const userSummaries = users.map(user => {
        const userPayments = payments.filter(p => p.user_id === user.id);
        const paidChargeIds = new Set(userPayments.map(p => p.charge_id));
        
        let totalPaid = 0;
        let totalPending = 0;
        
        userPayments.forEach(p => {
          if (p.status === "paid") totalPaid += parseFloat(p.charge?.amount || p.amount) || 0;
        });
        
        charges.forEach(charge => {
          if (paidChargeIds.has(charge.id)) return;
          const applies = charge.applies_to === "all" || (charge.specific_users && charge.specific_users.includes(user.id));
          if (applies && charge.status === "active") {
            totalPending += parseFloat(charge.amount) || 0;
          }
        });
        
        return {
          name: user.full_name || user.name || user.email,
          house: user.house_number || user.unit_number || "-",
          email: user.email || "-",
          phone: user.phone || "-",
          paid: totalPaid,
          pending: totalPending,
          total: totalPaid + totalPending,
        };
      });
      
      const grandTotalPaid = userSummaries.reduce((sum, u) => sum + u.paid, 0);
      const grandTotalPending = userSummaries.reduce((sum, u) => sum + u.pending, 0);
      const grandTotal = grandTotalPaid + grandTotalPending;
      
      const today = new Date().toLocaleDateString("es-HN", { year: "numeric", month: "long", day: "numeric" });
      
      const logoSvg = `<svg width="80" height="32" viewBox="0 0 80 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <text x="0" y="26" font-family="Arial Black, sans-serif" font-size="28" font-weight="900" fill="#0F1A1A">ISSY</text>
        <circle cx="72" cy="24" r="4" fill="#AAFF00"/>
      </svg>`;
      
      const usersHtml = userSummaries.map(u => `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${u.name}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;">${u.house}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;color:#059669;">L ${u.paid.toFixed(2)}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;color:#d97706;">L ${u.pending.toFixed(2)}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;">L ${u.total.toFixed(2)}</td>
        </tr>
      `).join("");
      
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Reporte Consolidado</title>
      <style>
        body{font-family:"Helvetica Neue",Arial,sans-serif;margin:0;padding:24px 32px;color:#1f2937;font-size:12px;}
        .header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;padding-bottom:12px;border-bottom:2px solid #0F1A1A;}
        .logo-section{display:flex;flex-direction:column;}
        .website{font-size:10px;color:#6b7280;margin-top:2px;}
        .doc-info{text-align:right;}
        .doc-title{font-size:18px;font-weight:700;color:#0F1A1A;}
        .doc-date{font-size:11px;color:#6b7280;margin-top:2px;}
        .section{margin-bottom:16px;}
        .section-title{font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;}
        .summary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px;}
        .summary-box{padding:12px;border-radius:6px;text-align:center;}
        .summary-box.users{background:#e0e7ff;}
        .summary-box.total{background:#f3f4f6;}
        .summary-box.paid{background:#d1fae5;}
        .summary-box.pending{background:#fef3c7;}
        .summary-label{font-size:10px;color:#6b7280;}
        .summary-value{font-size:18px;font-weight:700;margin-top:4px;}
        .summary-box.users .summary-value{color:#4f46e5;}
        .summary-box.total .summary-value{color:#1f2937;}
        .summary-box.paid .summary-value{color:#059669;}
        .summary-box.pending .summary-value{color:#d97706;}
        table{width:100%;border-collapse:collapse;font-size:11px;}
        th{background:#0F1A1A;color:white;padding:8px;text-align:left;font-weight:600;font-size:10px;}
        .footer{margin-top:20px;padding-top:12px;border-top:1px solid #e5e7eb;text-align:center;}
        .footer p{color:#6b7280;font-size:10px;margin:2px 0;}
        .totals-row{background:#f3f4f6;font-weight:700;}
      </style></head>
      <body>
        <div class="header">
          <div class="logo-section">${logoSvg}<div class="website">www.joinissy.com</div></div>
          <div class="doc-info"><div class="doc-title">Reporte Consolidado</div><div class="doc-date">${today}</div></div>
        </div>
        <div class="section">
          <div class="section-title">Comunidad: ${locationName || "N/A"}</div>
          <div class="summary-grid">
            <div class="summary-box users"><div class="summary-label">Residentes</div><div class="summary-value">${users.length}</div></div>
            <div class="summary-box total"><div class="summary-label">Total Cargos</div><div class="summary-value">L ${grandTotal.toFixed(2)}</div></div>
            <div class="summary-box paid"><div class="summary-label">Total Recaudado</div><div class="summary-value">L ${grandTotalPaid.toFixed(2)}</div></div>
            <div class="summary-box pending"><div class="summary-label">Total Pendiente</div><div class="summary-value">L ${grandTotalPending.toFixed(2)}</div></div>
          </div>
        </div>
        <div class="section">
          <div class="section-title">Detalle por Residente</div>
          <table>
            <thead><tr><th>Residente</th><th style="text-align:center;">No. Casa</th><th style="text-align:right;">Pagado</th><th style="text-align:right;">Pendiente</th><th style="text-align:right;">Total</th></tr></thead>
            <tbody>
              ${usersHtml}
              <tr class="totals-row">
                <td style="padding:10px 8px;" colspan="2">TOTALES</td>
                <td style="padding:10px 8px;text-align:right;color:#059669;">L ${grandTotalPaid.toFixed(2)}</td>
                <td style="padding:10px 8px;text-align:right;color:#d97706;">L ${grandTotalPending.toFixed(2)}</td>
                <td style="padding:10px 8px;text-align:right;">L ${grandTotal.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="footer"><p><strong>ISSY</strong> - Sistema de Gestión de Comunidades</p><p>Este documento es informativo y no constituye una factura fiscal</p></div>
      </body></html>`;
      
      const { uri } = await Print.printToFileAsync({ html });
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "Compartir Reporte Consolidado", UTI: "com.adobe.pdf" });
      }
    } catch (error) {
      console.error("Error generating consolidated PDF:", error);
      Alert.alert("Error", "Error al generar el reporte");
    } finally {
      setGeneratingAll(false);
    }
  };

  // ===========================================================================
  // FRENTE 2 / FASE 4 — Reporte por estado (consolidado de la comunidad)
  // Consume el endpoint de la Fase 2 (/admin/reports/consolidated) como fuente
  // de verdad y exporta el .xlsx de la Fase 3. NO recalcula nada en cliente.
  // ===========================================================================

  // Config de los 4 estados: orden, etiqueta y colores (alineados al PDF/Excel).
  const REPORT_STATES = [
    { key: 'pagados',         label: 'Pagados',         accent: '#059669', light: '#d1fae5' },
    { key: 'en_verificacion', label: 'En verificación', accent: '#2563eb', light: '#dbeafe' },
    { key: 'pendientes',      label: 'Pendientes',      accent: '#d97706', light: '#fef3c7' },
    { key: 'vencidos',        label: 'Vencidos',        accent: '#dc2626', light: '#fee2e2' },
    { key: 'rechazados',      label: 'Rechazados',      accent: '#475569', light: '#e2e8f0' },
  ];

  const moneyFmt = (n, currency) => {
    const sym = currency === 'USD' ? '$' : 'L';
    return `${sym} ${parseFloat(n || 0).toFixed(2)}`;
  };

  const escapeHtml = (s) =>
    String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  // Trae el reporte consolidado (sin charge_id → todos los cobros 'active').
  // Devuelve el objeto data, o null si falla. Cachea en reportData.
  const fetchConsolidatedReport = useCallback(async () => {
    if (!locationId) return null;
    try {
      setReportLoading(true);
      const headers = await getAuthHeaders();
      const r = await fetch(
        `${API_URL}/api/community-payments/admin/reports/consolidated?location_id=${locationId}`,
        { headers }
      );
      const j = await r.json();
      if (!r.ok || !j.success) {
        console.error('[Reporte por estado] fetch fail', { ok: r.ok, status: r.status, error: j?.error });
        Alert.alert('Error', j?.error || 'No se pudo cargar el reporte. Intentá de nuevo.');
        return null;
      }
      setReportData(j.data);
      return j.data;
    } catch (error) {
      console.error('[Reporte por estado] error', error);
      Alert.alert('Error', 'No se pudo cargar el reporte. Intentá de nuevo.');
      return null;
    } finally {
      setReportLoading(false);
    }
  }, [locationId]);

  const handleOpenStateReport = () => {
    setStep('report');
    fetchConsolidatedReport();
  };

  // Arma el HTML del PDF: encabezado de resumen + 4 secciones por estado.
  // Reusa la cáscara/branding del PDF existente (logo ISSY, header oscuro).
  const buildByStateReportHtml = (data) => {
    const { resumen, por_estado } = data;
    const currency = resumen.currency;
    const today = new Date().toLocaleDateString('es-HN', { year: 'numeric', month: 'long', day: 'numeric' });
    const money = (n) => moneyFmt(n, currency);

    const logoSvg = `<svg width="80" height="32" viewBox="0 0 80 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <text x="0" y="26" font-family="Arial Black, sans-serif" font-size="28" font-weight="900" fill="#0F1A1A">ISSY</text>
      <circle cx="72" cy="24" r="4" fill="#AAFF00"/>
    </svg>`;

    const summaryBoxes = REPORT_STATES.map((s) => `
      <div class="summary-box" style="background:${s.light};">
        <div class="summary-label">${s.label}</div>
        <div class="summary-value" style="color:${s.accent};">${money(resumen[s.key].monto)}</div>
        <div class="summary-count">${resumen[s.key].count} ${resumen[s.key].count === 1 ? 'pago' : 'pagos'}</div>
      </div>`).join('');

    const sections = REPORT_STATES.map((s) => {
      const list = por_estado[s.key] || [];
      const rows = list.length
        ? list.map((it) => `<tr>
            <td style="padding:7px 8px;border-bottom:1px solid #e5e7eb;font-weight:600;color:${s.accent};">${escapeHtml(it.unit_number || '—')}</td>
            <td style="padding:7px 8px;border-bottom:1px solid #e5e7eb;">${escapeHtml(it.resident_name || '—')}</td>
            <td style="padding:7px 8px;border-bottom:1px solid #e5e7eb;text-align:right;">${money(it.amount)}</td>
            <td style="padding:7px 8px;border-bottom:1px solid #e5e7eb;text-align:center;">${it.fecha ? formatDate(it.fecha) : '—'}</td>
          </tr>`).join('')
        : '<tr><td colspan="4" style="padding:14px;text-align:center;color:#9ca3af;">Sin registros</td></tr>';
      return `<div class="section">
        <div class="state-head" style="border-left:4px solid ${s.accent};">
          <span class="state-name">${s.label}</span>
          <span class="state-meta">${list.length} · ${money(resumen[s.key].monto)}</span>
        </div>
        <table>
          <thead><tr>
            <th style="width:18%;">Unidad</th><th>Residente</th>
            <th style="text-align:right;width:20%;">Monto</th><th style="text-align:center;width:20%;">Fecha</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
    }).join('');

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Reporte de Cobros</title>
    <style>
      body{font-family:"Helvetica Neue",Arial,sans-serif;margin:0;padding:24px 32px;color:#1f2937;font-size:13px;}
      .header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;padding-bottom:12px;border-bottom:2px solid #0F1A1A;}
      .logo-section{display:flex;flex-direction:column;}
      .website{font-size:10px;color:#6b7280;margin-top:2px;}
      .doc-info{text-align:right;}
      .doc-title{font-size:18px;font-weight:700;color:#0F1A1A;}
      .doc-date{font-size:11px;color:#6b7280;margin-top:2px;}
      .section{margin-bottom:18px;}
      .section-title{font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;}
      .summary-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:12px;}
      .summary-box{padding:12px;border-radius:6px;text-align:center;}
      .summary-label{font-size:10px;color:#6b7280;}
      .summary-value{font-size:17px;font-weight:700;margin-top:4px;}
      .summary-count{font-size:9px;color:#6b7280;margin-top:2px;}
      .totals-bar{display:flex;justify-content:space-between;align-items:center;background:#f3f4f6;border-radius:6px;padding:10px 14px;margin-bottom:8px;}
      .totals-bar .t-item{font-size:11px;color:#6b7280;}
      .totals-bar .t-item b{display:block;font-size:15px;color:#1f2937;margin-top:2px;}
      .progress{height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden;margin-top:6px;}
      .progress > div{height:100%;background:#059669;}
      table{width:100%;border-collapse:collapse;font-size:12px;}
      th{background:#0F1A1A;color:white;padding:8px;text-align:left;font-weight:600;font-size:10px;}
      .state-head{display:flex;justify-content:space-between;align-items:center;padding:6px 10px;margin-bottom:6px;background:#f9fafb;border-radius:4px;}
      .state-name{font-weight:700;font-size:13px;color:#1f2937;}
      .state-meta{font-size:11px;color:#6b7280;}
      .footer{margin-top:20px;padding-top:12px;border-top:1px solid #e5e7eb;text-align:center;}
      .footer p{color:#6b7280;font-size:10px;margin:2px 0;}
    </style></head>
    <body>
      <div class="header">
        <div class="logo-section">${logoSvg}<div class="website">www.joinissy.com</div></div>
        <div class="doc-info"><div class="doc-title">Reporte de Cobros</div><div class="doc-date">${today}</div></div>
      </div>
      <div class="section">
        <div class="section-title">Comunidad: ${escapeHtml(locationName || 'N/A')}</div>
        <div class="summary-grid">${summaryBoxes}</div>
        <div class="totals-bar">
          <div class="t-item">Total esperado<b>${money(resumen.total_esperado)}</b></div>
          <div class="t-item">Total recaudado<b style="color:#059669;">${money(resumen.total_recaudado)}</b></div>
          <div class="t-item">Avance<b>${resumen.pct_avance}%</b></div>
        </div>
        <div class="progress"><div style="width:${Math.min(100, Math.max(0, resumen.pct_avance))}%;"></div></div>
      </div>
      ${sections}
      <div class="footer"><p><strong>ISSY</strong> - Sistema de Gestión de Comunidades</p><p>Este documento es informativo y no constituye una factura fiscal</p></div>
    </body></html>`;
  };

  const handleGenerateByStatePDF = async () => {
    try {
      setGeneratingByState(true);
      // Usa la data ya cargada; si no está (p.ej. falló), reintenta el fetch.
      const data = reportData || (await fetchConsolidatedReport());
      if (!data) return;
      const html = buildByStateReportHtml(data);
      const { uri } = await Print.printToFileAsync({ html });
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Compartir Reporte de Cobros',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Error', 'Compartir no disponible');
      }
    } catch (error) {
      console.error('Error generating by-state PDF:', error);
      Alert.alert('Error', 'Error al generar el PDF');
    } finally {
      setGeneratingByState(false);
    }
  };

  // Descarga el .xlsx (Fase 3) con auth headers y lo comparte. downloadAsync
  // (legacy) acepta { headers } para mandar el Bearer token.
  const handleExportExcel = async () => {
    if (!locationId) return;
    try {
      setExportingExcel(true);
      const headers = await getAuthHeaders();
      const stamp = new Date().toISOString().slice(0, 10);
      const filename = `reporte-cobros-${stamp}.xlsx`;
      const localUri = FileSystem.cacheDirectory + filename;
      const url = `${API_URL}/api/community-payments/admin/reports/consolidated.xlsx?location_id=${locationId}`;

      const downloadResult = await FileSystem.downloadAsync(url, localUri, {
        headers: { Authorization: headers.Authorization },
      });

      if (downloadResult.status !== 200) {
        console.error('[Excel] download fail', { status: downloadResult.status });
        Alert.alert('Error', 'No se pudo descargar el Excel. Intentá de nuevo.');
        return;
      }

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(downloadResult.uri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: 'Compartir Reporte (Excel)',
          UTI: 'org.openxmlformats.spreadsheetml.sheet',
        });
      } else {
        Alert.alert('Error', 'Compartir no disponible');
      }
    } catch (error) {
      console.error('Error exporting Excel:', error);
      Alert.alert('Error', 'Error al exportar el Excel');
    } finally {
      setExportingExcel(false);
    }
  };

  useEffect(() => {
    if (!visible) {
      setStep('select');
      setSelectedUser(null);
      setUserPayments([]);
      setSearchQuery('');
      setReportData(null);
    }
  }, [visible]);

  const { totalCharged, totalPaid, totalPending } = calculateTotals();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          {step !== 'select' ? (
            <TouchableOpacity onPress={handleBack}>
              <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.cancelText}>Cerrar</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.title}>
            {step === 'select' ? 'Estado de Cuenta' : step === 'report' ? 'Reporte de Cobros' : 'Vista Previa'}
          </Text>
          <View style={{ width: 60 }} />
        </View>

        {step === 'select' ? (
          <View style={styles.content}>
            <Text style={styles.subtitle}>Selecciona un residente</Text>
            
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={COLORS.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar por nombre o unidad..."
                placeholderTextColor={COLORS.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={styles.usersList}>
              {filteredUsers.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="people-outline" size={48} color={COLORS.textMuted} />
                  <Text style={styles.emptyText}>
                    {searchQuery ? 'No se encontraron resultados' : 'No hay residentes'}
                  </Text>
                </View>
              ) : (
                filteredUsers.map((user) => (
                  <TouchableOpacity
                    key={user.id}
                    style={styles.userCard}
                    onPress={() => handleSelectUser(user)}
                  >
                    <View style={styles.userAvatar}>
                      <Text style={styles.userAvatarText}>
                        {(user.full_name || user.name || 'U')[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>
                        {user.full_name || user.name || user.email}
                      </Text>
                      <Text style={styles.userUnit}>
                        {user.unit_number ? `Casa ${user.unit_number}` : user.email}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.stateReportButton}
              onPress={handleOpenStateReport}
            >
              <Ionicons name="stats-chart" size={18} color={COLORS.background} />
              <Text style={styles.stateReportButtonText}>Reporte por Estado</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.consolidatedButton}
              onPress={handleGenerateConsolidatedPDF}
              disabled={generatingAll || !users || users.length === 0}
            >
              {generatingAll ? (
                <ActivityIndicator size="small" color={COLORS.teal} />
              ) : (
                <>
                  <Ionicons name="document-text" size={18} color={COLORS.teal} />
                  <Text style={styles.consolidatedButtonText}>Reporte General de Todos</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : step === 'report' ? (
          <View style={styles.content}>
            {reportLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.lime} />
                <Text style={styles.loadingText}>Cargando reporte...</Text>
              </View>
            ) : !reportData ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="alert-circle-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>No se pudo cargar el reporte</Text>
                <TouchableOpacity style={styles.retryButton} onPress={fetchConsolidatedReport}>
                  <Text style={styles.retryButtonText}>Reintentar</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.reportSummaryGrid}>
                  {REPORT_STATES.map((s) => (
                    <View key={s.key} style={[styles.stateSummaryCard, { backgroundColor: s.light + '20' }]}>
                      <Text style={styles.summaryLabel}>{s.label}</Text>
                      <Text style={[styles.summaryValue, { color: s.accent }]}>
                        {moneyFmt(reportData.resumen[s.key].monto, reportData.resumen.currency)}
                      </Text>
                      <Text style={styles.stateSummaryCount}>{reportData.resumen[s.key].count}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.totalsRow}>
                  <View style={styles.totalsItem}>
                    <Text style={styles.totalsLabel}>Esperado</Text>
                    <Text style={styles.totalsValue}>
                      {moneyFmt(reportData.resumen.total_esperado, reportData.resumen.currency)}
                    </Text>
                  </View>
                  <View style={styles.totalsItem}>
                    <Text style={styles.totalsLabel}>Recaudado</Text>
                    <Text style={[styles.totalsValue, { color: COLORS.success }]}>
                      {moneyFmt(reportData.resumen.total_recaudado, reportData.resumen.currency)}
                    </Text>
                  </View>
                  <View style={styles.totalsItem}>
                    <Text style={styles.totalsLabel}>Avance</Text>
                    <Text style={styles.totalsValue}>{reportData.resumen.pct_avance}%</Text>
                  </View>
                </View>

                <ScrollView style={styles.paymentsList}>
                  {REPORT_STATES.map((s) => {
                    const list = reportData.por_estado[s.key] || [];
                    return (
                      <View key={s.key} style={{ marginBottom: scale(16) }}>
                        <View style={[styles.stateSectionHeader, { borderLeftColor: s.accent }]}>
                          <Text style={styles.stateSectionTitle}>{s.label}</Text>
                          <Text style={styles.stateSectionMeta}>
                            {list.length} · {moneyFmt(reportData.resumen[s.key].monto, reportData.resumen.currency)}
                          </Text>
                        </View>
                        {list.length === 0 ? (
                          <Text style={styles.stateEmptyRow}>Sin registros</Text>
                        ) : (
                          list.map((it, idx) => (
                            <View key={idx} style={styles.reportRow}>
                              <Text style={[styles.reportUnit, { color: s.accent }]} numberOfLines={1}>
                                {it.unit_number || '—'}
                              </Text>
                              <Text style={styles.reportName} numberOfLines={1}>
                                {it.resident_name || '—'}
                              </Text>
                              <Text style={styles.reportAmount}>
                                {moneyFmt(it.amount, reportData.resumen.currency)}
                              </Text>
                            </View>
                          ))
                        )}
                      </View>
                    );
                  })}
                </ScrollView>

                <View style={styles.reportActions}>
                  <TouchableOpacity
                    style={[styles.reportActionBtn, styles.reportPdfBtn]}
                    onPress={handleGenerateByStatePDF}
                    disabled={generatingByState || exportingExcel}
                  >
                    {generatingByState ? (
                      <ActivityIndicator size="small" color={COLORS.background} />
                    ) : (
                      <>
                        <Ionicons name="document-text" size={18} color={COLORS.background} />
                        <Text style={styles.reportPdfBtnText}>PDF</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.reportActionBtn, styles.reportExcelBtn]}
                    onPress={handleExportExcel}
                    disabled={exportingExcel || generatingByState}
                  >
                    {exportingExcel ? (
                      <ActivityIndicator size="small" color={COLORS.teal} />
                    ) : (
                      <>
                        <Ionicons name="grid-outline" size={18} color={COLORS.teal} />
                        <Text style={styles.reportExcelBtnText}>Exportar Excel</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        ) : (
          <View style={styles.content}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.lime} />
                <Text style={styles.loadingText}>Cargando historial...</Text>
              </View>
            ) : (
              <>
                <View style={styles.userHeader}>
                  <View style={styles.userAvatarLarge}>
                    <Text style={styles.userAvatarTextLarge}>
                      {(selectedUser?.full_name || selectedUser?.name || 'U')[0].toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.userHeaderInfo}>
                    <Text style={styles.userHeaderName}>
                      {selectedUser?.full_name || selectedUser?.name}
                    </Text>
                    <Text style={styles.userHeaderUnit}>
                      {selectedUser?.unit_number ? `Casa ${selectedUser.unit_number}` : selectedUser?.email}
                    </Text>
                  </View>
                </View>

                <View style={styles.summaryContainer}>
                  <View style={[styles.summaryCard, styles.summaryTotal]}>
                    <Text style={styles.summaryLabel}>Total Cargos</Text>
                    <Text style={[styles.summaryValue, { color: COLORS.textPrimary }]}>
                      {formatCurrency(totalCharged)}
                    </Text>
                  </View>
                  <View style={[styles.summaryCard, styles.summaryPaid]}>
                    <Text style={styles.summaryLabel}>Pagado</Text>
                    <Text style={[styles.summaryValue, { color: COLORS.success }]}>
                      {formatCurrency(totalPaid)}
                    </Text>
                  </View>
                  <View style={[styles.summaryCard, styles.summaryPending]}>
                    <Text style={styles.summaryLabel}>Pendiente</Text>
                    <Text style={[styles.summaryValue, { color: COLORS.warning }]}>
                      {formatCurrency(totalPending)}
                    </Text>
                  </View>
                </View>

                <Text style={styles.sectionTitle}>Movimientos</Text>
                <ScrollView style={styles.paymentsList}>
                  {userPayments.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <Ionicons name="document-text-outline" size={48} color={COLORS.textMuted} />
                      <Text style={styles.emptyText}>No hay movimientos</Text>
                    </View>
                  ) : (
                    userPayments.map((item, index) => {
                      const isPaid = item.status === 'paid';
                      const isProofSubmitted = item.status === 'proof_submitted';
                      
                      return (
                        <View key={item.id || index} style={styles.paymentItem}>
                          <View style={styles.paymentItemLeft}>
                            <Text style={styles.paymentTitle}>{item.title || 'Cobro'}</Text>
                            <Text style={styles.paymentDate}>
                              {formatDate(item.due_date || item.created_at)}
                            </Text>
                          </View>
                          <View style={styles.paymentItemRight}>
                            <Text style={styles.paymentAmount}>
                              {formatCurrency(item.amount)}
                            </Text>
                            <View style={[
                              styles.paymentStatus,
                              { backgroundColor: isPaid ? COLORS.success + '20' : 
                                                isProofSubmitted ? COLORS.blue + '20' : COLORS.warning + '20' }
                            ]}>
                              <Text style={[
                                styles.paymentStatusText,
                                { color: isPaid ? COLORS.success : 
                                         isProofSubmitted ? COLORS.blue : COLORS.warning }
                              ]}>
                                {isPaid ? 'Pagado' : isProofSubmitted ? 'En revisión' : 'Pendiente'}
                              </Text>
                            </View>
                          </View>
                        </View>
                      );
                    })
                  )}
                </ScrollView>

                <TouchableOpacity
                  style={styles.generateButton}
                  onPress={handleGeneratePDF}
                  disabled={generating}
                >
                  {generating ? (
                    <ActivityIndicator size="small" color={COLORS.background} />
                  ) : (
                    <>
                      <Ionicons name="document-text" size={20} color={COLORS.background} />
                      <Text style={styles.generateButtonText}>Generar PDF</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  cancelText: {
    fontSize: scale(16),
    color: COLORS.textSecondary,
  },
  title: {
    fontSize: scale(17),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  content: {
    flex: 1,
    padding: scale(16),
  },
  subtitle: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    marginBottom: scale(16),
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(12),
    paddingHorizontal: scale(12),
    marginBottom: scale(16),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: scale(12),
    paddingHorizontal: scale(8),
    fontSize: scale(16),
    color: COLORS.textPrimary,
  },
  usersList: {
    flex: 1,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(12),
    padding: scale(12),
    marginBottom: scale(8),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  userAvatar: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: COLORS.teal + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  userAvatarText: {
    fontSize: scale(18),
    fontWeight: '600',
    color: COLORS.teal,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  userUnit: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(40),
  },
  emptyText: {
    fontSize: scale(14),
    color: COLORS.textMuted,
    marginTop: scale(12),
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    marginTop: scale(12),
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(20),
  },
  userAvatarLarge: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    backgroundColor: COLORS.teal + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(16),
  },
  userAvatarTextLarge: {
    fontSize: scale(24),
    fontWeight: '600',
    color: COLORS.teal,
  },
  userHeaderInfo: {
    flex: 1,
  },
  userHeaderName: {
    fontSize: scale(20),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  userHeaderUnit: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    marginTop: scale(4),
  },
  summaryContainer: {
    flexDirection: 'row',
    gap: scale(10),
    marginBottom: scale(20),
  },
  summaryCard: {
    flex: 1,
    padding: scale(12),
    borderRadius: scale(12),
    alignItems: 'center',
  },
  summaryTotal: {
    backgroundColor: COLORS.backgroundSecondary,
  },
  summaryPaid: {
    backgroundColor: COLORS.success + '15',
  },
  summaryPending: {
    backgroundColor: COLORS.warning + '15',
  },
  summaryLabel: {
    fontSize: scale(11),
    color: COLORS.textSecondary,
    marginBottom: scale(4),
  },
  summaryValue: {
    fontSize: scale(14),
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: scale(12),
  },
  paymentsList: {
    flex: 1,
  },
  paymentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(10),
    padding: scale(12),
    marginBottom: scale(8),
  },
  paymentItemLeft: {
    flex: 1,
  },
  paymentTitle: {
    fontSize: scale(14),
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  paymentDate: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },
  paymentItemRight: {
    alignItems: 'flex-end',
  },
  paymentAmount: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  paymentStatus: {
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: scale(6),
    marginTop: scale(4),
  },
  paymentStatusText: {
    fontSize: scale(11),
    fontWeight: '500',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.lime,
    paddingVertical: scale(16),
    borderRadius: scale(12),
    marginTop: scale(16),
    gap: scale(8),
  },
  generateButtonText: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.background,
  },
  consolidatedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.teal + '15',
    borderWidth: 1,
    borderColor: COLORS.teal,
    paddingVertical: scale(14),
    borderRadius: scale(12),
    marginTop: scale(16),
    gap: scale(8),
  },
  consolidatedButtonText: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.teal,
  },
  // Frente 2 / Fase 4 — reporte por estado
  stateReportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.lime,
    paddingVertical: scale(14),
    borderRadius: scale(12),
    marginTop: scale(16),
    gap: scale(8),
  },
  stateReportButtonText: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.background,
  },
  reportSummaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
    marginBottom: scale(16),
  },
  stateSummaryCard: {
    flexBasis: '30%',
    flexGrow: 1,
    padding: scale(10),
    borderRadius: scale(12),
    alignItems: 'center',
  },
  stateSummaryCount: {
    fontSize: scale(11),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(12),
    padding: scale(12),
    marginBottom: scale(16),
  },
  totalsItem: {
    flex: 1,
    alignItems: 'center',
  },
  totalsLabel: {
    fontSize: scale(11),
    color: COLORS.textSecondary,
    marginBottom: scale(2),
  },
  totalsValue: {
    fontSize: scale(14),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  stateSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    borderLeftWidth: scale(4),
    borderRadius: scale(6),
    paddingVertical: scale(8),
    paddingHorizontal: scale(10),
    marginBottom: scale(6),
  },
  stateSectionTitle: {
    fontSize: scale(14),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  stateSectionMeta: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
  },
  stateEmptyRow: {
    fontSize: scale(12),
    color: COLORS.textMuted,
    paddingVertical: scale(8),
    paddingHorizontal: scale(10),
    fontStyle: 'italic',
  },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(7),
    paddingHorizontal: scale(10),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  reportUnit: {
    width: scale(56),
    fontSize: scale(13),
    fontWeight: '700',
  },
  reportName: {
    flex: 1,
    fontSize: scale(13),
    color: COLORS.textPrimary,
    paddingHorizontal: scale(8),
  },
  reportAmount: {
    fontSize: scale(13),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  reportActions: {
    flexDirection: 'row',
    gap: scale(10),
    marginTop: scale(12),
  },
  reportActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(15),
    borderRadius: scale(12),
    gap: scale(8),
  },
  reportPdfBtn: {
    backgroundColor: COLORS.lime,
  },
  reportPdfBtnText: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.background,
  },
  reportExcelBtn: {
    backgroundColor: COLORS.teal + '15',
    borderWidth: 1,
    borderColor: COLORS.teal,
  },
  reportExcelBtnText: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.teal,
  },
  retryButton: {
    marginTop: scale(16),
    paddingVertical: scale(10),
    paddingHorizontal: scale(20),
    borderRadius: scale(10),
    borderWidth: 1,
    borderColor: COLORS.teal,
  },
  retryButtonText: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.teal,
  },
});

export default StatementModal;
