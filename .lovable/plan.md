## Plan to fix the logo freeze

1. **Remove the freeze-prone logo cropper for booking page logos**
   - Stop using the live crop/zoom editor for business logos.
   - This avoids the repeated image transform/render loop that is freezing both mobile and desktop.

2. **Replace it with a safer logo upload flow**
   - When a logo is selected, resize/compress it once in the background.
   - Upload the processed logo directly.
   - Show a simple success message when it is ready.

3. **Add safe logo display controls instead of image zooming**
   - Add simple logo size choices: **Small / Medium / Large**.
   - These will change how the logo appears on the public booking page without re-processing the image live.
   - No drag/zoom slider, so there is nothing continuously re-rendering while the user moves it.

4. **Keep the existing edit experience simple**
   - Keep the current logo preview.
   - Keep “Change logo”.
   - Remove or disable “Edit / Crop” for this logo area so the same freezing path cannot be triggered again.

5. **Verify before finishing**
   - Test uploading a logo.
   - Test changing logo size repeatedly on desktop-sized viewport.
   - Confirm the page stays responsive.
   - Check that the public booking page still shows the logo correctly.

## Technical notes

- The likely issue is not only canvas previewing; the live cropper/zoom interaction itself is still causing repeated transform updates.
- The robust fix is to remove live crop/zoom for logos and use one-time image processing plus non-destructive display sizing.