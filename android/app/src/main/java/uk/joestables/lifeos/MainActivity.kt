package uk.joestables.lifeos

import android.os.Bundle
import com.getcapacitor.BridgeActivity

/** The Android app (ADR-0061): Capacitor's activity, with LifeOS's own plugin. */
class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(LifeosNativePlugin::class.java)
        super.onCreate(savedInstanceState)
    }
}
