import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { TextToSpeech } from "@capacitor-community/text-to-speech";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";

interface ListenButtonProps {
  text: string;
  className?: string;
  compact?: boolean;
}

const ListenButton = ({ text, className, compact = false }: ListenButtonProps) => {
  const { language, t } = useLanguage();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isNative = Capacitor.isNativePlatform();

  const getLanguageCode = () => {
    switch (language) {
      case "hi":
        return "hi-IN";
      case "mr":
        return "mr-IN";
      case "ta":
        return "ta-IN";
      case "te":
        return "te-IN";
      case "kn":
        return "kn-IN";
      case "bn":
        return "bn-IN";
      case "gu":
        return "gu-IN";
      case "or":
        return "or-IN";
      case "ml":
        return "ml-IN";
      case "pa":
        return "pa-IN";
      default:
        return "en-IN";
    }
  };

  const parseErrorMessage = (error: unknown) => {
    if (error instanceof Error && error.message) return error.message;
    if (typeof error === "string") return error;
    if (
      typeof error === "object" &&
      error &&
      "message" in error &&
      typeof (error as { message?: unknown }).message === "string"
    ) {
      return (error as { message: string }).message;
    }
    return "Unknown TTS error";
  };

  const stop = async () => {
    try {
      if (isNative) {
        await TextToSpeech.stop();
      } else if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    } finally {
      setIsSpeaking(false);
    }
  };

  const speakWeb = async (cleanText: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      throw new Error("Speech synthesis is not supported on this device");
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = getLanguageCode();
    utterance.rate = 0.85;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    await new Promise<void>((resolve, reject) => {
      utterance.onend = () => {
        setIsSpeaking(false);
        resolve();
      };
      utterance.onerror = () => {
        reject(new Error("Speech synthesis failed"));
      };

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    });
  };

  const speak = async () => {
    if (!text || text.trim().length === 0) return;

    // Normalize text to keep pacing stable across engines.
    const cleanText = text
      .replace(/\n/g, ". ")
      .replace(/  +/g, " ")
      .trim();

    setIsLoading(true);
    setIsSpeaking(true);

    try {
      if (isNative) {
        await TextToSpeech.stop();

        try {
          await TextToSpeech.speak({
            text: cleanText,
            lang: getLanguageCode(),
            rate: 0.6,
            pitch: 1.0,
            volume: 1.0,
          });
        } catch {
          // Some devices fail with "Internal" for unsupported locale voices.
          await TextToSpeech.speak({
            text: cleanText,
            lang: "en-US",
            rate: 0.6,
            pitch: 1.0,
            volume: 1.0,
          });
        }

        setIsSpeaking(false);
      } else {
        await speakWeb(cleanText);
      }
    } catch (error) {
      const message = parseErrorMessage(error);
      console.error("TTS error:", error);
      toast.error(
        message.toLowerCase().includes("internal")
          ? "Unable to start speaker. Please retry or restart the app."
          : `Speaker failed: ${message}`
      );
      setIsSpeaking(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (compact) {
    return (
      <Button
        variant="default"
        size="icon"
        onClick={isSpeaking ? stop : speak}
        disabled={isLoading || !text}
        className={`h-12 w-12 rounded-full shadow-lg ${className}`}
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : isSpeaking ? (
          <VolumeX className="h-5 w-5" />
        ) : (
          <Volume2 className="h-5 w-5" />
        )}
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="lg"
      onClick={isSpeaking ? stop : speak}
      disabled={isLoading || !text}
      className={className}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          {t("loading")}
        </>
      ) : isSpeaking ? (
        <>
          <VolumeX className="mr-2 h-5 w-5" />
          {t("stopListening")}
        </>
      ) : (
        <>
          <Volume2 className="mr-2 h-5 w-5" />
          {t("listenToAdvice")}
        </>
      )}
    </Button>
  );
};

export default ListenButton;
