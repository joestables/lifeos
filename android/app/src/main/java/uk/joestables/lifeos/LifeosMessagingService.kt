package uk.joestables.lifeos

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

/**
 * FCM messages, handled with the app closed too (ADR-0063). Every message is
 * a data message; "notify" is shown at once.
 */
class LifeosMessagingService : FirebaseMessagingService() {
    override fun onMessageReceived(message: RemoteMessage) {
        if (message.data["type"] == "notify") Notifications.show(this, message.data)
    }

    // A new token is registered by the app when it next opens
    // (src/native/notifications.ts, keepTokenCurrent).
}
