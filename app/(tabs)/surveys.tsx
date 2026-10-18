import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { ConfirmModal } from "../../src/components/common/ConfirmModal";
import { EmptyState } from "../../src/components/common/EmptyState";
import { Header } from "../../src/components/common/Header";
import { Input } from "../../src/components/common/Input";
import {
  SelectModal,
  SelectOption,
} from "../../src/components/common/SelectModal";
import { SurveyCard } from "../../src/components/survey/SurveyCard";
import { Colors } from "../../src/constants/colors";
import {
  SURVEY_STATUSES,
  SURVEY_TYPES,
  SurveyType,
} from "../../src/constants/surveyTypes";
import { useSurveys } from "../../src/hooks/useSurveys";

export default function SurveysHistoryScreen() {
  const insets = useSafeAreaInsets();
  const {
    surveys,
    loading,
    refreshing,
    searchQuery,
    setSearchQuery,
    selectedType,
    setSelectedType,
    selectedStatus,
    setSelectedStatus,
    sortBy,
    setSortBy,
    refresh,
    deleteSurvey,
  } = useSurveys();

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const handleConfirmDelete = async () => {
    if (deleteId) {
      setIsDeleting(true);
      await deleteSurvey(deleteId);
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const surveyTypeOptions: SelectOption[] = [
    { label: "All Types / সব ধরন", value: "ALL" },
    ...SURVEY_TYPES.map((t) => ({
      label: t.label,
      labelBn: t.labelBn,
      value: t.value,
      icon: t.icon as any,
    })),
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <Header
        title="Survey History"
        subtitle={`${surveys.length} records in local SQLite`}
        rightAction={{
          icon: "add",
          label: "New",
          onPress: () => router.push("/(tabs)/new-survey"),
        }}
      />

      <View style={styles.container}>
        {/* Search Input Box */}
        <View style={styles.searchContainer}>
          <Input
            placeholder="Search doctor, clinic, phone, or notes..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            leftIcon="search-outline"
            clearButton
            style={{ fontSize: 14 }}
          />
        </View>

        {/* Filters and Sort Row */}
        <View style={styles.filterBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {/* Type Filter Pill */}
            <TouchableOpacity
              onPress={() => setFilterModalVisible(true)}
              style={[
                styles.filterPill,
                selectedType && styles.filterPillActive,
              ]}
            >
              <Ionicons
                name="funnel-outline"
                size={14}
                color={selectedType ? Colors.primary : Colors.textSecondary}
              />
              <Text
                style={[
                  styles.filterPillText,
                  selectedType && styles.filterPillTextActive,
                ]}
                numberOfLines={1}
              >
                {selectedType || "Type: All"}
              </Text>
              <Ionicons
                name="chevron-down"
                size={12}
                color={selectedType ? Colors.primary : Colors.textMuted}
              />
            </TouchableOpacity>

            {/* Status Pills */}
            <TouchableOpacity
              onPress={() => setSelectedStatus(undefined)}
              style={[
                styles.statusPill,
                !selectedStatus && styles.statusPillActive,
              ]}
            >
              <Text
                style={[
                  styles.statusPillText,
                  !selectedStatus && styles.statusPillTextActive,
                ]}
              >
                All Status
              </Text>
            </TouchableOpacity>

            {SURVEY_STATUSES.map((st) => {
              const active = selectedStatus === st.value;
              return (
                <TouchableOpacity
                  key={st.value}
                  onPress={() =>
                    setSelectedStatus(active ? undefined : st.value)
                  }
                  style={[
                    styles.statusPill,
                    active && {
                      backgroundColor: st.bgColor,
                      borderColor: st.color,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      active && { color: st.color, fontWeight: "700" },
                    ]}
                  >
                    {st.label}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* Sort Toggle */}
            <TouchableOpacity
              onPress={() =>
                setSortBy((prev) => (prev === "newest" ? "oldest" : "newest"))
              }
              style={styles.sortPill}
            >
              <Ionicons
                name="swap-vertical"
                size={14}
                color={Colors.textSecondary}
              />
              <Text style={styles.sortPillText}>
                {sortBy === "newest" ? "Newest" : "Oldest"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Survey List */}
        <FlatList
          data={surveys}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 80 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              colors={[Colors.primary]}
            />
          }
          renderItem={({ item }) => (
            <SurveyCard
              item={item}
              onPress={() =>
                router.push({
                  pathname: "/survey/[id]",
                  params: { id: item.id },
                })
              }
              onEdit={() =>
                router.push({
                  pathname: "/survey/edit/[id]",
                  params: { id: item.id },
                })
              }
              onDelete={() => setDeleteId(item.id)}
            />
          )}
          ListEmptyComponent={
            loading ? undefined : (
              <EmptyState
                icon="search-outline"
                title="No Surveys Found"
                description={
                  searchQuery || selectedType || selectedStatus
                    ? "No records match your active search or filters."
                    : "No survey records have been saved yet."
                }
                actionLabel={
                  searchQuery || selectedType || selectedStatus
                    ? "Clear Filters"
                    : "New Survey"
                }
                onAction={() => {
                  if (searchQuery || selectedType || selectedStatus) {
                    setSearchQuery("");
                    setSelectedType(undefined);
                    setSelectedStatus(undefined);
                  } else {
                    router.push("/(tabs)/new-survey");
                  }
                }}
              />
            )
          }
        />
      </View>

      {/* Filter by Type Modal */}
      <SelectModal
        visible={filterModalVisible}
        title="Filter by Survey Type"
        options={surveyTypeOptions}
        selectedValue={selectedType || "ALL"}
        onSelect={(opt) => {
          setSelectedType(
            opt.value === "ALL" ? undefined : (opt.value as SurveyType),
          );
        }}
        onClose={() => setFilterModalVisible(false)}
        searchable={false}
      />

      {/* Confirm Delete Survey Modal */}
      <ConfirmModal
        visible={deleteId !== null}
        title="Delete Survey Record"
        message="Are you sure you want to delete this survey record? All associated local photographs and OCR logs will be safely deleted from storage."
        confirmLabel="Delete"
        isDangerous
        loading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteId(null)}
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  filterBar: {
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  filterScroll: {
    paddingHorizontal: 16,
    alignItems: "center",
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,
  },
  filterPillActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginHorizontal: 4,
  },
  filterPillTextActive: {
    color: Colors.primaryDark,
    fontWeight: "700",
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 6,
  },
  statusPillActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  statusPillTextActive: {
    color: Colors.primaryDark,
    fontWeight: "700",
  },
  sortPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginLeft: 4,
  },
  sortPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
});
