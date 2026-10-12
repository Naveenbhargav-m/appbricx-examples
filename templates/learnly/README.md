# Learnly template

Online courses with lessons, quizzes and certificates. Students sign up. Instructors build courses.

This is the contract of the live showcase app at https://learnly.apps.appbricx.com, exported so you can
start your own app from it. Seed rows come from the showcase's preview data
(people are fictional, emails are on example.com).

## What you get

- My courses with progress rings
- Lesson reader and quizzes
- Instructor course builder and scores

Platform features it uses:

- Rule: three quiz attempts at most
- Course completion workflow
- AI hint that doesn't give away the answer

| | |
|---|---|
| Tables | `student`, `instructor`, `course`, `lesson`, `quiz_question`, `enrollment`, `lesson_progress`, `quiz_attempt` |
| Custom screens | `StudentHome`, `CourseView`, `LessonView`, `Certificate`, `LearnlyLogin`, `InstructorHome`, `InstructorCourse` |
| Roles | `student` (consumer), `instructor` (staff) |

Workflows:

- `lesson-done`: Track lesson completion
- `course-completed`: Celebrate a completed course
- `quiz-failed`: Tell instructors about a failing quiz

## Use this template

With the CLI (install it from this repo, see [the CLI docs](https://appbricx.com/docs/reference/cli)):

```sh
appbricx login
appbricx create "My Learnly"
appbricx apply app.json      # run from this folder
appbricx verify
appbricx deploy --subdomain my-learnly
```

With Claude Code or another agent connected to Appbricx:

> Start a new Appbricx project from the Learnly template in
> templates/learnly/app.json, rename it to "<your name>", apply it and verify it.

Then change it in plain words: your brand colour, your own tables, a new rule.
