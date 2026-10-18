import { useState, useEffect, useCallback } from 'react';
import { surveyRepository } from '../database/repositories/surveyRepository';
import { DashboardStats, SurveySummaryItem } from '../types';

export function useDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalSurveys: 0,
    totalDoctors: 0,
    totalFacilities: 0,
    surveysToday: 0,
    surveysWithOcr: 0,
    surveysMissingGps: 0,
    draftSurveys: 0,
    completedSurveys: 0,
  });

  const [recentSurveys, setRecentSurveys] = useState<SurveySummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [fetchedStats, fetchedRecent] = await Promise.all([
        surveyRepository.getDashboardStats(),
        surveyRepository.getSummaries({ limit: 6, sortBy: 'newest' }),
      ]);
      setStats(fetchedStats);
      setRecentSurveys(fetchedRecent);
    } catch (err: any) {
      setError(err?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    stats,
    recentSurveys,
    loading,
    error,
    refresh: loadData,
  };
}

