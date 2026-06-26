Remove the "Saved to your life list" confirmation screen from the sighting flow.

### Changes
1. **In `src/routes/_authenticated/index.tsx`:**
   - Change the `save()` function so that after a successful `createSighting`, it calls `goHome()` instead of `setPhase("saved")`.
   - Remove the `phase === "saved"` branch inside `<AnimatePresence>`.
   - Delete the `SavedStep` component definition from the bottom of the file.

After the user taps **"Save to Life List ✦"**, the app will return directly to the Log (home) dashboard instead of showing an intermediate confirmation screen.