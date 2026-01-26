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
      
      const paymentsResponse = await fetch(
        `${API_URL}/api/community-payments/admin/payments?location_id=${locationId}`,
        { headers }
      );
      const paymentsData = await paymentsResponse.json();
      
      const charges = chargesData.success ? chargesData.data || [] : [];
      const payments = paymentsData.success ? paymentsData.data || [] : [];
      
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

  useEffect(() => {
    if (!visible) {
      setStep('select');
      setSelectedUser(null);
      setUserPayments([]);
      setSearchQuery('');
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
          {step === 'preview' ? (
            <TouchableOpacity onPress={handleBack}>
              <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.cancelText}>Cerrar</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.title}>
            {step === 'select' ? 'Estado de Cuenta' : 'Vista Previa'}
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
});

export default StatementModal;
