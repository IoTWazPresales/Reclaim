package com.yourcompany.reclaim

import android.app.Activity
import android.app.AlertDialog
import android.os.Bundle

/**
 * Minimal rationale Activity required by Health Connect.
 *
 * Must be exported in the manifest and handle:
 *   androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE
 */
class PermissionsRationaleActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    AlertDialog.Builder(this)
      .setTitle("Health permissions")
      .setMessage("Reclaim uses Health Connect to read the health data you choose (e.g. sleep, steps, heart rate). You can grant or manage these permissions in the next screen.")
      .setPositiveButton(android.R.string.ok) { _, _ -> finish() }
      .setOnCancelListener { finish() }
      .show()
  }
}
