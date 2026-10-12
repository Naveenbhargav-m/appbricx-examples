# Clinicly template

Clinic appointments with doctors, front desk and visit notes. Patients sign up. Doctors and the front desk work the schedule.

This is the contract of the live showcase app at https://clinicly.apps.appbricx.com, exported so you can
start your own app from it. Seed rows come from the showcase's preview data
(people are fictional, emails are on example.com).

## What you get

- Find a doctor and book a slot
- Doctor day timeline and visit notes
- Front desk check-in

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
