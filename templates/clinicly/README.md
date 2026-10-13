# Clinicly template

Clinic appointments with doctors, front desk and visit notes. Patients sign up. Doctors and the front desk work the schedule.

This is the contract of the live showcase app at https://clinicly.apps.appbricx.com, exported so you can
start your own app from it. Seed rows come from the showcase's preview data
(people are fictional, emails are on example.com).

## What you get

- Find a doctor, book a visit from free times only, then a confirmation
- My visits and visit history for patients
- Doctor's day timeline with an appointment panel, visit notes and AI patient summaries
- Front desk list with filters, check-in and a reschedule sheet

Platform features it uses:

- Rule: no overlapping appointments, clinic hours only
- Hourly reminders
- Desk can't read visit notes

| | |
|---|---|
| Tables | `patient`, `doctor`, `desk`, `appointment`, `slot`, `visit_note`, `reminder` |
| Custom screens | `PatientApp`, `DoctorApp`, `DeskApp`, `ClinicLogin`, `BookDoctor`, `TeamHeader` |
| Roles | `patient` (consumer), `doctor` (staff), `desk` (staff) |

Workflows:

- `slot-on-create`: Reserve the doctor's slot when an appointment is booked
- `slot-on-update`: Keep the slot in step when an appointment moves or is cancelled
- `hourly-reminders`: Hourly: remind patients of appointments in the next 24 hours
- `notify-reminder`: Deliver the reminder to the patient
- `notes-ready`: Tell the patient their visit notes are ready

## Screens

| Route | Page | Who |
|---|---|---|
| `/day` | My day | `doctor` |
| `/book` | Find a doctor | `patient` |
| `/visits` | My visits | `patient` |
| `/history` | History | `patient` |
| `/book/:id` | Book a visit | `patient` |
| `/front-desk` | Front desk | `desk` |
| `/team` | Team & access | `doctor` |

## What changed in this version

The showcase app was polished on design, phones and data, and this template follows it:

- Direction `crisp-saas` (was `editorial`); sign-in contrast fixed, no gradients or blobs, one font across sign-in and app.
- Booking shows only free times with "N free / Full" per day and an explicit Confirm booking step.
- Doctor's day: one progress summary, allergy flag, AI summaries with loading, retry and a "Watch:" callout. Front desk: per-doctor counts and a Now marker.
- Reminder messages now read like "Tue 13 Oct at 15:00" plus the preparation note.
- Seeds rebuilt: 16 patients, 74 appointments across all 8 doctors and 28 visit notes.
- The showcase's daily "roll demo calendar" workflow is left out: it moves every appointment forward each day and is only there to keep the public demo fresh.

## Use this template

With the CLI (install it from this repo, see [the CLI docs](https://appbricx.com/docs/reference/cli)):

```sh
appbricx login
appbricx create "My Clinicly"
appbricx apply app.json      # run from this folder
appbricx verify
appbricx deploy --subdomain my-clinicly
```

With Claude Code or another agent connected to Appbricx:

> Start a new Appbricx project from the Clinicly template in
> templates/clinicly/app.json, rename it to "<your name>", apply it and verify it.

Then change it in plain words: your brand colour, your own tables, a new rule.
