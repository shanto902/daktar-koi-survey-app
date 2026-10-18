import { useState, useEffect, useCallback, useRef } from 'react';
import { surveyRepository, SurveyFilterOptions } from '../database/repositories/surveyRepository';
import { fileStorage } from '../services/storage/fileStorage';
import { SurveySummaryItem, SurveyType, SurveyStatus } from '../types';

export function useSurveys() {
  const [surveys, setSurveys] = useState<SurveySummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<SurveyType | undefined>(undefined);
  const [selectedStatus, setSelectedStatus] = useState<SurveyStatus | undefined>(undefined);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');

  // Keep a ref to the latest filter values so fetchSurveys has a stable reference identity
  const filtersRef = useRef<SurveyFilterOptions>({
    query: searchQuery,
    surveyType: selectedType,
    status: selectedStatus,
    sortBy,
  });

  const fetchSurveys = useCallback(async (isPullToRefresh = false) => {
    try {
      if (isPullToRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const results = await surveyRepository.getSummaries(filtersRef.current);
      setSurveys(results);
    } catch (err: any) {
      setError(err?.message || 'Failed to load surveys');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Fetch whenever filter criteria changes and keep filtersRef synchronized
  useEffect(() => {
    filtersRef.current = {
      query: searchQuery,
      surveyType: selectedType,
      status: selectedStatus,
      sortBy,
    };
    fetchSurveys(false);
  }, [searchQuery, selectedType, selectedStatus, sortBy, fetchSurveys]);

  const refresh = useCallback(() => {
    return fetchSurveys(true);
  }, [fetchSurveys]);

  const deleteSurvey = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { deleted, photoPathsToDelete } = await surveyRepository.deleteSurvey(id);
      if (deleted) {
        // Clean up associated photo files safely from storage
        for (const path of photoPathsToDelete) {
          await fileStorage.deletePhoto(path);
        }
        setSurveys((prev) => prev.filter((s) => s.id !== id));
        return true;
      }
      return false;
    } catch (err: any) {
      setError(err?.message || 'Failed to delete survey');
      return false;
    }
  }, []);

  return {
    surveys,
    loading,
    refreshing,
    error,
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
  };
}

