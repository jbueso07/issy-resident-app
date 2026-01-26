// app/admin/payments/styles.js
// ISSY Admin - Payment Module Shared Styles

import { StyleSheet } from 'react-native';
import { COLORS, scale } from './_constants';

export const sharedStyles = StyleSheet.create({
  // ============================================
  // LOADING & EMPTY STATES
  // ============================================
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(60),
  },
  loadingText: {
    marginTop: scale(12),
    color: COLORS.textSecondary,
    fontSize: scale(14),
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: scale(60),
  },
  emptyTitle: {
    fontSize: scale(18),
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: scale(16),
  },
  emptySubtitle: {
    fontSize: scale(14),
    color: COLORS.textMuted,
    marginTop: scale(4),
    textAlign: 'center',
  },

  // ============================================
  // CARDS
  // ============================================
  card: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(12),
    padding: scale(16),
    marginBottom: scale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(12),
  },
  cardIconContainer: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // ============================================
  // STATUS BADGE
  // ============================================
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(10),
    paddingVertical: scale(5),
    borderRadius: scale(8),
    gap: scale(4),
  },
  statusText: {
    fontSize: scale(12),
    fontWeight: '500',
  },

  // ============================================
  // MODAL STYLES
  // ============================================
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    flex: 1,
    padding: scale(16),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalCancel: {
    fontSize: scale(16),
    color: COLORS.textSecondary,
  },
  modalTitle: {
    fontSize: scale(17),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  modalSave: {
    fontSize: scale(16),
    color: COLORS.lime,
    fontWeight: '600',
  },
  modalBody: {
    paddingHorizontal: scale(16),
    paddingVertical: scale(16),
    maxHeight: scale(400),
  },
  modalFooter: {
    flexDirection: 'row',
    padding: scale(16),
    gap: scale(12),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  bottomModal: {
    backgroundColor: COLORS.backgroundSecondary,
    borderTopLeftRadius: scale(20),
    borderTopRightRadius: scale(20),
    maxHeight: '80%',
  },

  // ============================================
  // FORM STYLES
  // ============================================
  formGroup: {
    marginBottom: scale(20),
  },
  formLabel: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(8),
  },
  formInput: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(12),
    paddingHorizontal: scale(16),
    paddingVertical: scale(14),
    fontSize: scale(16),
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  formInputMultiline: {
    minHeight: scale(80),
    textAlignVertical: 'top',
    paddingTop: scale(14),
  },
  formHint: {
    fontSize: scale(12),
    color: COLORS.textMuted,
    marginTop: scale(4),
  },

  // ============================================
  // SELECTOR / PICKER
  // ============================================
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(12),
    paddingHorizontal: scale(16),
    paddingVertical: scale(14),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectorText: {
    fontSize: scale(16),
    color: COLORS.textPrimary,
  },
  selectorPlaceholder: {
    fontSize: scale(16),
    color: COLORS.textMuted,
  },

  // ============================================
  // SEARCH
  // ============================================
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    margin: scale(16),
    borderRadius: scale(12),
    paddingHorizontal: scale(12),
  },
  searchIcon: {
    marginRight: scale(8),
  },
  searchInput: {
    flex: 1,
    paddingVertical: scale(14),
    fontSize: scale(16),
    color: COLORS.textPrimary,
  },

  // ============================================
  // BUTTONS
  // ============================================
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.lime,
    padding: scale(16),
    borderRadius: scale(12),
    gap: scale(8),
  },
  primaryButtonText: {
    fontSize: scale(16),
    fontWeight: '600',
    color: COLORS.background,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: scale(14),
    borderRadius: scale(12),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: scale(16),
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.danger + '15',
    padding: scale(12),
    borderRadius: scale(10),
    gap: scale(6),
  },
  dangerButtonText: {
    color: COLORS.danger,
    fontWeight: '600',
    fontSize: scale(14),
  },
  submitButton: {
    flex: 1,
    paddingVertical: scale(14),
    borderRadius: scale(12),
    backgroundColor: COLORS.lime,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: scale(16),
    color: COLORS.background,
    fontWeight: '600',
  },

  // ============================================
  // GRID / SELECTION BUTTONS
  // ============================================
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(10),
  },
  gridButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(16),
    borderRadius: scale(12),
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  gridButtonActive: {
    borderColor: COLORS.lime,
    backgroundColor: COLORS.lime + '15',
  },
  gridButtonLabel: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    marginTop: scale(8),
    textAlign: 'center',
  },
  gridButtonLabelActive: {
    color: COLORS.lime,
    fontWeight: '600',
  },

  // ============================================
  // USER ITEM (for pickers)
  // ============================================
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(16),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  userItemSelected: {
    backgroundColor: COLORS.lime + '10',
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
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  userUnit: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },

  // ============================================
  // CHIPS / TAGS
  // ============================================
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
    marginTop: scale(12),
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundTertiary,
    paddingVertical: scale(6),
    paddingLeft: scale(12),
    paddingRight: scale(8),
    borderRadius: scale(20),
    gap: scale(6),
  },
  chipText: {
    fontSize: scale(13),
    color: COLORS.textPrimary,
  },

  // ============================================
  // DETAIL ROW (for modals)
  // ============================================
  detailSection: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(16),
    padding: scale(16),
    marginBottom: scale(16),
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: scale(10),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailLabel: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: scale(14),
    fontWeight: '500',
    color: COLORS.textPrimary,
    maxWidth: '60%',
    textAlign: 'right',
  },

  // ============================================
  // IMAGE CONTAINER
  // ============================================
  imageContainer: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(16),
    overflow: 'hidden',
    marginBottom: scale(16),
  },
  image: {
    width: '100%',
    height: scale(300),
  },

  // ============================================
  // CHECKBOX
  // ============================================
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    paddingVertical: scale(8),
  },
  checkboxText: {
    fontSize: scale(14),
    color: COLORS.textPrimary,
  },

  // ============================================
  // SECTION HEADER
  // ============================================
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: scale(16),
  },
  sectionTitle: {
    fontSize: scale(16),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: scale(4),
  },
  sectionSubtitle: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
  },

  // ============================================
  // SETTINGS
  // ============================================
  settingsSection: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: scale(16),
    padding: scale(16),
    marginBottom: scale(16),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: scale(12),
  },
  settingTextContainer: {
    marginLeft: scale(12),
    flex: 1,
  },
  settingLabel: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  settingDescription: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    marginTop: scale(2),
  },
});

export default sharedStyles;
