# Booking confirmation and reminder

Emails a confirmation when a booking is made, and a reminder the day before.

## What it adds

- Field `reminder_sent_at` (timestamp) on your bookings table.
- Workflow `booking-confirmation`: on a new booking, email the person who
  booked: "You're booked for Friday, October 16 at 7:30 PM".
- Workflow `booking-reminder`: every hour, email everyone whose booking
  starts in the next 24 hours and hasn't been reminded, then stamp
  `reminder_sent_at`. Bookings whose status reads cancelled, declined,
  rejected or no-show are skipped, and so are bookings made in the last hour
  (they just got their confirmation).

## Parameters

| Param | What it is | Default |
|---|---|---|
| `booking` | The bookings table. | `booking`, `appointment` or `reservation` |
| `starts_field` | When the booking starts (date or timestamp). | `starts_at`, `start_time` or `date` |
| `customer_ref` | The ref on the booking to the person who booked. | `customer_id`, `member_id`, `guest_id` or `patient_id` |
| `email_field` | The email field on that person's table. | `email` |
| `tz` | Time zone for the times in the emails. | `UTC` |

## Use it

```
appbricx templates use booking-confirmation-and-reminder \
  --param booking=appointment --param customer_ref=patient_id --param tz=Europe/London
```
