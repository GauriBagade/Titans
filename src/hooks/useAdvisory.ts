import { useState, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { useLanguage } from '@/contexts/LanguageContext';
import { functions } from '@/lib/firebase';
import { toast } from 'sonner';
import type { ForecastDay } from './useWeather';

export interface DayPlan {
  day: number;
  dayName: string;
  activity: string;
  reason: string;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface PestAlert {
  pest: string;
  risk: 'low' | 'medium' | 'high';
  conditions: string;
  prevention: string[];
}

export interface Advisory {
  mainAdvice: string;
  riskLevel: 'low' | 'medium' | 'high';
  tips: string[];
  irrigationAdvice: string;
  fertilizerAdvice: string;
  threeDayPlan?: DayPlan[];
  pestAlerts?: PestAlert[];
}

export interface WeatherInput {
  temperature: number;
  humidity: number;
  rainfall: number;
  description?: string;
  windSpeed?: number;
}

export interface FarmInput {
  crops: string[];
  farmSize?: string;
  season?: string;
}

interface UseAdvisoryReturn {
  advisory: Advisory | null;
  isLoading: boolean;
  error: string | null;
  generateAdvisory: (weather: WeatherInput, farm?: FarmInput, forecast?: ForecastDay[]) => Promise<void>;
}

export const useAdvisory = (): UseAdvisoryReturn => {
  const [advisory, setAdvisory] = useState<Advisory | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { language } = useLanguage();

  const mapCallableError = (err: unknown): string => {
    const rawMessage =
      typeof err === "object" && err && "message" in err
        ? String((err as { message?: unknown }).message ?? "")
        : "";
    const rawCode =
      typeof err === "object" && err && "code" in err
        ? String((err as { code?: unknown }).code ?? "")
        : "";
    const message = rawMessage.toLowerCase();
    const code = rawCode.toLowerCase();

    if (message.includes("rate limit") || code.includes("resource-exhausted")) {
      return "Too many requests. Please wait a moment and try again.";
    }
    if (message.includes("credits")) {
      return "AI service credits exhausted.";
    }
    if (message.includes("unavailable") || code.includes("unavailable")) {
      return "Advisory service is currently unavailable. Please retry shortly.";
    }
    if (message === "internal" || code.includes("internal")) {
      return "Advisory service had a temporary issue. Please try again.";
    }
    return rawMessage || "Failed to generate advisory";
  };

  const generateAdvisory = useCallback(async (weather: WeatherInput, farm?: FarmInput, forecast?: ForecastDay[]) => {
    setIsLoading(true);
    setError(null);

    try {
      const generateAdvisoryFn = httpsCallable(functions, "generateAdvisory");
      const response: any = await generateAdvisoryFn({
        weather,
        forecast,
        farm,
        language,
      });
      const data = response?.data;

      if (data.error) {
        if (data.error.includes('Rate limit')) {
          toast.error('Too many requests. Please wait a moment and try again.');
        } else if (data.error.includes('credits')) {
          toast.error('AI service credits exhausted.');
        }
        throw new Error(data.error);
      }

      setAdvisory(data as Advisory);
    } catch (err) {
      console.error('Advisory generation error:', err);
      const errorMessage = mapCallableError(err);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [language]);

  return {
    advisory,
    isLoading,
    error,
    generateAdvisory,
  };
};
