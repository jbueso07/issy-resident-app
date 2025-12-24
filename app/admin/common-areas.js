import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../config/supabase';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../utils/usePermissions';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.joinissy.com';

const CATEGORIES = [
  { id: 'pool', icon: '🏊', color: '#3B82F6' },
  { id: 'gym', icon: '🏋️', color: '#EF4444' },
  { id: 'court', icon: '🎾', color: '#10B981' },
  { id: 'bbq', icon: '🍖', color: '#F59E0B' },
  { id: 'salon', icon: '🎉', color: '#8B5CF6' },
  { id: 'playground', icon: '🛝', color: '#EC4899' },
  { id: 'terrace', icon: '🌇', color: '#6366F1' },
  { id: 'garden', icon: '🌳', color: '#22C55E' },
  { id: 'parking', icon: '🅿️', color: '#64748B' },
  { id: 'other', icon: '📍', color: '#78716C' }
];

const DAYS_OF_WEEK = [
  { id: 0, key: 'sunday' },
  { id: 1, key: 'monday' },
  { id: 2, key: 'tuesday' },
  { id: 3, key: 'wednesday' },
  { id: 4, key: 'thursday' },
  { id: 5, key: 'friday' },
  { id: 6, key: 'saturday' }
];

const CommonAreas = () => {
  const { t } = useTranslation();
  const { user, token } = useAuth();
  const permissions = usePermissions();
  const fileInputRef = useRef(null);

  const [areas, setAreas] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingArea, setEditingArea] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedArea, setSelectedArea] = useState(null);
  const [schedules, setSchedules] = useState([]);
  
  // Image upload state
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

  // Form state
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'other',
    is_paid: false,
    price_per_hour: 0,
    capacity: 10,
    min_hours: 1,
    max_hours: 4,
    max_advance_days: 30,
    requires_approval: false,
    location_id: '',
    is_24_hours: false,
    available_from: '08:00',
    available_until: '20:00',
    image_url: ''
  });

  useEffect(() => {
    loadAreas();
    loadStats();
    if (permissions.isSuperAdmin) {
      loadLocations();
    }
  }, []);

  const loadLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name, address')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

  const loadAreas = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('common_areas')
        .select('*, location:locations(name)')
        .order('name');

      if (permissions.isAdmin && !permissions.isSuperAdmin) {
        query = query.eq('location_id', user?.location_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setAreas(data || []);
    } catch (error) {
      console.error('Error loading areas:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const { data, error } = await supabase.rpc('get_area_stats', {
        p_location_id: permissions.isAdmin && !permissions.isSuperAdmin ? user?.location_id : null
      });
      if (error) throw error;
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadSchedules = async (areaId) => {
    try {
      const { data, error } = await supabase
        .from('area_schedules')
        .select('*')
        .eq('area_id', areaId)
        .order('day_of_week');
      
      if (error) throw error;
      setSchedules(data || []);
    } catch (error) {
      console.error('Error loading schedules:', error);
    }
  };

  // Image upload handler
  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Solo se permiten imágenes JPEG, PNG o WebP');
      return;
    }

    // Validar tamaño (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no debe superar 5MB');
      return;
    }

    // Mostrar preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);

    // Subir imagen
    try {
      setUploadingImage(true);
      
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(`${API_URL}/api/upload/common-area-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setForm(prev => ({ ...prev, image_url: data.data.url }));
      } else {
        alert(data.error || 'Error al subir la imagen');
        setImagePreview(null);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error al subir la imagen');
      setImagePreview(null);
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = () => {
    setForm(prev => ({ ...prev, image_url: '' }));
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Determinar location_id
    let locationId;
    if (permissions.isSuperAdmin) {
      if (!form.location_id) {
        alert('Por favor selecciona una ubicación');
        return;
      }
      locationId = form.location_id;
    } else {
      locationId = user?.location_id;
    }

    if (!locationId) {
      alert('Error: No se pudo determinar la ubicación');
      return;
    }

    try {
      const payload = {
        location_id: locationId,
        name: form.name,
        type: form.category,
        description: form.description || null,
        capacity: form.capacity,
        hourly_rate: form.is_paid ? form.price_per_hour : 0,
        min_duration_hours: form.min_hours,
        max_duration_hours: form.max_hours,
        advance_booking_days: form.max_advance_days,
        requires_approval: form.requires_approval,
        is_24_hours: form.is_24_hours,
        available_from: form.is_24_hours ? '00:00:00' : form.available_from + ':00',
        available_until: form.is_24_hours ? '23:59:00' : form.available_until + ':00',
        image_url: form.image_url || null
      };

      if (editingArea) {
        const { error } = await supabase
          .from('common_areas')
          .update(payload)
          .eq('id', editingArea.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('common_areas')
          .insert([payload]);
        if (error) throw error;
      }

      setShowModal(false);
      resetForm();
      loadAreas();
      loadStats();
    } catch (error) {
      console.error('Error saving area:', error);
      alert(t('errors.generic'));
    }
  };

  const handleEdit = (area) => {
    setEditingArea(area);
    setForm({
      name: area.name,
      description: area.description || '',
      category: area.type || 'other',
      is_paid: (area.hourly_rate || 0) > 0,
      price_per_hour: area.hourly_rate || 0,
      capacity: area.capacity || 10,
      min_hours: area.min_duration_hours || 1,
      max_hours: area.max_duration_hours || 4,
      max_advance_days: area.advance_booking_days || 30,
      requires_approval: area.requires_approval || false,
      location_id: area.location_id || '',
      is_24_hours: area.is_24_hours || false,
      available_from: area.available_from ? area.available_from.substring(0, 5) : '08:00',
      available_until: area.available_until ? area.available_until.substring(0, 5) : '20:00',
      image_url: area.image_url || ''
    });
    setImagePreview(area.image_url || null);
    setShowModal(true);
  };

  const handleDelete = async (area) => {
    if (!confirm(t('areas.messages.deleteConfirm', { name: area.name }))) return;
    
    try {
      const { error } = await supabase
        .from('common_areas')
        .delete()
        .eq('id', area.id);
      
      if (error) throw error;
      loadAreas();
      loadStats();
    } catch (error) {
      console.error('Error deleting area:', error);
      alert(t('errors.generic'));
    }
  };

  const handleToggleActive = async (area) => {
    try {
      const { error } = await supabase
        .from('common_areas')
        .update({ is_active: !area.is_active })
        .eq('id', area.id);
      
      if (error) throw error;
      loadAreas();
    } catch (error) {
      console.error('Error toggling area:', error);
    }
  };

  const handleManageSchedule = async (area) => {
    setSelectedArea(area);
    await loadSchedules(area.id);
    setShowScheduleModal(true);
  };

  const handleSaveSchedule = async (dayOfWeek, startTime, endTime, blockDuration) => {
    try {
      const existing = schedules.find(s => s.day_of_week === dayOfWeek);
      
      if (existing) {
        if (!startTime || !endTime) {
          await supabase
            .from('area_schedules')
            .delete()
            .eq('id', existing.id);
        } else {
          await supabase
            .from('area_schedules')
            .update({
              start_time: startTime,
              end_time: endTime,
              block_duration_minutes: blockDuration
            })
            .eq('id', existing.id);
        }
      } else if (startTime && endTime) {
        await supabase
          .from('area_schedules')
          .insert([{
            area_id: selectedArea.id,
            day_of_week: dayOfWeek,
            start_time: startTime,
            end_time: endTime,
            block_duration_minutes: blockDuration
          }]);
      }

      await loadSchedules(selectedArea.id);
    } catch (error) {
      console.error('Error saving schedule:', error);
    }
  };

  const resetForm = () => {
    setEditingArea(null);
    setImagePreview(null);
    setForm({
      name: '',
      description: '',
      category: 'other',
      is_paid: false,
      price_per_hour: 0,
      capacity: 10,
      min_hours: 1,
      max_hours: 4,
      max_advance_days: 30,
      requires_approval: false,
      location_id: user?.location_id || '',
      is_24_hours: false,
      available_from: '08:00',
      available_until: '20:00',
      image_url: ''
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getCategoryInfo = (categoryId) => {
    return CATEGORIES.find(c => c.id === categoryId) || CATEGORIES[CATEGORIES.length - 1];
  };

  const formatCurrency = (amount, currency = 'HNL') => {
    const symbol = currency === 'HNL' ? 'L' : '$';
    return `${symbol} ${parseFloat(amount || 0).toFixed(2)}`;
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#111827' }}>
            {t('areas.title')}
          </h1>
          <p style={{ margin: '4px 0 0', color: '#6B7280', fontSize: '14px' }}>
            {t('areas.subtitle')}
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          ➕ {t('areas.addNew')}
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <StatCard
            icon="🏢"
            label={t('areas.stats.totalAreas')}
            value={stats.total_areas}
            color="#3B82F6"
          />
          <StatCard
            icon="📅"
            label={t('areas.stats.reservationsThisMonth')}
            value={stats.total_reservations_this_month}
            color="#10B981"
          />
          <StatCard
            icon="💰"
            label={t('areas.stats.revenueThisMonth')}
            value={formatCurrency(stats.revenue_this_month)}
            color="#F59E0B"
          />
          <StatCard
            icon="⏳"
            label={t('areas.stats.pendingApprovals')}
            value={stats.pending_approvals}
            color="#EF4444"
          />
        </div>
      )}

      {/* Areas Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#6B7280' }}>
          {t('app.loading')}
        </div>
      ) : areas.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <span style={{ fontSize: '48px' }}>🏊</span>
          <h3 style={{ margin: '16px 0 8px', color: '#111827' }}>{t('areas.noAreas')}</h3>
          <p style={{ color: '#6B7280', marginBottom: '20px' }}>{t('areas.createFirst')}</p>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            style={{
              padding: '10px 24px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            {t('areas.addNew')}
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '20px'
        }}>
          {areas.map(area => {
            const cat = getCategoryInfo(area.type);
            return (
              <div
                key={area.id}
                style={{
                  background: 'white',
                  borderRadius: '12px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  overflow: 'hidden',
                  opacity: area.is_active ? 1 : 0.6
                }}
              >
                {/* Area Image */}
                {area.image_url ? (
                  <div style={{
                    width: '100%',
                    height: '160px',
                    backgroundImage: `url(${area.image_url})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }} />
                ) : (
                  <div style={{
                    width: '100%',
                    height: '160px',
                    background: `linear-gradient(135deg, ${cat.color}15 0%, ${cat.color}25 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <span style={{ fontSize: '64px', opacity: 0.5 }}>{cat.icon}</span>
                  </div>
                )}

                {/* Card Header */}
                <div style={{
                  padding: '16px',
                  borderBottom: '1px solid #E5E7EB'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{
                        fontSize: '24px',
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: `${cat.color}15`,
                        borderRadius: '10px'
                      }}>
                        {cat.icon}
                      </span>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                          {area.name}
                        </h3>
                        <span style={{
                          fontSize: '12px',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          background: cat.color,
                          color: 'white'
                        }}>
                          {t(`areas.categories.${area.type}`)}
                        </span>
                      </div>
                    </div>
                    <div style={{
                      padding: '4px 8px',
                      borderRadius: '12px',
                      background: area.is_active ? '#D1FAE5' : '#FEE2E2',
                      color: area.is_active ? '#065F46' : '#DC2626',
                      fontSize: '11px',
                      fontWeight: '600'
                    }}>
                      {area.is_active ? t('common.active') : t('common.inactive')}
                    </div>
                  </div>
                  {/* Mostrar ubicación para superadmin */}
                  {permissions.isSuperAdmin && area.location && (
                    <div style={{
                      marginTop: '8px',
                      fontSize: '12px',
                      color: '#6B7280',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      📍 {area.location.name}
                    </div>
                  )}
                </div>

                {/* Card Body */}
                <div style={{ padding: '16px' }}>
                  {area.description && (
                    <p style={{
                      margin: '0 0 12px',
                      fontSize: '13px',
                      color: '#6B7280',
                      lineHeight: '1.5'
                    }}>
                      {area.description}
                    </p>
                  )}

                  {/* Info Badges */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                    <InfoBadge icon="👥" text={`${area.capacity || 10} personas`} />
                    <InfoBadge icon="⏱️" text={`${area.min_duration_hours || 1}-${area.max_duration_hours || 4}h`} />
                    <InfoBadge icon="📆" text={`${area.advance_booking_days || 30} días`} />
                    {(area.hourly_rate || 0) > 0 && (
                      <InfoBadge icon="💵" text={formatCurrency(area.hourly_rate)} highlight />
                    )}
                    {area.requires_approval && (
                      <InfoBadge icon="✋" text={t('areas.requiresApproval')} highlight />
                    )}
                  </div>

                  {/* Horario */}
                  <div style={{
                    fontSize: '12px',
                    color: '#6B7280',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    🕐 {area.is_24_hours
                      ? '24 horas'
                      : `${area.available_from?.substring(0, 5)} - ${area.available_until?.substring(0, 5)}`
                    }
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <ActionButton
                      icon="✏️"
                      label={t('common.edit')}
                      onClick={() => handleEdit(area)}
                    />
                    <ActionButton
                      icon="📅"
                      label={t('areas.schedule')}
                      onClick={() => handleManageSchedule(area)}
                    />
                    <ActionButton
                      icon={area.is_active ? '⏸️' : '▶️'}
                      label={area.is_active ? t('common.deactivate') : t('common.activate')}
                      onClick={() => handleToggleActive(area)}
                    />
                    <ActionButton
                      icon="🗑️"
                      label={t('common.delete')}
                      onClick={() => handleDelete(area)}
                      danger
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Crear/Editar */}
      {showModal && (
        <Modal
          title={editingArea ? t('areas.editArea') : t('areas.addNew')}
          onClose={() => { setShowModal(false); resetForm(); }}
        >
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Imagen del área */}
              <FormField label="📷 Imagen del área">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageSelect}
                  style={{ display: 'none' }}
                />
                
                {(imagePreview || form.image_url) ? (
                  <div style={{ position: 'relative' }}>
                    <img
                      src={imagePreview || form.image_url}
                      alt="Preview"
                      style={{
                        width: '100%',
                        height: '180px',
                        objectFit: 'cover',
                        borderRadius: '12px'
                      }}
                    />
                    <div style={{
                      position: 'absolute',
                      bottom: '12px',
                      right: '12px',
                      display: 'flex',
                      gap: '8px'
                    }}>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage}
                        style={{
                          padding: '8px 16px',
                          background: '#14B8A6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '500',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        📷 Cambiar
                      </button>
                      <button
                        type="button"
                        onClick={removeImage}
                        style={{
                          padding: '8px 12px',
                          background: 'white',
                          color: '#EF4444',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                    {uploadingImage && (
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.5)',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '14px'
                      }}>
                        Subiendo imagen...
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    style={{
                      width: '100%',
                      padding: '40px 20px',
                      border: '2px dashed #D1D5DB',
                      borderRadius: '12px',
                      background: '#F9FAFB',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    {uploadingImage ? (
                      <>
                        <span style={{ fontSize: '24px' }}>⏳</span>
                        <span style={{ color: '#6B7280' }}>Subiendo imagen...</span>
                      </>
                    ) : (
                      <>
                        <span style={{ fontSize: '32px' }}>📷</span>
                        <span style={{ color: '#6B7280', fontWeight: '500' }}>Agregar imagen</span>
                        <span style={{ color: '#9CA3AF', fontSize: '12px' }}>JPEG, PNG o WebP (máx. 5MB)</span>
                      </>
                    )}
                  </button>
                )}
              </FormField>

              {/* Ubicación (solo SuperAdmin) */}
              {permissions.isSuperAdmin && (
                <FormField label="📍 Ubicación / Comunidad" required>
                  <select
                    value={form.location_id}
                    onChange={(e) => setForm({ ...form, location_id: e.target.value })}
                    required
                    style={inputStyle}
                  >
                    <option value="">-- Selecciona una ubicación --</option>
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} {loc.address ? `- ${loc.address}` : ''}
                      </option>
                    ))}
                  </select>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6B7280' }}>
                    El área quedará disponible para los usuarios de esta comunidad
                  </p>
                </FormField>
              )}

              {/* Nombre */}
              <FormField label={t('areas.form.name')} required>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={t('areas.form.namePlaceholder')}
                  required
                  style={inputStyle}
                />
              </FormField>

              {/* Descripción */}
              <FormField label={t('areas.form.description')}>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder={t('areas.form.descriptionPlaceholder')}
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </FormField>

              {/* Categoría */}
              <FormField label={t('areas.form.category')} required>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setForm({ ...form, category: cat.id })}
                      style={{
                        padding: '12px 8px',
                        border: form.category === cat.id ? `2px solid ${cat.color}` : '1px solid #E5E7EB',
                        borderRadius: '8px',
                        background: form.category === cat.id ? `${cat.color}15` : 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span style={{ fontSize: '20px' }}>{cat.icon}</span>
                      <span style={{ fontSize: '10px', color: '#374151' }}>
                        {t(`areas.categories.${cat.id}`)}
                      </span>
                    </button>
                  ))}
                </div>
              </FormField>

              {/* Capacidad */}
              <FormField label={t('areas.form.capacity')}>
                <input
                  type="number"
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 0 })}
                  min="1"
                  style={inputStyle}
                />
              </FormField>

              {/* Es de pago */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="checkbox"
                  id="is_paid"
                  checked={form.is_paid}
                  onChange={(e) => setForm({ ...form, is_paid: e.target.checked })}
                  style={{ width: '18px', height: '18px' }}
                />
                <label htmlFor="is_paid" style={{ fontSize: '14px', color: '#374151' }}>
                  💵 {t('areas.form.isPaid')}
                </label>
              </div>

              {/* Precio por hora (si es de pago) */}
              {form.is_paid && (
                <FormField label={t('areas.form.pricePerHour')}>
                  <input
                    type="number"
                    value={form.price_per_hour}
                    onChange={(e) => setForm({ ...form, price_per_hour: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="0.01"
                    style={inputStyle}
                  />
                </FormField>
              )}

              {/* Requiere aprobación */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="checkbox"
                  id="requires_approval"
                  checked={form.requires_approval}
                  onChange={(e) => setForm({ ...form, requires_approval: e.target.checked })}
                  style={{ width: '18px', height: '18px' }}
                />
                <label htmlFor="requires_approval" style={{ fontSize: '14px', color: '#374151' }}>
                  ✋ {t('areas.form.requiresApproval')}
                </label>
              </div>

              {/* Horario de disponibilidad */}
              <div style={{ 
                background: '#F0F9FF', 
                borderRadius: '8px', 
                padding: '16px',
                border: '1px solid #BAE6FD'
              }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: '600', color: '#0369A1' }}>
                  🕐 Horario de Disponibilidad
                </h4>
                
                {/* Checkbox 24 horas */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <input
                    type="checkbox"
                    id="is_24_hours"
                    checked={form.is_24_hours}
                    onChange={(e) => setForm({ ...form, is_24_hours: e.target.checked })}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <label htmlFor="is_24_hours" style={{ fontSize: '14px', color: '#374151' }}>
                    🌙 Disponible 24 horas
                  </label>
                </div>

                {/* Selectores de hora (solo si NO es 24 horas) */}
                {!form.is_24_hours && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <FormField label="Hora de apertura">
                      <input
                        type="time"
                        value={form.available_from}
                        onChange={(e) => setForm({ ...form, available_from: e.target.value })}
                        style={inputStyle}
                      />
                    </FormField>
                    <FormField label="Hora de cierre">
                      <input
                        type="time"
                        value={form.available_until}
                        onChange={(e) => setForm({ ...form, available_until: e.target.value })}
                        style={inputStyle}
                      />
                    </FormField>
                  </div>
                )}
              </div>

              {/* Reglas de reserva */}
              <div style={{ 
                background: '#F9FAFB', 
                borderRadius: '8px', 
                padding: '16px',
                border: '1px solid #E5E7EB'
              }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                  📋 {t('areas.form.reservationRules')}
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <FormField label={t('areas.form.minHours')}>
                    <input
                      type="number"
                      value={form.min_hours}
                      onChange={(e) => setForm({ ...form, min_hours: parseInt(e.target.value) || 1 })}
                      min="1"
                      style={inputStyle}
                    />
                  </FormField>
                  <FormField label={t('areas.form.maxHours')}>
                    <input
                      type="number"
                      value={form.max_hours}
                      onChange={(e) => setForm({ ...form, max_hours: parseInt(e.target.value) || 1 })}
                      min="1"
                      style={inputStyle}
                    />
                  </FormField>
                  <FormField label={t('areas.form.maxAdvanceDays')}>
                    <input
                      type="number"
                      value={form.max_advance_days}
                      onChange={(e) => setForm({ ...form, max_advance_days: parseInt(e.target.value) || 1 })}
                      min="1"
                      style={inputStyle}
                    />
                  </FormField>
                </div>
              </div>
            </div>

            {/* Botones */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'flex-end', 
              gap: '12px', 
              marginTop: '24px',
              paddingTop: '16px',
              borderTop: '1px solid #E5E7EB'
            }}>
              <button
                type="button"
                onClick={() => { setShowModal(false); resetForm(); }}
                style={{
                  padding: '10px 20px',
                  background: '#F3F4F6',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  color: '#374151'
                }}
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={uploadingImage}
                style={{
                  padding: '10px 24px',
                  background: uploadingImage ? '#9CA3AF' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: uploadingImage ? 'not-allowed' : 'pointer',
                  fontWeight: '500'
                }}
              >
                {editingArea ? t('common.save') : t('common.create')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Horarios */}
      {showScheduleModal && selectedArea && (
        <Modal
          title={`${t('areas.schedule')}: ${selectedArea.name}`}
          onClose={() => { setShowScheduleModal(false); setSelectedArea(null); }}
          wide
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {DAYS_OF_WEEK.map(day => {
              const schedule = schedules.find(s => s.day_of_week === day.id);
              return (
                <ScheduleRow
                  key={day.id}
                  day={day}
                  schedule={schedule}
                  onSave={(startTime, endTime, blockDuration) => 
                    handleSaveSchedule(day.id, startTime, endTime, blockDuration)
                  }
                  t={t}
                />
              );
            })}
          </div>
        </Modal>
      )}
    </div>
  );
};

// ==================== COMPONENTES AUXILIARES ====================

const StatCard = ({ icon, label, value, color }) => (
  <div style={{
    background: 'white',
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <span style={{
        fontSize: '24px',
        width: '44px',
        height: '44px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `${color}15`,
        borderRadius: '10px'
      }}>
        {icon}
      </span>
      <div>
        <p style={{ margin: 0, fontSize: '12px', color: '#6B7280' }}>{label}</p>
        <p style={{ margin: '4px 0 0', fontSize: '20px', fontWeight: '700', color: '#111827' }}>{value}</p>
      </div>
    </div>
  </div>
);

const InfoBadge = ({ icon, text, highlight }) => (
  <span style={{
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    borderRadius: '6px',
    background: highlight ? '#FEF3C7' : '#F3F4F6',
    fontSize: '12px',
    color: highlight ? '#92400E' : '#4B5563'
  }}>
    {icon} {text}
  </span>
);

const ActionButton = ({ icon, label, onClick, danger }) => (
  <button
    onClick={onClick}
    title={label}
    style={{
      flex: 1,
      padding: '8px',
      background: danger ? '#FEE2E2' : '#F3F4F6',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '14px',
      transition: 'background 0.2s'
    }}
  >
    {icon}
  </button>
);

const Modal = ({ title, onClose, children, wide }) => (
  <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px'
  }}>
    <div style={{
      background: 'white',
      borderRadius: '16px',
      width: '100%',
      maxWidth: wide ? '700px' : '500px',
      maxHeight: '90vh',
      overflow: 'auto'
    }}>
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid #E5E7EB',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        background: 'white',
        zIndex: 1
      }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>{title}</h2>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: '#6B7280',
            lineHeight: 1
          }}
        >
          ×
        </button>
      </div>
      <div style={{ padding: '20px' }}>
        {children}
      </div>
    </div>
  </div>
);

const FormField = ({ label, required, children }) => (
  <div>
    <label style={{
      display: 'block',
      marginBottom: '6px',
      fontSize: '13px',
      fontWeight: '500',
      color: '#374151'
    }}>
      {label} {required && <span style={{ color: '#EF4444' }}>*</span>}
    </label>
    {children}
  </div>
);

const ScheduleRow = ({ day, schedule, onSave, t }) => {
  const [startTime, setStartTime] = useState(schedule?.start_time?.substring(0, 5) || '');
  const [endTime, setEndTime] = useState(schedule?.end_time?.substring(0, 5) || '');
  const [blockDuration, setBlockDuration] = useState(schedule?.block_duration_minutes || 60);
  const [isEnabled, setIsEnabled] = useState(!!schedule);

  const handleToggle = () => {
    if (isEnabled) {
      setStartTime('');
      setEndTime('');
      onSave(null, null, null);
    }
    setIsEnabled(!isEnabled);
  };

  const handleSave = () => {
    if (startTime && endTime) {
      onSave(startTime, endTime, blockDuration);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px',
      background: isEnabled ? '#F0FDF4' : '#F9FAFB',
      borderRadius: '8px',
      border: `1px solid ${isEnabled ? '#BBF7D0' : '#E5E7EB'}`
    }}>
      <input
        type="checkbox"
        checked={isEnabled}
        onChange={handleToggle}
        style={{ width: '18px', height: '18px' }}
      />
      <span style={{ 
        width: '100px', 
        fontWeight: '500',
        color: isEnabled ? '#166534' : '#6B7280'
      }}>
        {t(`visitors.days.${day.key}`)}
      </span>
      
      {isEnabled && (
        <>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #D1D5DB' }}
          />
          <span>-</span>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #D1D5DB' }}
          />
          <select
            value={blockDuration}
            onChange={(e) => setBlockDuration(parseInt(e.target.value))}
            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #D1D5DB' }}
          >
            <option value={30}>30 min</option>
            <option value={60}>1 hr</option>
            <option value={90}>1.5 hr</option>
            <option value={120}>2 hr</option>
          </select>
          <button
            onClick={handleSave}
            style={{
              padding: '6px 12px',
              background: '#10B981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            ✓
          </button>
        </>
      )}
    </div>
  );
};

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #D1D5DB',
  borderRadius: '8px',
  fontSize: '14px',
  outline: 'none',
  transition: 'border-color 0.2s',
  boxSizing: 'border-box'
};

export default CommonAreas;