package uk.joestables.lifeos

import android.os.Bundle
import com.getcapacitor.BridgeActivity

/** The Android app (ADR-0061): Capacitor's activity, with LifeOS's own plugin. */
class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(LifeosNativePlugin::class.java)
        super.onCreate(savedInstanceState)
        // Text the size the web app's is in Chrome, not scaled again by
        // Android's font size (AND-003 6; Joe, 5 November).
        bridge.webView.settings.textZoom = 100
    }
}
