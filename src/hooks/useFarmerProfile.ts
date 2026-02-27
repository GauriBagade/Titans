import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { FarmerProfile, Farm } from "@/types/farm";
import { db } from "@/lib/firebase";

export const useFarmerProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<FarmerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch profile and farms from Firestore
  const fetchProfile = async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const profileRef = doc(db, "profiles", user.uid);
      const profileSnap = await getDoc(profileRef);

      if (profileSnap.exists()) {
        const dbProfile = profileSnap.data() as any;
        const farmerProfile: FarmerProfile = {
          name: dbProfile.name || "",
          location: dbProfile.location || "",
          village: dbProfile.village || "",
          farmingSeason: dbProfile.farmingSeason || "",
          farms: Array.isArray(dbProfile.farms)
            ? dbProfile.farms.map((f: Farm) => ({
                id: f.id,
                name: f.name || "",
                size: f.size,
                crops: Array.isArray(f.crops) ? f.crops : [],
              }))
            : [],
        };
        
        setProfile(farmerProfile);
        localStorage.setItem("farmerProfile", JSON.stringify(farmerProfile));
        localStorage.setItem("onboardingComplete", "true");
      } else {
        setProfile(null);
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
      setError("Failed to load profile");
      
      // Fallback to localStorage
      const saved = localStorage.getItem("farmerProfile");
      if (saved) {
        try {
          setProfile(JSON.parse(saved));
        } catch (e) {
          console.error("Error parsing local profile:", e);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Save profile to Firestore
  const saveProfile = async (newProfile: FarmerProfile): Promise<{ error: Error | null }> => {
    if (!user) {
      return { error: new Error("Not authenticated") };
    }

    try {
      const profileRef = doc(db, "profiles", user.uid);
      await setDoc(
        profileRef,
        {
          userId: user.uid,
          name: newProfile.name || "",
          location: newProfile.location || "",
          village: newProfile.village || "",
          farmingSeason: newProfile.farmingSeason || "",
          farms: newProfile.farms || [],
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // Update local state and storage
      setProfile(newProfile);
      localStorage.setItem("farmerProfile", JSON.stringify(newProfile));
      localStorage.setItem("onboardingComplete", "true");

      return { error: null };
    } catch (err) {
      console.error("Error saving profile:", err);
      return { error: err as Error };
    }
  };

  // Check if profile exists
  const hasProfile = (): boolean => {
    return profile !== null && profile.location !== "" && profile.farms.length > 0;
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  return {
    profile,
    loading,
    error,
    saveProfile,
    hasProfile,
    refetch: fetchProfile,
  };
};
