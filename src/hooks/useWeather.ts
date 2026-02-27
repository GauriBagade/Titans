import { useState, useEffect, useCallback } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { Geolocation } from "@capacitor/geolocation";

export interface WeatherData {
  temperature: number;
  humidity: number;
  rainfall: number;
  description?: string;
  icon?: string;
  windSpeed?: number;
}

export interface ForecastDay {
  date: string;
  dayName: string;
  temperature: number;
  tempMin: number;
  tempMax: number;
  humidity: number;
  rainfall: number;
  description: string;
  icon: string;
  windSpeed: number;
}

export interface GeoLocation {
  lat: number;
  lon: number;
}

interface UseWeatherReturn {
  weather: WeatherData | null;
  forecast: ForecastDay[];
  location: GeoLocation | null;
  locationName: string;
  isLoading: boolean;
  error: string | null;
  refreshWeather: () => Promise<void>;
  requestLocation: () => Promise<void>;
}

export const useWeather = (): UseWeatherReturn => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [locationName, setLocationName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    if (message.includes("permission") || code.includes("permission")) {
      return "You do not have permission to access weather data.";
    }
    if (
      message.includes("network") ||
      message.includes("unavailable") ||
      code.includes("unavailable")
    ) {
      return "Network issue while fetching weather. Please check internet and try again.";
    }
    if (message === "internal" || code.includes("internal")) {
      return "Weather service is temporarily unavailable. Please try again.";
    }
    return rawMessage || "Failed to fetch weather";
  };

  const fetchWeather = useCallback(async (lat: number, lon: number) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log("Sending to Firebase:", lat, lon);

      const getWeather = httpsCallable(functions, "getWeather");
      const response: any = await getWeather({ lat, lon });
      const data = response.data;

      if (!data) throw new Error("No weather data returned");

      if (data.current) {
        setWeather({
          temperature: data.current.temperature,
          humidity: data.current.humidity,
          rainfall: data.current.rainfall,
          description: data.current.description,
          icon: data.current.icon,
          windSpeed: data.current.windSpeed,
        });

        setForecast(data.forecast || []);
      }

      setLocationName(
        data.location || `${lat.toFixed(4)}, ${lon.toFixed(4)}`
      );
    } catch (err: any) {
      console.error("Weather fetch error:", err);
      setError(mapCallableError(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const requestLocation = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      const permission = await Geolocation.requestPermissions();
      if (permission.location !== "granted") {
        setError("Location permission denied. Please enable location access.");
        setIsLoading(false);
        return;
      }

      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000,
      });

      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      const nextLocation = { lat: latitude, lon: longitude };

      setLocation(nextLocation);
      localStorage.setItem("userGeoLocation", JSON.stringify(nextLocation));

      const deviceToken = localStorage.getItem("pushDeviceToken");
      if (deviceToken) {
        try {
          const updateAlertDeviceLocation = httpsCallable(functions, "updateAlertDeviceLocation");
          await updateAlertDeviceLocation({
            token: deviceToken,
            lat: latitude,
            lon: longitude,
          });
        } catch (syncErr) {
          console.error("Failed to sync alert device location:", syncErr);
        }
      }

      await fetchWeather(latitude, longitude);
    } catch (err: any) {
      setError(err?.message || "Unable to get your location");
      setIsLoading(false);
    }
  }, [fetchWeather]);

  const refreshWeather = useCallback(async () => {
    if (location) {
      await fetchWeather(location.lat, location.lon);
    } else {
      await requestLocation();
    }
  }, [location, fetchWeather, requestLocation]);

  useEffect(() => {
    const cachedLocation = localStorage.getItem("userGeoLocation");
    if (cachedLocation) {
      try {
        const { lat, lon } = JSON.parse(cachedLocation);
        setLocation({ lat, lon });
        fetchWeather(lat, lon);
      } catch (e) {
        console.error("Error parsing cached location:", e);
      }
    }
  }, [fetchWeather]);

  return {
    weather,
    forecast,
    location,
    locationName,
    isLoading,
    error,
    refreshWeather,
    requestLocation,
  };
};
