# SplitMate

A Next.js application for splitting expenses with friends. All data is stored in Supabase cloud database.

## Features

- **User Management**: Create and switch between multiple users
- **Groups**: Create groups and add members
- **Expenses**: Add expenses with flexible splitting options:
  - Equal split
  - Unequal split (custom amounts)
  - Percentage-based split
- **Balance Calculations**: Automatically calculates who owes whom
- **Settlement Suggestions**: Shows simplified settlement transactions

## Getting Started

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. **Create a User**: On the home page, create a new user or select an existing one
2. **Create Groups**: From the dashboard, create groups and add members
3. **Add Expenses**: In a group, add expenses with details like:
   - Description
   - Amount
   - Who paid
   - How to split (equal, unequal, or by percentage)
4. **View Balances**: See who owes whom in the group
5. **Settlements**: View simplified settlement suggestions

## Data Storage

All data is stored locally in your browser's localStorage. This means:
- Data persists between sessions
- Data is specific to your browser
- No server or database required

## Tech Stack

- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **LocalStorage** for data persistence

## Project Structure

```
├── app/
│   ├── dashboard/          # Main dashboard page
│   ├── groups/
│   │   ├── new/           # Create new group
│   │   └── [id]/          # Group detail page
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home/login page
│   └── globals.css        # Global styles
├── lib/
│   ├── storage.ts         # LocalStorage utilities
│   └── calculations.ts    # Balance and settlement calculations
└── types/
    └── index.ts           # TypeScript type definitions
```

