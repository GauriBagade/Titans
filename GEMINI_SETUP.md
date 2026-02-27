# Gemini AI Integration Setup Guide

Your app now uses Google's Gemini AI to generate intelligent, personalized farming advisories!

## What Changed?

### Before (Rule-Based):
- Simple if/else logic
- Generic advice
- Limited context awareness

### After (AI-Powered):
- Intelligent analysis using Gemini 1.5 Flash
- Crop-specific recommendations
- Context-aware advice considering weather patterns
- More detailed and actionable insights

## Setup Steps

### 1. Get Your Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the API key

### 2. Configure Firebase Functions

You have two options:

#### Option A: Using Firebase CLI (Recommended for Production)

```bash
firebase functions:config:set gemini.api_key="YOUR_GEMINI_API_KEY_HERE"
```

Then update the code to read from Firebase config:
```typescript
const apiKey = functions.config().gemini?.api_key || process.env.GEMINI_API_KEY;
```

#### Option B: Using Environment Variables (For Local Testing)

1. Create a `.env` file in the `functions` directory:
```bash
cd functions
echo GEMINI_API_KEY=your_actual_api_key_here > .env
```

2. The code is already set up to read from `process.env.GEMINI_API_KEY`

### 3. Deploy the Functions

```bash
# Build the functions
cd functions
npm run build

# Deploy to Firebase
firebase deploy --only functions
```

### 4. Test the Integration

1. Open your app
2. Navigate to the Advisory page
3. The advisory should now be generated using Gemini AI
4. Check Firebase Functions logs to confirm:
   ```bash
   firebase functions:log
   ```
   Look for: "Gemini advisory generated successfully"

## How It Works

### Input to Gemini:
- Current weather (temperature, humidity, rainfall, wind)
- Your crops (rice, wheat, etc.)
- Farm size and season
- 3-day weather forecast

### Output from Gemini:
- **Main Advice**: Personalized summary for your crops
- **Risk Level**: Low/Medium/High assessment
- **Tips**: 3-5 actionable farming tips
- **Irrigation Advice**: When and how much to irrigate
- **Fertilizer Advice**: Best timing for fertilizer application
- **3-Day Plan**: Daily activities and priorities
- **Pest Alerts**: Pest risk based on weather conditions

### Fallback System:
If Gemini API fails or is unavailable, the system automatically falls back to the original rule-based advisory generation. Your app will always work!

## Cost Considerations

Gemini 1.5 Flash pricing (as of 2024):
- **Free tier**: 15 requests per minute
- **Paid tier**: Very affordable (~$0.00001 per request)

For a farming app with moderate usage, the free tier should be sufficient.

## Monitoring

Check if Gemini is working:

1. **Firebase Console**: 
   - Go to Functions → Logs
   - Look for "Gemini advisory generated successfully"

2. **If you see "Falling back to rule-based advisory"**:
   - Check if API key is set correctly
   - Verify API key is active in Google AI Studio
   - Check Firebase Functions logs for error details

## Troubleshooting

### "Gemini not available"
- API key not set or incorrect
- Run: `firebase functions:config:get` to verify

### "Gemini advisory generation failed"
- API quota exceeded (wait or upgrade)
- Invalid API key
- Network issues

### Advisory still works but seems generic
- Gemini might be falling back to rule-based
- Check logs to confirm Gemini is being used

## Next Steps

1. Get your Gemini API key
2. Set it using one of the methods above
3. Deploy the functions
4. Test the advisory generation
5. Monitor the logs to ensure it's working

The advisory will now be much more intelligent and tailored to your specific farming needs!
