import * as functions from "firebase-functions";
import * as functionsV1 from "firebase-functions/v1";
import * as admin from "firebase-admin";
import fetch from "node-fetch";
import {createHash} from "crypto";

interface ForecastDay {
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

interface AdvisoryInputWeather {
  temperature: number;
  humidity: number;
  rainfall: number;
  description?: string;
  windSpeed?: number;
}

interface AdvisoryInputFarm {
  crops?: string[];
  farmSize?: string;
  season?: string;
}

interface DeviceRecord {
  token: string;
  lat: number;
  lon: number;
  platform: string;
  locationName: string;
  enabled: boolean;
  updatedAt: FirebaseFirestore.FieldValue;
}

interface AlertPayload {
  type: "heavy_rain" | "frost" | "heat" | "strong_wind";
  severity: "warning" | "danger";
  title: string;
  message: string;
}

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();
const ALERT_DEVICES_COLLECTION = "alert_devices";
const ALERT_THRESHOLDS = {
  HEAVY_RAIN_MM: 20,
  FROST_TEMP_C: 5,
  HEAT_TEMP_C: 40,
  STRONG_WIND_KMH: 40,
};

const weatherCodeMap: Record<number, { description: string; icon: string }> = {
  0: { description: "Clear sky", icon: "01d" },
  1: { description: "Mainly clear", icon: "02d" },
  2: { description: "Partly cloudy", icon: "03d" },
  3: { description: "Overcast", icon: "04d" },
  61: { description: "Rain", icon: "10d" },
  63: { description: "Moderate rain", icon: "10d" },
  65: { description: "Heavy rain", icon: "10d" },
  95: { description: "Thunderstorm", icon: "11d" },
};

function getWeatherInfo(code: number) {
  return weatherCodeMap[code] || { description: "Unknown", icon: "01d" };
}

function buildAdvisory(
  weather: AdvisoryInputWeather,
  farm?: AdvisoryInputFarm,
  forecast: any[] = []
) {
  const tips: string[] = [];
  let riskLevel: "low" | "medium" | "high" = "low";

  if (weather.rainfall >= 20) {
    riskLevel = "high";
    tips.push("Avoid additional irrigation and open drainage channels.");
  } else if (weather.rainfall >= 5) {
    riskLevel = "medium";
    tips.push("Reduce irrigation frequency and monitor field moisture.");
  } else {
    tips.push("Irrigate based on soil moisture and crop stage.");
  }

  if (weather.temperature >= 40) {
    riskLevel = "high";
    tips.push("Protect crops from heat stress; irrigate early morning.");
  } else if (weather.temperature <= 8) {
    riskLevel = riskLevel === "high" ? "high" : "medium";
    tips.push("Watch for cold stress and protect sensitive crops at night.");
  }

  if (weather.humidity >= 85) {
    riskLevel = riskLevel === "high" ? "high" : "medium";
    tips.push("High humidity can increase fungal risk; improve airflow.");
  }

  const crops = farm?.crops || [];
  const cropLine = crops.length > 0 ? `for ${crops.join(", ")}` : "for your farm";
  const mainAdvice = `Today's advisory ${cropLine}: monitor moisture, check weather shifts, and prioritize preventive field actions.`;

  const threeDayPlan = (forecast || []).slice(0, 3).map((day: any, idx: number) => {
    const dayRisk: "low" | "medium" | "high" =
      day.rainfall >= 20 || day.tempMax >= 40 ? "high" : day.rainfall >= 5 || day.humidity >= 85 ? "medium" : "low";
    return {
      day: idx + 1,
      dayName: day.dayName || `Day ${idx + 1}`,
      activity:
        dayRisk === "high"
          ? "Focus on risk mitigation activities"
          : dayRisk === "medium"
            ? "Prioritize monitoring and preventive actions"
            : "Proceed with regular farm operations",
      reason: `Forecast: rain ${Math.round(day.rainfall || 0)}mm, humidity ${Math.round(day.humidity || 0)}%, max temp ${Math.round(day.tempMax || day.temperature || 0)}°C.`,
      riskLevel: dayRisk,
    };
  });

  const pestAlerts =
    weather.temperature >= 25 && weather.humidity >= 70
      ? [
          {
            pest: "General pest pressure",
            risk: "medium",
            conditions: "Warm and humid weather can increase pest activity.",
            prevention: [
              "Scout fields daily for early pest signs.",
              "Use integrated pest management before infestation rises.",
            ],
          },
        ]
      : [];

  return {
    mainAdvice,
    riskLevel,
    tips,
    irrigationAdvice:
      weather.rainfall > 5
        ? "Delay irrigation; recent rainfall likely supports crop water needs."
        : "Plan light irrigation based on soil moisture checks.",
    fertilizerAdvice:
      weather.rainfall >= 20
        ? "Avoid fertilizer application during heavy rain conditions."
        : "Apply fertilizer in cooler hours and avoid runoff.",
    threeDayPlan,
    pestAlerts,
  };
}

function getDeviceId(token: string): string {
  return createHash("sha1").update(token).digest("hex");
}

function validateToken(token: string): void {
  if (!token || token.length < 20) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "A valid push token is required"
    );
  }
}

function validateCoordinates(lat: number, lon: number): void {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Latitude and longitude are required"
    );
  }
}

function pickAlert(weatherData: any): AlertPayload | null {
  const current = weatherData?.current || {};
  const daily = weatherData?.daily || {};
  const todayRain = Number(daily?.precipitation_sum?.[0] ?? 0);
  const todayMin = Number(daily?.temperature_2m_min?.[0] ?? current?.temperature_2m ?? 99);
  const todayMax = Number(daily?.temperature_2m_max?.[0] ?? current?.temperature_2m ?? -99);
  const wind = Number(current?.wind_speed_10m ?? 0);
  const rain = Number(current?.precipitation ?? 0);

  if (todayMax >= ALERT_THRESHOLDS.HEAT_TEMP_C) {
    return {
      type: "heat",
      severity: "danger",
      title: "Heat Alert",
      message: `High temperature expected (${Math.round(todayMax)}°C). Protect crops and irrigate early.`,
    };
  }

  if (todayMin <= ALERT_THRESHOLDS.FROST_TEMP_C) {
    return {
      type: "frost",
      severity: "danger",
      title: "Frost Alert",
      message: `Low temperature risk (${Math.round(todayMin)}°C). Cover vulnerable crops tonight.`,
    };
  }

  if (todayRain >= ALERT_THRESHOLDS.HEAVY_RAIN_MM || rain >= ALERT_THRESHOLDS.HEAVY_RAIN_MM) {
    return {
      type: "heavy_rain",
      severity: "warning",
      title: "Heavy Rain Alert",
      message: `Heavy rainfall expected (${Math.round(todayRain)}mm). Ensure field drainage.`,
    };
  }

  if (wind >= ALERT_THRESHOLDS.STRONG_WIND_KMH) {
    return {
      type: "strong_wind",
      severity: "warning",
      title: "Strong Wind Alert",
      message: `Strong wind expected (${Math.round(wind)} km/h). Secure structures and avoid spraying.`,
    };
  }

  return null;
}

async function fetchWeatherSnapshot(lat: number, lon: number): Promise<any> {
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,precipitation,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&forecast_days=2&timezone=auto`;
  const response = await fetch(weatherUrl);
  const data = await response.json();
  if (!response.ok) {
    throw new Error("Weather snapshot fetch failed");
  }
  return data;
}

export const registerAlertDevice = functions.https.onCall(async (request) => {
  const token = String(request.data?.token || "").trim();
  const lat = Number(request.data?.lat);
  const lon = Number(request.data?.lon);
  const platform = String(request.data?.platform || "unknown");
  const locationName = String(request.data?.locationName || "");

  validateToken(token);
  validateCoordinates(lat, lon);

  const deviceId = getDeviceId(token);
  const payload: DeviceRecord = {
    token,
    lat,
    lon,
    platform,
    locationName,
    enabled: true,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.collection(ALERT_DEVICES_COLLECTION).doc(deviceId).set(payload, {merge: true});
  return {success: true};
});

export const updateAlertDeviceLocation = functions.https.onCall(async (request) => {
  const token = String(request.data?.token || "").trim();
  const lat = Number(request.data?.lat);
  const lon = Number(request.data?.lon);
  const locationName = String(request.data?.locationName || "");
  const platform = String(request.data?.platform || "unknown");

  validateToken(token);
  validateCoordinates(lat, lon);

  const deviceId = getDeviceId(token);
  await db.collection(ALERT_DEVICES_COLLECTION).doc(deviceId).set(
    {
      token,
      lat,
      lon,
      platform,
      locationName,
      enabled: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    {merge: true}
  );

  return {success: true};
});

export const runWeatherAlerts = functionsV1.pubsub
  .schedule("every 30 minutes")
  .timeZone("UTC")
  .onRun(async () => {
    const snapshot = await db
      .collection(ALERT_DEVICES_COLLECTION)
      .where("enabled", "==", true)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const today = new Date().toISOString().slice(0, 10);

    for (const doc of snapshot.docs) {
      const device = doc.data() as any;
      const token = String(device.token || "");
      const lat = Number(device.lat);
      const lon = Number(device.lon);
      const lastSentByType = (device.lastSentByType || {}) as Record<string, string>;

      if (!token || !Number.isFinite(lat) || !Number.isFinite(lon)) {
        continue;
      }

      try {
        const weatherData = await fetchWeatherSnapshot(lat, lon);
        const alert = pickAlert(weatherData);
        if (!alert) {
          continue;
        }

        if (lastSentByType[alert.type] === today) {
          continue;
        }

        await admin.messaging().send({
          token,
          notification: {
            title: alert.title,
            body: alert.message,
          },
          data: {
            type: alert.type,
            severity: alert.severity,
            lat: String(lat),
            lon: String(lon),
            target: "/advisory",
          },
          android: {
            priority: "high",
            notification: {
              channelId: "weather-alerts",
              sound: "default",
            },
          },
          apns: {
            headers: {"apns-priority": "10"},
            payload: {aps: {sound: "default"}},
          },
        });

        await doc.ref.set(
          {
            lastSentByType: {
              ...lastSentByType,
              [alert.type]: today,
            },
            lastAlertAt: admin.firestore.FieldValue.serverTimestamp(),
            lastAlertType: alert.type,
          },
          {merge: true}
        );
      } catch (error: any) {
        const code = String(error?.code || "");
        const shouldDisable =
          code.includes("registration-token-not-registered") ||
          code.includes("invalid-registration-token");

        await doc.ref.set(
          {
            enabled: shouldDisable ? false : true,
            lastError: String(error?.message || error),
            lastErrorAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          {merge: true}
        );
      }
    }

    return null;
  });

export const getWeather = functions.https.onCall(async (request) => {
  const lat = Number(request.data?.lat);
  const lon = Number(request.data?.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Latitude and longitude are required"
    );
  }

  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code,wind_speed_10m_max,relative_humidity_2m_max&timezone=auto&forecast_days=6`;

  const response = await fetch(weatherUrl);
  const weatherData: any = await response.json();

  if (!response.ok) {
    throw new functions.https.HttpsError(
      "internal",
      "Failed to fetch weather"
    );
  }

  const current = weatherData.current;
  const weatherInfo = getWeatherInfo(current.weather_code);

  const forecast: ForecastDay[] = [];
  const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

  if (weatherData.daily) {
    for (let i = 1; i < Math.min(weatherData.daily.time.length, 6); i++) {
      const date = new Date(weatherData.daily.time[i]);
      const info = getWeatherInfo(weatherData.daily.weather_code[i]);

      forecast.push({
        date: weatherData.daily.time[i],
        dayName: dayNames[date.getDay()],
        temperature: Math.round(
          (weatherData.daily.temperature_2m_max[i] +
            weatherData.daily.temperature_2m_min[i]) / 2
        ),
        tempMin: Math.round(weatherData.daily.temperature_2m_min[i]),
        tempMax: Math.round(weatherData.daily.temperature_2m_max[i]),
        humidity: weatherData.daily.relative_humidity_2m_max[i] || 50,
        rainfall: weatherData.daily.precipitation_sum[i] || 0,
        description: info.description,
        icon: info.icon,
        windSpeed: weatherData.daily.wind_speed_10m_max[i] || 0,
      });
    }
  }

  let locationName = "Unknown Location";
  try {
    const geoUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
    const geoResponse = await fetch(geoUrl, {
      headers: { "User-Agent": "FarmAdvisoryApp/1.0" },
    });

    if (geoResponse.ok) {
      const geoData: any = await geoResponse.json();
      const city =
        geoData.address?.city ||
        geoData.address?.town ||
        geoData.address?.village ||
        geoData.address?.county;
      const state = geoData.address?.state;

      if (city && state) {
        locationName = `${city}, ${state}`;
      } else if (city) {
        locationName = city;
      } else if (state) {
        locationName = state;
      }
    }
  } catch (e) {
    console.error("Reverse geocoding failed:", e);
  }

  return {
    current: {
      temperature: current.temperature_2m,
      humidity: current.relative_humidity_2m,
      rainfall: current.precipitation,
      description: weatherInfo.description,
      icon: weatherInfo.icon,
      windSpeed: current.wind_speed_10m,
    },
    forecast,
    location: locationName,
  };
});

export const generateAdvisory = functions.https.onCall(async (request) => {
  const weather = request.data?.weather as AdvisoryInputWeather | undefined;
  const farm = request.data?.farm as AdvisoryInputFarm | undefined;
  const forecast = (request.data?.forecast || []) as any[];

  if (!weather) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Weather payload is required"
    );
  }

  return buildAdvisory(weather, farm, forecast);
});
