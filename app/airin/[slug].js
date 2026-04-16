// app/airin/[slug].js
// ISSY × Airin - Menú del Restaurante + Carrito
// Línea gráfica ProHome

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Image,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { getRestaurant, getMenu, createOrder } from '../../src/services/airinService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => (SCREEN_WIDTH / 375) * size;

// ============ COLORES PROHOME ============
const COLORS = {
  bgPrimary: '#0F1A1E',
  bgSecondary: '#152328',
  bgCard: '#1C2E35',
  bgCardAlt: '#243B44',

  orange: '#FF6B35',
  lime: '#AAFF00',
  cyan: '#00E5FF',
  teal: '#00BFA6',
  coral: '#FF6B6B',
  green: '#10B981',

  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.4)',

  border: 'rgba(255, 255, 255, 0.1)',
};

export default function RestaurantMenuScreen() {
  const { slug } = useLocalSearchParams();
  const { profile } = useAuth();

  const [restaurant, setRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [restResult, menuResult] = await Promise.all([
        getRestaurant(slug),
        getMenu(slug),
      ]);

      if (restResult.success) setRestaurant(restResult.data);
      if (menuResult.success) {
        const items = Array.isArray(menuResult.data) ? menuResult.data : [];
        setMenuItems(items);
      }
    } catch (err) {
      console.error('Error loading restaurant data:', err);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ============ CART LOGIC ============
  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === itemId);
      if (existing && existing.quantity > 1) {
        return prev.map((c) =>
          c.id === itemId ? { ...c, quantity: c.quantity - 1 } : c
        );
      }
      return prev.filter((c) => c.id !== itemId);
    });
  };

  const cartItemCount = useMemo(() => cart.reduce((sum, c) => sum + c.quantity, 0), [cart]);
  const cartTotal = useMemo(
    () => cart.reduce((sum, c) => sum + c.quantity * (Number(c.price) || 0), 0),
    [cart]
  );

  const getCartQuantity = (itemId) => {
    const found = cart.find((c) => c.id === itemId);
    return found ? found.quantity : 0;
  };

  // ============ GROUP MENU BY CATEGORY ============
  const groupedMenu = useMemo(() => {
    const groups = {};
    menuItems.forEach((item) => {
      const cat = item.category || 'General';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }, [menuItems]);

  // ============ SUBMIT ORDER ============
  const handleSubmitOrder = async () => {
    if (cart.length === 0) return;

    setSubmitting(true);
    try {
      const orderData = {
        restaurant_slug: slug,
        source: 'online',
        order_type: 'pickup',
        payment_method: 'cash',
        customer_name: profile?.full_name || profile?.name || 'Cliente ISSY',
        customer_phone: profile?.phone || '',
        items: cart.map((c) => ({
          id: c.id,
          name: c.name,
          quantity: c.quantity,
          price: c.price,
          notes: '',
        })),
      };

      const result = await createOrder(orderData);

      if (result.success) {
        const orderId = result.data?.id || result.data?.order_id;
        setCart([]);
        setShowCart(false);
        router.push({ pathname: '/airin/order-status', params: { order_id: orderId } });
      } else {
        Alert.alert('Error', result.error || 'No se pudo crear el pedido');
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ============ LOADING STATE ============
  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.orange} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Cover Image */}
        <View style={styles.coverContainer}>
          {restaurant?.cover_url ? (
            <Image source={{ uri: restaurant.cover_url }} style={styles.coverImage} />
          ) : (
            <View style={[styles.coverImage, styles.coverPlaceholder]}>
              <Ionicons name="restaurant" size={48} color={COLORS.orange + '40'} />
            </View>
          )}
          <View style={styles.coverOverlay} />

          {/* Logo overlay */}
          <View style={styles.logoOverlay}>
            {restaurant?.logo_url ? (
              <Image source={{ uri: restaurant.logo_url }} style={styles.restaurantLogo} />
            ) : (
              <View style={[styles.restaurantLogo, styles.logoPlaceholder]}>
                <Ionicons name="restaurant" size={28} color={COLORS.orange} />
              </View>
            )}
          </View>
        </View>

        {/* Restaurant Info */}
        <View style={styles.infoSection}>
          <Text style={styles.restaurantName}>{restaurant?.name || 'Restaurante'}</Text>
          <Text style={styles.restaurantCategory}>
            {restaurant?.category || 'Restaurante'}
          </Text>

          <View style={styles.metaRow}>
            {restaurant?.rating != null && (
              <View style={styles.metaItem}>
                <Ionicons name="star" size={14} color={COLORS.orange} />
                <Text style={styles.metaText}>{Number(restaurant.rating).toFixed(1)}</Text>
              </View>
            )}
            {restaurant?.delivery_time && (
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
                <Text style={styles.metaText}>{restaurant.delivery_time}</Text>
              </View>
            )}
            <View style={[
              styles.statusBadge,
              { backgroundColor: restaurant?.is_open ? COLORS.green + '20' : COLORS.textMuted + '30' }
            ]}>
              <Text style={{ color: restaurant?.is_open ? COLORS.green : COLORS.textMuted, fontSize: scale(11), fontWeight: '600' }}>
                {restaurant?.is_open ? 'Abierto' : 'Cerrado'}
              </Text>
            </View>
          </View>

          {/* Reservation button */}
          {restaurant?.has_reservations && (
            <TouchableOpacity
              style={styles.reservationButton}
              onPress={() => router.push({ pathname: '/airin/reservation', params: { slug } })}
            >
              <Ionicons name="calendar-outline" size={18} color={COLORS.cyan} />
              <Text style={styles.reservationButtonText}>Reservar mesa</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Menu */}
        <View style={styles.menuSection}>
          <Text style={styles.menuTitle}>Menú</Text>

          {Object.keys(groupedMenu).length === 0 && (
            <Text style={styles.emptyMenu}>No hay items disponibles</Text>
          )}

          {Object.entries(groupedMenu).map(([category, items]) => (
            <View key={category} style={styles.categoryGroup}>
              <Text style={styles.categoryTitle}>{category}</Text>

              {items.map((item) => {
                const qty = getCartQuantity(item.id);
                return (
                  <View key={item.id} style={styles.menuItem}>
                    {item.image_url && (
                      <Image source={{ uri: item.image_url }} style={styles.menuItemImage} />
                    )}
                    <View style={styles.menuItemInfo}>
                      <Text style={styles.menuItemName} numberOfLines={2}>{item.name}</Text>
                      {item.description && (
                        <Text style={styles.menuItemDesc} numberOfLines={2}>{item.description}</Text>
                      )}
                      <Text style={styles.menuItemPrice}>
                        L {Number(item.price || 0).toFixed(2)}
                      </Text>
                    </View>

                    {/* Quantity controls */}
                    <View style={styles.qtyControls}>
                      {qty > 0 && (
                        <>
                          <TouchableOpacity
                            style={styles.qtyButton}
                            onPress={() => removeFromCart(item.id)}
                          >
                            <Ionicons name="remove" size={18} color={COLORS.coral} />
                          </TouchableOpacity>
                          <Text style={styles.qtyText}>{qty}</Text>
                        </>
                      )}
                      <TouchableOpacity
                        style={[styles.qtyButton, styles.qtyButtonAdd]}
                        onPress={() => addToCart(item)}
                      >
                        <Ionicons name="add" size={18} color={COLORS.orange} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          ))}

          <View style={{ height: scale(100) }} />
        </View>
      </ScrollView>

      {/* Floating Cart Button */}
      {cartItemCount > 0 && (
        <TouchableOpacity
          style={styles.floatingCartButton}
          onPress={() => setShowCart(true)}
          activeOpacity={0.85}
        >
          <View style={styles.floatingCartLeft}>
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartItemCount}</Text>
            </View>
            <Text style={styles.floatingCartText}>Ver carrito</Text>
          </View>
          <Text style={styles.floatingCartTotal}>L {cartTotal.toFixed(2)}</Text>
        </TouchableOpacity>
      )}

      {/* Cart Modal */}
      <Modal visible={showCart} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.cartModal}>
            <View style={styles.cartHeader}>
              <Text style={styles.cartTitle}>Tu pedido</Text>
              <TouchableOpacity onPress={() => setShowCart(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.cartList}>
              {cart.map((item) => (
                <View key={item.id} style={styles.cartItem}>
                  <View style={styles.cartItemInfo}>
                    <Text style={styles.cartItemName}>{item.name}</Text>
                    <Text style={styles.cartItemPrice}>
                      L {(Number(item.price) * item.quantity).toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.cartItemQty}>
                    <TouchableOpacity
                      style={styles.qtyButton}
                      onPress={() => removeFromCart(item.id)}
                    >
                      <Ionicons name="remove" size={16} color={COLORS.coral} />
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={[styles.qtyButton, styles.qtyButtonAdd]}
                      onPress={() => addToCart(item)}
                    >
                      <Ionicons name="add" size={16} color={COLORS.orange} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={styles.cartFooter}>
              <View style={styles.cartTotalRow}>
                <Text style={styles.cartTotalLabel}>Total</Text>
                <Text style={styles.cartTotalAmount}>L {cartTotal.toFixed(2)}</Text>
              </View>

              <View style={styles.cartOrderInfo}>
                <Text style={styles.cartOrderInfoText}>
                  Pickup · Pago en efectivo
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={handleSubmitOrder}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color={COLORS.textPrimary} size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Hacer pedido</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ============ ESTILOS ============
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Cover
  coverContainer: {
    position: 'relative',
    height: scale(200),
  },
  coverImage: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.bgSecondary,
  },
  coverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 26, 30, 0.4)',
  },
  logoOverlay: {
    position: 'absolute',
    bottom: -scale(30),
    left: scale(16),
  },
  restaurantLogo: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(14),
    borderWidth: 3,
    borderColor: COLORS.bgPrimary,
    backgroundColor: COLORS.bgCard,
  },
  logoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Info
  infoSection: {
    paddingHorizontal: scale(16),
    paddingTop: scale(40),
    paddingBottom: scale(16),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  restaurantName: {
    fontSize: scale(22),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: scale(2),
  },
  restaurantCategory: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    marginBottom: scale(10),
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(14),
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  metaText: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: scale(10),
    paddingVertical: scale(3),
    borderRadius: scale(10),
  },
  reservationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    marginTop: scale(12),
    backgroundColor: COLORS.cyan + '15',
    alignSelf: 'flex-start',
    paddingHorizontal: scale(14),
    paddingVertical: scale(8),
    borderRadius: scale(20),
  },
  reservationButtonText: {
    fontSize: scale(13),
    fontWeight: '600',
    color: COLORS.cyan,
  },

  // Menu
  menuSection: {
    paddingHorizontal: scale(16),
    paddingTop: scale(20),
  },
  menuTitle: {
    fontSize: scale(18),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: scale(16),
  },
  emptyMenu: {
    fontSize: scale(14),
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingVertical: scale(32),
  },
  categoryGroup: {
    marginBottom: scale(20),
  },
  categoryTitle: {
    fontSize: scale(15),
    fontWeight: '600',
    color: COLORS.orange,
    marginBottom: scale(10),
    paddingBottom: scale(6),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: scale(12),
    padding: scale(12),
    marginBottom: scale(8),
  },
  menuItemImage: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(10),
    marginRight: scale(12),
    backgroundColor: COLORS.bgCardAlt,
  },
  menuItemInfo: {
    flex: 1,
  },
  menuItemName: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(2),
  },
  menuItemDesc: {
    fontSize: scale(11),
    color: COLORS.textMuted,
    marginBottom: scale(4),
  },
  menuItemPrice: {
    fontSize: scale(14),
    fontWeight: '700',
    color: COLORS.orange,
  },

  // Qty Controls
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    marginLeft: scale(8),
  },
  qtyButton: {
    width: scale(30),
    height: scale(30),
    borderRadius: scale(15),
    backgroundColor: COLORS.bgCardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyButtonAdd: {
    backgroundColor: COLORS.orange + '20',
  },
  qtyText: {
    fontSize: scale(14),
    fontWeight: '700',
    color: COLORS.textPrimary,
    minWidth: scale(18),
    textAlign: 'center',
  },

  // Floating Cart
  floatingCartButton: {
    position: 'absolute',
    bottom: scale(30),
    left: scale(16),
    right: scale(16),
    backgroundColor: COLORS.orange,
    borderRadius: scale(14),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: scale(14),
    paddingHorizontal: scale(18),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  floatingCartLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  cartBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: scale(10),
    width: scale(24),
    height: scale(24),
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    fontSize: scale(12),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  floatingCartText: {
    fontSize: scale(15),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  floatingCartTotal: {
    fontSize: scale(15),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  // Cart Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  cartModal: {
    backgroundColor: COLORS.bgPrimary,
    borderTopLeftRadius: scale(20),
    borderTopRightRadius: scale(20),
    maxHeight: '80%',
  },
  cartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    paddingVertical: scale(16),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  cartTitle: {
    fontSize: scale(18),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  cartList: {
    paddingHorizontal: scale(20),
    paddingVertical: scale(12),
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(2),
  },
  cartItemPrice: {
    fontSize: scale(13),
    color: COLORS.orange,
    fontWeight: '600',
  },
  cartItemQty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },

  // Cart Footer
  cartFooter: {
    paddingHorizontal: scale(20),
    paddingVertical: scale(16),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  cartTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(8),
  },
  cartTotalLabel: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  cartTotalAmount: {
    fontSize: scale(20),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  cartOrderInfo: {
    marginBottom: scale(14),
  },
  cartOrderInfoText: {
    fontSize: scale(12),
    color: COLORS.textMuted,
  },
  submitButton: {
    backgroundColor: COLORS.orange,
    borderRadius: scale(14),
    paddingVertical: scale(15),
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: scale(16),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
});
