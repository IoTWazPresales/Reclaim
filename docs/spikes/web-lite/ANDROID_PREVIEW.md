# Approved Android preview - 2026-11-02

Build **5fced763-5db2-4fd0-a580-17eb5b1df150** finished successfully from
`06dcbe9dfe250f17824234ac438f5fb1c498b8e3` on `fix/training-confident-ux`.
This commit includes b693b0d (load units), bd69229 (RPE 8 working weights) and
all requested evidence through 06dcbe9. No product source was changed.

[Build/install page](https://expo.dev/accounts/eliasonw/projects/reclaim-app/builds/5fced763-5db2-4fd0-a580-17eb5b1df150)
and [direct APK download](https://expo.dev/artifacts/eas/orFk1Dx5EYN19sh_UhR84zL_sWK6EE9kVXpbzXQo--Q.apk).

Downloaded size: 225,473,980 bytes. APK SHA-256:

`23078a901a77946b2b211b90f4bcae9f6a78c994f26bcf27db9844c6e7482fd8`

Independent APK inspection confirms package `com.fissioncorporation.reclaim`,
version 1.0.5/vc15, runtime 1.0.5 and arm64-v8a/armeabi-v7a/x86/x86_64 ABIs.
ZIP integrity and APK v2 signature verification pass. The embedded bundle has
the working-weight/RPE 8 copy markers and matching Supabase endpoint/anon key.
The endpoint trailing slash in EAS is normalized by the installed SDK and does
not change the backend. EAS remote vc14 was synchronized to 15 only after explicit
operator approval; no updates channel, source or Supabase configuration changed.

## Signing and installation

EAS used remote-managed **Build Credentials b_zCv4YPPo (default)**.
The APK signer certificate SHA-256 is:

`d3517cd3fa1438e38a15b6ae2b0b453859fdbadf686ddc5780b28b12ef4bc350`

The verified locally built bd69229 release uses Android Debug certificate:

`fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`

**This preview cannot install over that locally signed release. Uninstall it
first.** No phone was connected and no Play Console app-signing certificate was
available, so Play Store install-over compatibility is **unverified**. Do not
assume the EAS upload key equals the certificate Google Play uses to sign installs.
An update requires the same signing certificate (or valid signing lineage) and a
compatible version code. If the installed app has a different signing key, the
operator must uninstall first: server data remains safe, but unsynced local data
is lost. No uninstall or install was performed in this task.
[Android update requirements](https://developer.android.com/google/play/app-updates)
and [Play app signing](https://developer.android.com/studio/publish/app-signing).

## Packaging and scope

The CLI ignored app-level archive rules when running in this Git repository.
The initial packaging attempt was stopped before upload. An initial temporary
root filter produced an empty 99-byte archive; it was stopped during fingerprinting
before cloud build creation. The corrected temporary root filter was tested against
app source, native source, env, dependencies and evidence paths before retrying.
The final 15.3 MB archive produced the one reported build. The temporary filter was
removed and the Android checkout remained at its original HEAD with no app-source
changes; unrelated existing work was preserved. Automatic fingerprinting was
skipped for the successful invocation; build metadata and independent APK content
inspection provide the recorded provenance.

No store submission, OTA publish, production deployment or EIF acceptance.
The APK and raw build/signature logs stay outside Git.
[Machine-readable receipt](evidence/android-preview-20261102.json).
