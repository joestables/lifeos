package uk.joestables.lifeos

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/** The times device-reminders sends, read as the alarms need them (REM-010). */
class ReminderSyncTest {
    @Test
    fun readsPostgresTimestamps() {
        // 09:00 UTC on Saturday 7 November 2026.
        assertEquals(1794042000000L, ReminderSync.epochMillis("2026-11-07T09:00:00+00:00"))
        assertEquals(1794042000000L, ReminderSync.epochMillis("2026-11-07T09:00:00Z"))
        // A snoozed one carries microseconds.
        assertEquals(1794042000123L, ReminderSync.epochMillis("2026-11-07T09:00:00.123456+00:00"))
        // 10:00 in Paris is 09:00 UTC.
        assertEquals(1794042000000L, ReminderSync.epochMillis("2026-11-07T10:00:00+01:00"))
    }

    @Test
    fun refusesWhatIsNotATimestamp() {
        assertNull(ReminderSync.epochMillis("tomorrow"))
    }
}
