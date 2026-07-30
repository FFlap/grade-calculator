<p align="center">
  <img src="public/logo-with-bg.png" alt="Grade Tracker logo" width="128" />
</p>

# Grade Tracker

Grade Tracker is a web app that helps students stay on top of their coursework by tracking weighted grades, planning semesters, and calculating what they need on finals and GPA targets.

## Features

- **Grade Monitoring**: Track assignments with weights, due dates, and running course averages
- **Final Exam Calculator**: Find the score you need on a final to hit your target grade
- **GPA Calculator**: Compute semester or cumulative GPA with a customizable letter-grade scale
- **Semester Planning**: Organize courses by term, track in-progress vs. completed semesters, and view term GPA
- **Assignment Calendar**: See upcoming due dates across all saved courses in a monthly view
- **Cloud Sync**: Sign in to save courses, grades, and semesters across devices (calculators work without an account)

## Tech Stack

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [TanStack Router](https://tanstack.com/router) for file-based routing
- [Convex](https://www.convex.dev/) for real-time backend and data storage
- [Clerk](https://clerk.com/) for authentication
- [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) for styling
- [Vitest](https://vitest.dev/) for unit tests

## Requirements

- Node.js 22+
- npm
- A [Convex](https://www.convex.dev/) project
- A [Clerk](https://clerk.com/) application (for sign-in and cloud sync)

## Environment Variables

Create a `.env.local` file in the project root:

```bash
VITE_CONVEX_URL=https://your-deployment.convex.cloud
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

You can also run `npx convex init` to set up Convex and populate `VITE_CONVEX_URL` automatically.

Configure Clerk as an auth provider in your Convex dashboard so signed-in users can sync data.

## Installation

```bash
# Clone the repository
git clone https://github.com/FFlap/GradeTracker.git
cd GradeTracker

# Install dependencies
npm install

# Start the Convex backend (in a separate terminal)
npx convex dev

# Start the dev server
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npx convex dev` | Start the Convex dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview the production build |
| `npm run test` | Run the test suite |
| `npm run lint` | Run ESLint |
