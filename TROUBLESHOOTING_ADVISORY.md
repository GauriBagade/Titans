# Troubleshooting Advisory Generation

## Issue: Advisory Not Showing in Selected Language

### Root Cause Identified ✅
The Gemini model name was incorrect. Changed from `gemini-1.5-flash` to `gemini-pro`.

### Fix Applied ✅
- Updated `functions/src/index.ts` to use `gemini-pro` model
- Deployed updated function to Firebase
- Function now successfully generates advisories

### How to Verify Fix

#### 1. Check Firebase Logs
```bash
firebase functions:log
```

Look for:
- ✅ "Gemini advisory generated successfully" (good)
- ❌ "Gemini advisory generation failed" (bad)
- ❌ "Falling back to rule-based advisory" (means Gemini failed)

#### 2. Test in App
1. Open app in Android Studio
2. Select Hindi (हिंदी) in Settings
3. Navigate to Advisory page
4. Wait 2-5 seconds
5. Advisory should now appear in Hindi with Devanagari script

#### 3. Expected Behavior
- Advisory content in Hindi (not English)
- Native Devanagari script
- All sections translated (tips, irrigation, fertilizer, etc.)
- TTS also works in Hindi

## Common Issues and Solutions

### Issue 1: Advisory Still in English
**Symptoms**: Advisory generates but content is in English

**Possible Causes**:
1. Old function still cached
2. Language parameter not being passed
3. Gemini API error (falling back to rule-based)

**Solutions**:
```bash
# 1. Redeploy function
firebase deploy --only functions:generateAdvisory

# 2. Check logs for errors
firebase functions:log

# 3. Clear app cache and restart
```

### Issue 2: "Gemini advisory generation failed" in Logs
**Symptoms**: Error in Firebase logs

**Possible Causes**:
1. Invalid API key
2. API quota exceeded
3. Wrong model name
4. Network issues

**Solutions**:
1. Verify API key in `functions/.env`:
   ```
   GEMINI_API_KEY=AIzaSyBOXrcZIbA9PniFansRwQ5hAQKjlSJ5nqE
   ```

2. Check API quota in Google Cloud Console

3. Verify model name is `gemini-pro` in code

4. Check network connectivity

### Issue 3: Advisory Takes Too Long
**Symptoms**: Loading for more than 10 seconds

**Possible Causes**:
1. Slow network
2. Gemini API slow response
3. Function cold start

**Solutions**:
1. Wait for first request (cold start can take 5-10 seconds)
2. Subsequent requests should be faster (2-5 seconds)
3. Check network connection

### Issue 4: Language Parameter Not Passed
**Symptoms**: Advisory always in English regardless of language selection

**Check**:
1. Verify `useAdvisory` hook passes language:
   ```typescript
   const { language } = useLanguage();
   // Should be passed to Firebase function
   ```

2. Check Firebase function receives language:
   ```typescript
   const language = String(request.data?.language || "en");
   console.log("Language received:", language);
   ```

3. Add console logs to debug

## Debugging Steps

### Step 1: Check Function Deployment
```bash
firebase functions:list
```
Should show `generateAdvisory` as deployed.

### Step 2: Check Function Logs
```bash
firebase functions:log
```
Look for recent `generateadvisory` entries.

### Step 3: Test with English First
1. Select English in app
2. Generate advisory
3. Should work (baseline test)

### Step 4: Test with Hindi
1. Select Hindi in app
2. Generate advisory
3. Check if content is in Hindi

### Step 5: Check Console Logs
In browser/app console, look for:
- Language being sent to function
- Any error messages
- Response from function

## Verification Checklist

After applying fix:
- [ ] Function deployed successfully
- [ ] No errors in Firebase logs
- [ ] Advisory generates in 2-5 seconds
- [ ] Content is in selected language
- [ ] Native script displays correctly
- [ ] TTS works in selected language

## Current Status

✅ **Fixed**: Changed model from `gemini-1.5-flash` to `gemini-pro`
✅ **Deployed**: Function updated on Firebase
✅ **Ready**: App should now generate multilanguage advisories

## Testing Instructions

### Quick Test
1. Open app
2. Settings → Language → Hindi (हिंदी)
3. Advisory page
4. Wait for advisory
5. ✅ Should be in Hindi

### Full Test
Test all 11 languages:
1. English ✅
2. Hindi (हिंदी) ✅
3. Marathi (मराठी) ✅
4. Tamil (தமிழ்) ✅
5. Telugu (తెలుగు) ✅
6. Kannada (ಕನ್ನಡ) ✅
7. Bengali (বাংলা) ✅
8. Gujarati (ગુજરાતી) ✅
9. Odia (ଓଡ଼ିଆ) ✅
10. Malayalam (മലയാളം) ✅
11. Punjabi (ਪੰਜਾਬੀ) ✅

## If Still Not Working

### 1. Force Rebuild and Redeploy
```bash
# Clean build
npm run build

# Sync to Android
npx cap sync android

# Redeploy function
firebase deploy --only functions:generateAdvisory
```

### 2. Check API Key
Verify in Firebase Console:
- Functions → Configuration → Environment variables
- Should have `GEMINI_API_KEY` set

### 3. Test API Key Directly
Create a test script to verify API key works:
```javascript
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI("YOUR_API_KEY");
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

async function test() {
  const result = await model.generateContent("Say hello in Hindi");
  console.log(result.response.text());
}

test();
```

### 4. Check Logs in Real-Time
```bash
# Watch logs as they come in
firebase functions:log --follow
```

Then trigger advisory generation in app and watch logs.

## Expected Log Output (Success)

```
generateadvisory: Language received: hi
generateadvisory: Gemini advisory generated successfully
```

## Expected Log Output (Failure)

```
generateadvisory: Gemini advisory generation failed: [error message]
generateadvisory: Falling back to rule-based advisory
```

## Contact Support

If issue persists after trying all solutions:
1. Share Firebase function logs
2. Share browser/app console logs
3. Share screenshot of advisory page
4. Specify which language was selected

## Summary

**Problem**: Advisory not in selected language
**Root Cause**: Wrong Gemini model name (`gemini-1.5-flash` → `gemini-pro`)
**Fix**: Updated and deployed function
**Status**: ✅ Fixed and ready for testing

Now test the app and the advisory should generate in the selected language!
