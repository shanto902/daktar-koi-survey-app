import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { PHOTO_TYPES, PhotoType } from '../../constants/surveyTypes';
import { StagedPhoto } from '../../hooks/useCameraCapture';
import { fileStorage } from '../../services/storage/fileStorage';
import { SelectModal, SelectOption } from '../common/SelectModal';
import { ConfirmModal } from '../common/ConfirmModal';

interface PhotoManagerProps {
  photos: StagedPhoto[];
  onCapture: (type: PhotoType) => Promise<any>;
  onPick: (type: PhotoType) => Promise<any>;
  onRemove: (photoId: string) => Promise<void>;
  onUpdateType: (photoId: string, newType: PhotoType) => void;
  onRunOCR?: (photo: StagedPhoto) => void;
  isCapturing?: boolean;
}

export function PhotoManager({
  photos,
  onCapture,
  onPick,
  onRemove,
  onUpdateType,
  onRunOCR,
  isCapturing = false,
}: PhotoManagerProps) {
  const [activePhotoType, setActivePhotoType] = useState<PhotoType>('Doctor Visiting Card');
  const [photoTypeModalVisible, setPhotoTypeModalVisible] = useState(false);
  const [targetPhotoIdForType, setTargetPhotoIdForType] = useState<string | null>(null);

  const [previewPhoto, setPreviewPhoto] = useState<StagedPhoto | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const photoTypeOptions: SelectOption[] = PHOTO_TYPES.map((pt) => ({
    label: pt.label,
    labelBn: pt.labelBn,
    value: pt.value,
    icon: pt.icon as any,
  }));

  const handleSelectPhotoType = (opt: SelectOption) => {
    if (targetPhotoIdForType) {
      onUpdateType(targetPhotoIdForType, opt.value as PhotoType);
      setTargetPhotoIdForType(null);
    } else {
      setActivePhotoType(opt.value as PhotoType);
    }
  };

  const handleConfirmDelete = async () => {
    if (deleteTargetId) {
      await onRemove(deleteTargetId);
      setDeleteTargetId(null);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionSubtitle}>
        Visiting cards, chamber banners, signboards, or prescriptions
      </Text>

      {/* Dedicated Category Selector & Quick Chips */}
      <View style={styles.categoryBar}>
        <View style={styles.categoryBarHeader}>
          <View style={styles.categoryLabelRow}>
            <Ionicons name="pricetag" size={14} color={Colors.primary} />
            <Text style={styles.categoryBarLabel}>Photo Category:</Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              setTargetPhotoIdForType(null);
              setPhotoTypeModalVisible(true);
            }}
            style={styles.allTypesBtn}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.allTypesText}>All Types ({PHOTO_TYPES.length})</Text>
            <Ionicons name="chevron-down" size={13} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Quick horizontal chips for 1-tap switching */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryChipsScroll}
        >
          {PHOTO_TYPES.map((pt) => {
            const isSelected = activePhotoType === pt.value;
            return (
              <TouchableOpacity
                key={pt.value}
                onPress={() => setActivePhotoType(pt.value)}
                style={[
                  styles.categoryChip,
                  isSelected && styles.categoryChipSelected,
                ]}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={pt.icon as any}
                  size={13}
                  color={isSelected ? Colors.white : Colors.primaryDark}
                  style={{ marginRight: 5 }}
                />
                <Text
                  style={[
                    styles.categoryChipText,
                    isSelected && styles.categoryChipTextSelected,
                  ]}
                >
                  {pt.label}
                </Text>
                {isSelected && (
                  <Ionicons
                    name="checkmark-circle"
                    size={14}
                    color={Colors.white}
                    style={{ marginLeft: 5 }}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Action Buttons: Take Camera Photo or Pick from Gallery */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          onPress={() => onCapture(activePhotoType)}
          disabled={isCapturing}
          style={[styles.cameraBtn, isCapturing && styles.disabledBtn]}
          activeOpacity={0.8}
        >
          <Ionicons name="camera" size={20} color={Colors.white} />
          <Text style={styles.cameraBtnText}>Take Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onPick(activePhotoType)}
          disabled={isCapturing}
          style={[styles.galleryBtn, isCapturing && styles.disabledBtn]}
          activeOpacity={0.8}
        >
          <Ionicons name="images" size={20} color={Colors.primary} />
          <Text style={styles.galleryBtnText}>Select Gallery</Text>
        </TouchableOpacity>
      </View>

      {/* Photos Horizontal List / Carousel */}
      {photos.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.photosScroll}
        >
          {photos.map((item, index) => {
            const uri = fileStorage.resolveUri(item.local_path);
            const isOcrDone = item.ocr_status === 'completed';

            return (
              <View key={item.id} style={styles.photoCard}>
                <TouchableOpacity
                  onPress={() => setPreviewPhoto(item)}
                  activeOpacity={0.9}
                  style={styles.imageWrapper}
                >
                  <Image source={{ uri }} style={styles.photoImage} resizeMode="cover" />

                  {/* Category overlay */}
                  <TouchableOpacity
                    onPress={() => {
                      setTargetPhotoIdForType(item.id);
                      setPhotoTypeModalVisible(true);
                    }}
                    style={styles.categoryTag}
                  >
                    <Text style={styles.categoryTagText} numberOfLines={1}>
                      {item.photo_type}
                    </Text>
                    <Ionicons name="pencil" size={10} color={Colors.white} style={{ marginLeft: 3 }} />
                  </TouchableOpacity>

                  {/* Delete button */}
                  <TouchableOpacity
                    onPress={() => setDeleteTargetId(item.id)}
                    style={styles.deletePhotoBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="trash" size={14} color={Colors.white} />
                  </TouchableOpacity>
                </TouchableOpacity>

                {/* OCR Trigger button below photo */}
                {onRunOCR && (
                  <TouchableOpacity
                    onPress={() => onRunOCR(item)}
                    style={[
                      styles.ocrBtn,
                      isOcrDone ? styles.ocrBtnDone : styles.ocrBtnPending,
                    ]}
                  >
                    <Ionicons
                      name={isOcrDone ? 'checkmark-circle' : 'scan-outline'}
                      size={14}
                      color={isOcrDone ? Colors.success : Colors.primary}
                    />
                    <Text
                      style={[
                        styles.ocrBtnText,
                        { color: isOcrDone ? Colors.success : Colors.primary },
                      ]}
                    >
                      {isOcrDone ? 'OCR Completed' : 'Extract Text (OCR)'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <View style={styles.emptyCard}>
          <Ionicons name="camera-outline" size={32} color={Colors.textMuted} />
          <Text style={styles.emptyText}>No photographs added yet</Text>
          <Text style={styles.emptySubtext}>
            Capture a doctor visiting card or chamber signboard to extract text with OCR.
          </Text>
        </View>
      )}

      {/* Full-screen Photo Preview Modal */}
      <Modal
        visible={previewPhoto !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewPhoto(null)}
      >
        <View style={styles.fullPreviewOverlay}>
          <TouchableOpacity
            style={styles.fullPreviewCloseBtn}
            onPress={() => setPreviewPhoto(null)}
          >
            <Ionicons name="close" size={28} color={Colors.white} />
          </TouchableOpacity>

          {previewPhoto && (
            <View style={styles.fullPreviewContent}>
              <Image
                source={{ uri: fileStorage.resolveUri(previewPhoto.local_path) }}
                style={styles.fullPreviewImage}
                resizeMode="contain"
              />
              <View style={styles.previewInfoBar}>
                <Text style={styles.previewInfoText}>{previewPhoto.photo_type}</Text>
                {previewPhoto.raw_ocr_text && (
                  <Text style={styles.previewOcrStatus}>• OCR text extracted</Text>
                )}
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* Select Photo Category Modal */}
      <SelectModal
        visible={photoTypeModalVisible}
        title="Select Photograph Category"
        options={photoTypeOptions}
        selectedValue={
          targetPhotoIdForType
            ? photos.find((p) => p.id === targetPhotoIdForType)?.photo_type
            : activePhotoType
        }
        onSelect={handleSelectPhotoType}
        onClose={() => setPhotoTypeModalVisible(false)}
        searchable={false}
      />

      {/* Confirm Delete Photo Modal */}
      <ConfirmModal
        visible={deleteTargetId !== null}
        title="Remove Photograph"
        message="Are you sure you want to remove this photograph from the survey? The file will be safely deleted from storage."
        confirmLabel="Remove"
        isDangerous
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 10,
    lineHeight: 16,
  },
  categoryBar: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    marginBottom: 12,
  },
  categoryBarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  categoryLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryBarLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.text,
  },
  allTypesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
  },
  allTypesText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: Colors.primaryDark,
  },
  categoryChipsScroll: {
    gap: 7,
    paddingVertical: 2,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1.2,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
  },
  categoryChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text,
  },
  categoryChipTextSelected: {
    color: Colors.white,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  cameraBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    marginRight: 8,
  },
  cameraBtnText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 6,
  },
  galleryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.secondaryLight,
    borderWidth: 1.2,
    borderColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    marginLeft: 8,
  },
  galleryBtnText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 6,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  photosScroll: {
    paddingVertical: 4,
  },
  photoCard: {
    width: 195,
    marginRight: 12,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  imageWrapper: {
    position: 'relative',
    height: 140,
    backgroundColor: Colors.background,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  categoryTag: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryTagText: {
    color: Colors.white,
    fontSize: 10.5,
    fontWeight: '600',
    flex: 1,
  },
  deletePhotoBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.85)',
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ocrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  ocrBtnPending: {
    backgroundColor: Colors.primaryLight,
  },
  ocrBtnDone: {
    backgroundColor: Colors.successLight,
  },
  ocrBtnText: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: Colors.card,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 8,
  },
  emptySubtext: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 260,
  },
  fullPreviewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullPreviewCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  fullPreviewContent: {
    width: '100%',
    height: '80%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullPreviewImage: {
    width: '100%',
    height: '100%',
  },
  previewInfoBar: {
    position: 'absolute',
    bottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  previewInfoText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  previewOcrStatus: {
    color: Colors.primaryLight,
    fontSize: 13,
    marginLeft: 6,
  },
});

