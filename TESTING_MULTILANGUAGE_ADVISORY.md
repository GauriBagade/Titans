# Testing Multilanguage Advisory Feature

## Quick Test Guide

### Prerequisites
✅ Firebase functions deployed
✅ App built and synced to Android
✅ Gemini API key configured in Firebase

### Test Steps

#### 1. Test English Advisory (Baseline)
1. Open app in Android Studio
2. Go to Settings → Language → Select "English"
3. Navigate to Advisory page
4. Wait for advisory to generate
5. ✅ Verify advisory is in English
6. Click "Listen to Advice" button
7. ✅ Verify TTS speaks in English

#### 2. Test Hindi Advisory
1. Go to Settings → Language → Select "हिंदी (Hindi)"
2. Navigate to Advisory page
3. Wait for advisory to generate (may take 2-5 seconds)
4. ✅ Verify advisory content is in Hindi with Devanagari script
5. ✅ Check all sections:
   - Main advice (मुख्य सलाह)
   - Tips (सुझाव)
   - Irrigation advice (सिंचाई सलाह)
   - Fertilizer advice (खाद सलाह)
   - 3-day plan (3-दिन की योजना)
6. Click "Listen to Advice" button
7. ✅ Verify TTS speaks in Hindi

#### 3. Test Marathi Advisory
1. Go to Settings → Language → Select "मराठी (Marathi)"
2. Navigate to Advisory page
3. ✅ Verify advisory is in Marathi with Devanagari script
4. ✅ Verify TTS speaks in Marathi

#### 4. Test Tamil Advisory
1. Go to Settings → Language → Select "தமிழ் (Tamil)"
2. Navigate to Advisory page
3. ✅ Verify advisory is in Tamil with Tamil script
4. ✅ Verify TTS speaks in Tamil

#### 5. Test Telugu Advisory
1. Go to Settings → Language → Select "తెలుగు (Telugu)"
2. Navigate to Advisory page
3. ✅ Verify advisory is in Telugu with Telugu script
4. ✅ Verify TTS speaks in Telugu

#### 6. Test Other Languages
Repeat the same process for:
- Kannada (ಕನ್ನಡ)
- Bengali (বাংলা)
- Gujarati (ગુજરાતી)
- Odia (ଓଡ଼ିଆ)
- Malayalam (മലയാളം)
- Punjabi (ਪੰਜਾਬੀ)

### What to Verify

#### Advisory Content
- [ ] Main advice is in selected language
- [ ] All tips are in selected language
- [ ] Irrigation advice is in selected language
- [ ] Fertilizer advice is in selected language
- [ ] 3-day plan activities are in selected language
- [ ] Pest alerts (if any) are in selected language
- [ ] Native script is used correctly
- [ ] Text is readable and makes sense

#### Text-to-Speech
- [ ] TTS button shows correct text in selected language
- [ ] TTS speaks in selected language
- [ ] Pronunciation is acceptable
- [ ] TTS can be stopped mid-speech
- [ ] Error messages (if any) are in selected language

#### UI Elements
- [ ] All buttons and labels are translated
- [ ] Navigation is in selected language
- [ ] Settings page is in selected language
- [ ] Error messages are in selected language

### Expected Behavior

#### Successful Advisory Generation
1. Loading indicator appears
2. Advisory generates in 2-5 seconds
3. Content appears in selected language
4. All sections are populated
5. TTS button is enabled

#### Error Handling
If Gemini API fails:
1. Error message appears in selected language
2. Falls back to rule-based advisory (English)
3. User can retry

### Common Issues and Solutions

#### Issue: Advisory is in English despite selecting another language
**Solution**: 
- Check Firebase Functions logs for errors
- Verify Gemini API key is configured
- Check if API quota is exceeded
- Ensure functions are deployed with latest code

#### Issue: TTS not working in selected language
**Solution**:
- Check if device has language voice installed
- Verify language code mapping in ListenButton.tsx
- Check console logs for TTS errors
- Try fallback to base language

#### Issue: Advisory takes too long to generate
**Solution**:
- Normal: 2-5 seconds is expected
- If >10 seconds, check network connection
- Check Firebase Functions logs for timeouts
- Verify Gemini API is responding

#### Issue: Text appears garbled or in wrong script
**Solution**:
- Verify font support on device
- Check if native script is properly encoded
- Ensure UTF-8 encoding in all files

### Testing Checklist

#### Before Testing
- [ ] Firebase functions deployed successfully
- [ ] App built without errors
- [ ] Android sync completed
- [ ] Device has internet connection
- [ ] Gemini API key is valid

#### During Testing
- [ ] Test all 11 languages
- [ ] Test advisory generation
- [ ] Test TTS for each language
- [ ] Test error scenarios
- [ ] Test offline behavior (should show error)

#### After Testing
- [ ] Document any issues found
- [ ] Verify all languages work correctly
- [ ] Check Firebase usage/costs
- [ ] Review user experience

### Performance Metrics

#### Expected Performance
- Advisory generation: 2-5 seconds
- TTS initialization: <1 second
- Language switching: Instant
- Page load: <2 seconds

#### API Usage
- Gemini API calls: 1 per advisory generation
- Firebase Functions: 1 call per advisory
- Weather API: 1 call per location update

### Debug Information

#### Check Firebase Logs
```bash
firebase functions:log --only generateAdvisory
```

#### Check Console Logs
Look for:
- "Gemini advisory generated successfully"
- "TTS speaking in [language]"
- Language code being used
- Any error messages

#### Verify Language Parameter
In browser/app console, check:
```javascript
// Should show current language
console.log(language); // e.g., "hi", "ta", "te"
```

### Success Criteria

✅ All 11 languages generate advisories correctly
✅ Native scripts display properly
✅ TTS works in all languages
✅ Error handling works correctly
✅ Performance is acceptable (2-5 seconds)
✅ User experience is smooth
✅ No crashes or freezes

### Next Steps After Testing

1. Document any language-specific issues
2. Gather user feedback on translation quality
3. Monitor API usage and costs
4. Consider caching frequently requested advisories
5. Plan for offline support

## Quick Command Reference

```bash
# Build the app
npm run build

# Sync to Android
npx cap sync android

# Deploy functions
firebase deploy --only functions

# View function logs
firebase functions:log

# Open in Android Studio
# (Use Android Studio to open the android folder)
```

## Support

If you encounter issues:
1. Check Firebase Functions logs
2. Verify Gemini API key and quota
3. Check device language support
4. Review console logs for errors
5. Test with English first as baseline
