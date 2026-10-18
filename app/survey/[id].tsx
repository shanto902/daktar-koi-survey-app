import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Badge } from "../../src/components/common/Badge";
import { Button } from "../../src/components/common/Button";
import { ConfirmModal } from "../../src/components/common/ConfirmModal";
import { Header } from "../../src/components/common/Header";
import { Colors } from "../../src/constants/colors";
import { surveyRepository } from "../../src/database/repositories/surveyRepository";
import { fileStorage } from "../../src/services/storage/fileStorage";
import { StructuredExtractedData, SurveyFullRecord, SurveyPhoto } from "../../src/types";
import { extractStructuredDataFromText } from "../../src/services/ocr/structuredExtractor";

export default function SurveyDetailsScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [record, setRecord] = useState<SurveyFullRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteModalVisible, setConfirmDeleteVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<SurveyPhoto | null>(null);
  const [rawTextModalPhoto, setRawTextModalPhoto] =
    useState<SurveyPhoto | null>(null);

  const loadRecord = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await surveyRepository.getFullRecord(id);
      setRecord(res);
    } catch (e) {
      console.warn("Failed loading survey:", e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadRecord();
    }, [loadRecord]),
  );

  const handleDelete = async () => {
    if (!id) return;
    try {
      setIsDeleting(true);
      const { deleted, photoPathsToDelete } =
        await surveyRepository.deleteSurvey(id);
      if (deleted) {
        for (const p of photoPathsToDelete) {
          await fileStorage.deletePhoto(p);
        }
        Alert.alert(
          "Survey Deleted",
          "Survey and photos removed successfully.",
          [{ text: "OK", onPress: () => router.replace("/(tabs)/surveys") }],
        );
      }
    } catch (e: any) {
      Alert.alert("Delete Failed", e?.message);
    } finally {
      setIsDeleting(false);
      setConfirmDeleteVisible(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        <Header title="Survey Details" onBack={() => router.back()} />
        <View style={styles.loadingBox}>
          <Text style={styles.loadingText}>
            Loading survey details from SQLite...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!record) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        <Header title="Not Found" onBack={() => router.back()} />
        <View style={styles.loadingBox}>
          <Text style={styles.notFoundText}>
            Survey record not found or has been deleted.
          </Text>
          <Button
            title="Go to Surveys"
            onPress={() => router.replace("/(tabs)/surveys")}
          />
        </View>
      </SafeAreaView>
    );
  }

  const { survey, doctor, facility, doctorFacility, photos, ocrResults } = record;
  const hasGps = survey.latitude !== null && survey.longitude !== null;

  const primaryOcr = ocrResults && ocrResults.length > 0 ? ocrResults[0] : null;
  const photoWithOcr = photos.find((p) => p.raw_ocr_text);
  const rawOcrText = primaryOcr?.raw_text || photoWithOcr?.raw_ocr_text || null;

  let ocrStructured: StructuredExtractedData | null = null;
  if (primaryOcr?.structured_result_json) {
    try {
      ocrStructured = JSON.parse(primaryOcr.structured_result_json);
    } catch {}
  }
  if (!ocrStructured && rawOcrText) {
    ocrStructured = extractStructuredDataFromText(rawOcrText);
  }

  let visitingDaysList: string[] = [];
  if (doctorFacility?.visiting_days_json) {
    try {
      visitingDaysList = JSON.parse(doctorFacility.visiting_days_json);
    } catch {}
  }

  let additionalPhonesList: string[] = [];
  if (doctor?.additional_phones_json) {
    try {
      additionalPhonesList = JSON.parse(doctor.additional_phones_json);
    } catch {}
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <Header
        title={survey.survey_type + " Survey"}
        subtitle={survey.survey_date}
        onBack={() => router.back()}
        rightAction={{
          icon: "create-outline",
          label: "Edit",
          onPress: () =>
            router.push({
              pathname: "/survey/edit/[id]",
              params: { id: survey.id },
            }),
        }}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 20) + 40 },
        ]}
      >
        {/* Status & Type Bar */}
        <View style={styles.statusBar}>
          <View style={styles.badgeRow}>
            <Badge
              label={survey.survey_type}
              variant="type"
              typeValue={survey.survey_type}
            />
            <View style={{ width: 8 }} />
            <Badge
              label={survey.status}
              variant="status"
              statusValue={survey.status}
            />
          </View>
          <Text style={styles.dateLabel}>
            Survey Date: {survey.survey_date}
          </Text>
        </View>

        {/* Draft Notification / Resume Banner */}
        {survey.status === "Draft" && (
          <View style={styles.draftBanner}>
            <View style={styles.draftBannerContent}>
              <View style={styles.draftIconBadge}>
                <Ionicons name="create" size={20} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.draftBannerTitle}>Draft Survey</Text>
                <Text style={styles.draftBannerText}>
                  This survey is saved as a draft. You can continue editing and apply detected OCR text to form fields.
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.draftBannerBtn}
              onPress={() =>
                router.push({
                  pathname: "/survey/edit/[id]",
                  params: { id: survey.id },
                })
              }
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-forward-circle" size={16} color={Colors.white} />
              <Text style={styles.draftBannerBtnText}>Continue Editing Draft</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* OCR Extracted Data Card */}
        {Boolean(rawOcrText || ocrStructured) && (
          <View style={[styles.card, styles.ocrCard]}>
            <View style={styles.cardHeader}>
              <View style={styles.ocrCardTitleRow}>
                <Ionicons name="sparkles" size={18} color={Colors.primary} />
                <Text style={[styles.cardHeaderTitle, { color: Colors.primaryDark, marginLeft: 6 }]}>
                  OCR Detected Data
                </Text>
              </View>
              <View style={styles.ocrProviderTag}>
                <Text style={styles.ocrProviderText}>
                  {primaryOcr?.provider || "Photo OCR"}
                </Text>
              </View>
            </View>

            <Text style={styles.ocrCardSubtitle}>
              Data extracted from photo signboard/visiting card:
            </Text>

            {ocrStructured?.doctorNameBn && (
              <View style={styles.row}>
                <Text style={styles.label}>Doctor (বাংলা):</Text>
                <Text style={[styles.value, styles.boldBn]}>{ocrStructured.doctorNameBn}</Text>
              </View>
            )}

            {ocrStructured?.doctorNameEn && (
              <View style={styles.row}>
                <Text style={styles.label}>Doctor (English):</Text>
                <Text style={[styles.value, styles.bold]}>{ocrStructured.doctorNameEn}</Text>
              </View>
            )}

            {ocrStructured?.qualifications && (
              <View style={styles.row}>
                <Text style={styles.label}>Degrees:</Text>
                <Text style={styles.value}>{ocrStructured.qualifications}</Text>
              </View>
            )}

            {ocrStructured?.specialization && (
              <View style={styles.row}>
                <Text style={styles.label}>Specialty:</Text>
                <Text style={styles.value}>{ocrStructured.specialization}</Text>
              </View>
            )}

            {ocrStructured?.bmdcNumber && (
              <View style={styles.row}>
                <Text style={styles.label}>BMDC Reg:</Text>
                <Text style={[styles.value, styles.bmdcText]}>{ocrStructured.bmdcNumber}</Text>
              </View>
            )}

            {ocrStructured?.phones && ocrStructured.phones.length > 0 && (
              <View style={styles.row}>
                <Text style={styles.label}>Phones:</Text>
                <Text style={[styles.value, styles.phoneText]}>{ocrStructured.phones.join(", ")}</Text>
              </View>
            )}

            {(ocrStructured?.facilityNameBn || ocrStructured?.facilityNameEn) && (
              <View style={styles.row}>
                <Text style={styles.label}>Facility:</Text>
                <Text style={styles.value}>
                  {ocrStructured.facilityNameBn || ocrStructured.facilityNameEn}
                </Text>
              </View>
            )}

            {ocrStructured?.visitingStartTime && (
              <View style={styles.row}>
                <Text style={styles.label}>Visiting Hours:</Text>
                <Text style={styles.value}>{ocrStructured.visitingStartTime}</Text>
              </View>
            )}

            {ocrStructured?.consultationFee && (
              <View style={styles.row}>
                <Text style={styles.label}>Fee:</Text>
                <Text style={[styles.value, styles.feeText]}>{ocrStructured.consultationFee} BDT</Text>
              </View>
            )}

            <View style={styles.ocrCardActionRow}>
              {rawOcrText && (
                <TouchableOpacity
                  style={styles.ocrViewRawBtn}
                  onPress={() => {
                    const targetPhoto = photoWithOcr || (photos.length > 0 ? photos[0] : null);
                    if (targetPhoto) {
                      setRawTextModalPhoto({
                        ...targetPhoto,
                        raw_ocr_text: rawOcrText,
                      });
                    }
                  }}
                >
                  <Ionicons name="document-text-outline" size={14} color={Colors.primary} />
                  <Text style={styles.ocrViewRawBtnText}>View Full Text</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.ocrApplyInEditBtn}
                onPress={() =>
                  router.push({
                    pathname: "/survey/edit/[id]",
                    params: { id: survey.id },
                  })
                }
              >
                <Ionicons name="create-outline" size={14} color={Colors.white} />
                <Text style={styles.ocrApplyInEditBtnText}>Apply in Editor</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Doctor Information Card */}
        {doctor && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="medical" size={20} color={Colors.primary} />
              <Text style={styles.cardHeaderTitle}>Doctor Profile</Text>
            </View>

            {doctor.name_bn && (
              <View style={styles.row}>
                <Text style={styles.label}>Name (বাংলা):</Text>
                <Text style={[styles.value, styles.boldBn]}>
                  {doctor.name_bn}
                </Text>
              </View>
            )}

            {doctor.name_en && (
              <View style={styles.row}>
                <Text style={styles.label}>Name (English):</Text>
                <Text style={[styles.value, styles.bold]}>
                  {doctor.name_en}
                </Text>
              </View>
            )}

            {doctor.qualifications && (
              <View style={styles.row}>
                <Text style={styles.label}>Qualifications:</Text>
                <Text style={styles.value}>{doctor.qualifications}</Text>
              </View>
            )}

            {doctor.specialization && (
              <View style={styles.row}>
                <Text style={styles.label}>Specialization:</Text>
                <Text style={styles.value}>{doctor.specialization}</Text>
              </View>
            )}

            {doctor.bmdc_registration_number && (
              <View style={styles.row}>
                <Text style={styles.label}>BMDC Reg No:</Text>
                <Text style={[styles.value, styles.bmdcText]}>
                  {doctor.bmdc_registration_number}
                </Text>
              </View>
            )}

            {doctor.primary_phone && (
              <View style={styles.row}>
                <Text style={styles.label}>Primary Phone:</Text>
                <Text style={[styles.value, styles.phoneText]}>
                  {doctor.primary_phone}
                </Text>
              </View>
            )}

            {additionalPhonesList.length > 0 && (
              <View style={styles.row}>
                <Text style={styles.label}>Other Phones:</Text>
                <Text style={styles.value}>
                  {additionalPhonesList.join(", ")}
                </Text>
              </View>
            )}

            {doctor.notes && (
              <View style={styles.row}>
                <Text style={styles.label}>Doctor Notes:</Text>
                <Text style={styles.value}>{doctor.notes}</Text>
              </View>
            )}
          </View>
        )}

        {/* Facility Information Card */}
        {facility && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="business" size={20} color="#8B5CF6" />
              <Text style={styles.cardHeaderTitle}>Facility Details</Text>
            </View>

            {facility.name_bn && (
              <View style={styles.row}>
                <Text style={styles.label}>Name (বাংলা):</Text>
                <Text style={[styles.value, styles.boldBn]}>
                  {facility.name_bn}
                </Text>
              </View>
            )}

            {facility.name_en && (
              <View style={styles.row}>
                <Text style={styles.label}>Name (English):</Text>
                <Text style={[styles.value, styles.bold]}>
                  {facility.name_en}
                </Text>
              </View>
            )}

            <View style={styles.row}>
              <Text style={styles.label}>Facility Type:</Text>
              <Text style={styles.value}>{facility.facility_type}</Text>
            </View>

            {facility.address && (
              <View style={styles.row}>
                <Text style={styles.label}>Address:</Text>
                <Text style={styles.value}>{facility.address}</Text>
              </View>
            )}

            {(facility.district || facility.division) && (
              <View style={styles.row}>
                <Text style={styles.label}>Region:</Text>
                <Text style={styles.value}>
                  {[facility.upazila, facility.district, facility.division]
                    .filter(Boolean)
                    .join(", ")}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Chamber Schedule Card */}
        {doctorFacility && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="time" size={20} color="#F59E0B" />
              <Text style={styles.cardHeaderTitle}>Chamber Schedule</Text>
            </View>

            {visitingDaysList.length > 0 && (
              <View style={{ marginBottom: 8 }}>
                <Text style={styles.label}>Visiting Days:</Text>
                <View style={styles.chipsWrap}>
                  {visitingDaysList.map((day) => (
                    <View key={day} style={styles.dayChip}>
                      <Text style={styles.dayChipText}>{day}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {doctorFacility.visiting_start_time && (
              <View style={styles.row}>
                <Text style={styles.label}>Visiting Hours:</Text>
                <Text style={styles.value}>
                  {doctorFacility.visiting_start_time}
                </Text>
              </View>
            )}

            {doctorFacility.appointment_phone && (
              <View style={styles.row}>
                <Text style={styles.label}>Serial Phone:</Text>
                <Text style={[styles.value, styles.phoneText]}>
                  {doctorFacility.appointment_phone}
                </Text>
              </View>
            )}

            {doctorFacility.consultation_fee !== null && (
              <View style={styles.row}>
                <Text style={styles.label}>Consultation Fee:</Text>
                <Text style={[styles.value, styles.feeText]}>
                  {doctorFacility.consultation_fee} BDT
                </Text>
              </View>
            )}
          </View>
        )}

        {/* GPS Location Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons
              name={hasGps ? "location" : "location-outline"}
              size={20}
              color={hasGps ? Colors.success : Colors.danger}
            />
            <Text style={styles.cardHeaderTitle}>GPS Location</Text>
          </View>

          {hasGps ? (
            <View>
              <View style={styles.row}>
                <Text style={styles.label}>Latitude:</Text>
                <Text style={styles.value}>{survey.latitude?.toFixed(6)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Longitude:</Text>
                <Text style={styles.value}>{survey.longitude?.toFixed(6)}</Text>
              </View>
              {survey.gps_accuracy_meters !== null && (
                <View style={styles.row}>
                  <Text style={styles.label}>Accuracy:</Text>
                  <Text style={styles.value}>
                    ±{Math.round(survey.gps_accuracy_meters)} meters
                  </Text>
                </View>
              )}
              {survey.location_captured_at && (
                <View style={styles.row}>
                  <Text style={styles.label}>Captured At:</Text>
                  <Text style={styles.value}>
                    {new Date(survey.location_captured_at).toLocaleString()}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <Text style={styles.noGpsText}>
              No GPS coordinates recorded for this survey.
            </Text>
          )}
        </View>

        {/* Photographs Gallery */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="images" size={20} color={Colors.primary} />
            <Text style={styles.cardHeaderTitle}>
              Photographs ({photos.length})
            </Text>
          </View>

          {photos.length > 0 ? (
            <View style={styles.photosGrid}>
              {photos.map((p) => {
                const uri = fileStorage.resolveUri(p.local_path);
                return (
                  <View key={p.id} style={styles.photoItem}>
                    <TouchableOpacity
                      onPress={() => setPreviewPhoto(p)}
                      activeOpacity={0.85}
                    >
                      <Image
                        source={{ uri }}
                        style={styles.galleryImage}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>

                    <Text style={styles.photoTypeBadge} numberOfLines={1}>
                      {p.photo_type}
                    </Text>

                    {p.raw_ocr_text && (
                      <TouchableOpacity
                        onPress={() => setRawTextModalPhoto(p)}
                        style={styles.viewOcrBtn}
                      >
                        <Ionicons
                          name="document-text-outline"
                          size={12}
                          color={Colors.primary}
                        />
                        <Text style={styles.viewOcrText}>View OCR Text</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.noPhotosText}>No photographs attached.</Text>
          )}
        </View>

        {/* Survey Notes */}
        {survey.notes && (
          <View style={styles.card}>
            <Text style={styles.cardHeaderTitle}>Field Notes</Text>
            <Text style={styles.surveyNotesText}>{survey.notes}</Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <Button
            title="Edit Survey"
            onPress={() =>
              router.push({
                pathname: "/survey/edit/[id]",
                params: { id: survey.id },
              })
            }
            variant="outline"
            icon="create-outline"
            style={{ flex: 1, marginRight: 8 }}
          />

          <Button
            title="Delete Record"
            onPress={() => setConfirmDeleteVisible(true)}
            variant="danger"
            icon="trash-outline"
            style={{ flex: 1, marginLeft: 8 }}
          />
        </View>
      </ScrollView>

      {/* Full Photo Preview Modal */}
      <Modal
        visible={previewPhoto !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewPhoto(null)}
      >
        <View style={styles.fullModalOverlay}>
          <TouchableOpacity
            style={styles.modalCloseBtn}
            onPress={() => setPreviewPhoto(null)}
          >
            <Ionicons name="close" size={28} color={Colors.white} />
          </TouchableOpacity>
          {previewPhoto && (
            <Image
              source={{ uri: fileStorage.resolveUri(previewPhoto.local_path) }}
              style={styles.modalImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {/* Raw OCR Text Modal */}
      <Modal
        visible={rawTextModalPhoto !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setRawTextModalPhoto(null)}
      >
        <View style={styles.ocrModalOverlay}>
          <View style={[styles.ocrModalCard, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            <View style={styles.ocrModalHeader}>
              <Text style={styles.ocrModalTitle}>Raw OCR Extracted Text</Text>
              <TouchableOpacity onPress={() => setRawTextModalPhoto(null)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.ocrModalScroll}>
              <Text style={styles.ocrModalContent} selectable>
                {rawTextModalPhoto?.raw_ocr_text || "No text found."}
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Confirm Delete Modal */}
      <ConfirmModal
        visible={deleteModalVisible}
        title="Delete Survey Record"
        message="Are you sure you want to delete this survey record and its associated photographs? This cannot be undone."
        confirmLabel="Delete Permanently"
        isDangerous
        loading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingBox: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  notFoundText: {
    fontSize: 16,
    color: Colors.danger,
    marginBottom: 16,
  },
  statusBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.white,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 14,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: "600",
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  cardHeaderTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
    marginLeft: 8,
  },
  row: {
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "600",
    marginBottom: 2,
  },
  value: {
    fontSize: 14,
    color: Colors.text,
  },
  bold: {
    fontWeight: "700",
  },
  boldBn: {
    fontWeight: "700",
    fontSize: 16,
  },
  bmdcText: {
    fontWeight: "700",
    color: Colors.primaryDark,
  },
  phoneText: {
    fontWeight: "700",
    color: "#0284C7",
  },
  feeText: {
    fontWeight: "700",
    color: Colors.success,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
  },
  dayChip: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 4,
  },
  dayChipText: {
    fontSize: 11,
    color: Colors.primaryDark,
    fontWeight: "600",
  },
  noGpsText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  photosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
  },
  photoItem: {
    width: "48%",
    marginHorizontal: "1%",
    marginBottom: 12,
    backgroundColor: Colors.background,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  galleryImage: {
    width: "100%",
    height: 120,
  },
  photoTypeBadge: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.text,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  viewOcrBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingBottom: 6,
  },
  viewOcrText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: "600",
    marginLeft: 4,
  },
  noPhotosText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  surveyNotesText: {
    fontSize: 13,
    color: Colors.text,
    lineHeight: 18,
    marginTop: 6,
  },
  actionRow: {
    flexDirection: "row",
    marginTop: 10,
    marginBottom: 20,
  },
  fullModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCloseBtn: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  modalImage: {
    width: "100%",
    height: "80%",
  },
  ocrModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  ocrModalCard: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
    padding: 20,
  },
  ocrModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  ocrModalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
  },
  ocrModalScroll: {
    maxHeight: 300,
  },
  ocrModalContent: {
    fontSize: 13,
    lineHeight: 20,
    color: Colors.text,
    fontFamily: "monospace",
  },
  draftBanner: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  draftBannerContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 10,
  },
  draftIconBadge: {
    backgroundColor: "#FEF3C7",
    padding: 6,
    borderRadius: 8,
  },
  draftBannerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#92400E",
  },
  draftBannerText: {
    fontSize: 12,
    color: "#78350F",
    marginTop: 2,
    lineHeight: 17,
  },
  draftBannerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#D97706",
    paddingVertical: 9,
    borderRadius: 8,
  },
  draftBannerBtnText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: "700",
  },
  ocrCard: {
    borderColor: "#99F6E4",
    borderWidth: 1.2,
    backgroundColor: "#F0FDFA",
  },
  ocrCardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  ocrProviderTag: {
    backgroundColor: "#CCFBF1",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  ocrProviderText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.primaryDark,
  },
  ocrCardSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  ocrCardActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#CCFBF1",
  },
  ocrViewRawBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.white,
    gap: 5,
  },
  ocrViewRawBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.primary,
  },
  ocrApplyInEditBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    gap: 5,
  },
  ocrApplyInEditBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.white,
  },
});
