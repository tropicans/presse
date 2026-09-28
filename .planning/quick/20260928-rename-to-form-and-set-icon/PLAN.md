# Quick Task: Rename Application to "Form" and Update Web App Icon

## Goal
Update the application branding and identity to **Form** and replace the web application icons with the user-provided icon:
1. Crop and generate high-resolution web app icons, favicons, apple touch icons, and PWA manifest from the user-attached icon (`media_1790565095304.png`).
2. Replace static favicon, svg icons, and app router icon files in `public/` and `src/app/`.
3. Update `src/app/layout.tsx` metadata with new title template, description, icons, and manifest.
4. Update application branding from `HIMPUN` to `Form` across public and admin interfaces:
   - `src/components/HimpunLogo.tsx` (brand text and icon mark)
   - `src/app/admin/login/page.tsx` & `src/app/admin/login/layout.tsx`
   - `src/app/page.tsx`, `src/app/f/[slug]/page.tsx`, `src/app/success/page.tsx`
   - `src/components/PublicFormShell.tsx`, `src/components/PublicFormPage.tsx`
   - Admin headers: `AdminFormsList.tsx`, `AdminTable.tsx`, `AdminFormEditor.tsx`, `AdminFormSubmissions.tsx`, `AdminFormPreviewPage.tsx`, `AdminFormPreview.tsx`
   - `src/lib/forms.ts` (Excel export creator metadata)
5. Pre-flight validation (`npm test`, `npm run lint`, `npx tsc --noEmit`).
6. Rebuild Docker containers and verify container health according to protocol.
