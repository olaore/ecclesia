import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../lib/api";

export interface AttendanceTrend {
  month: string;
  sundayAvg: number;
  midweekAvg: number;
}

export interface Celebrant {
  id: string;
  fullName: string;
  type: "member" | "known_person";
  celebrationType: "birthday" | "anniversary";
  day: number;
  month: number;
}

export const useAttendanceTrends = () => {
  return useQuery({
    queryKey: ["attendance-trends"],
    queryFn: async () => {
      const response = await apiClient<{ data: AttendanceTrend[] }>("/analytics/attendance-trends");
      return response.data;
    },
  });
};

export const useCelebrants = (month?: number) => {
  // If no month is provided, the API defaults to the current month
  const query = month ? `?month=${month}` : "";

  return useQuery({
    queryKey: ["celebrants", month],
    queryFn: async () => {
      const response = await apiClient<{ data: Celebrant[] }>(`/celebrants${query}`);
      return response.data;
    },
  });
};
