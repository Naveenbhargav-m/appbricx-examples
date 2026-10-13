# Learnly template

Online courses with lessons, quizzes and certificates. Students sign up. Instructors build courses.

This is the contract of the live showcase app at https://learnly.apps.appbricx.com, exported so you can
start your own app from it. Seed rows come from the showcase's preview data
(people are fictional, emails are on example.com).

## What you get

- Student home with a real 7-day streak, a continue card and course progress
- Explore with search and category filters
- Course page, lessons with quizzes, an AI tutor ("Explain it another way") and certificates
- Instructor studio with completion bars and a "Needs a nudge" list, and a course editor showing quiz answers and per-student progress

Platform features it uses:

- Rule: three quiz attempts at most
- Course completion workflow
- AI hint that doesn't give away the answer

| | |
|---|---|
| Tables | `student`, `instructor`, `course`, `lesson`, `quiz_question`, `enrollment`, `lesson_progress`, `quiz_attempt` |
| Custom screens | `StudentHome`, `CourseView`, `LessonView`, `Certificate`, `LearnlyLogin`, `InstructorHome`, `InstructorCourse`, `StudioNav` |
| Roles | `student` (consumer), `instructor` (staff) |

Workflows:

- `lesson-done`: Track lesson completion
- `course-completed`: Celebrate a completed course
- `quiz-failed`: Tell instructors about a failing quiz

## Screens

| Route | Page | Who |
|---|---|---|
| `/home` | My courses | `student` |
| `/explore` | Explore | `student` |
| `/courses/:id` | Course | `student` |
| `/lessons/:id` | Lesson | `student` |
| `/certificate/:id` | Certificate | `student` |
| `/teach` | My courses | `instructor` |
| `/teach/:id` | Course | `instructor` |
| `/team` | Team & access | `instructor` |

## What changed in this version

The showcase app was polished on design, phones and data, and this template follows it:

- New `StudioNav` component gives the instructor pages (including Team & access) a way back to Courses.
- Contrast, motion and type fixed across every screen: cream, ink and sunflower palette, Baloo 2 and Nunito, no bouncy springs.
- AI tutor is easier to find ("Explain it another way" under every lesson), with loading and fallback states.
- Seeds rebuilt: 30 enrollments (every course has students), 50 lesson completions and 47 quiz attempts spread over three weeks.

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
