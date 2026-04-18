# User Management System

A full-stack web application for managing users and tracking performance, built with Next.js, TypeScript, Prisma and Claude AI assistance.

<!-- Add screenshots here -->

## Features

- User management with full CRUD operations
- Role-based access control with 3 access levels (Low, Normal, High)
- Secure login with encrypted passwords
- Bulk Excel upload with validation and error logging
- Soft delete with restore functionality
- Performance tracking per user and department
- Interactive performance charts with toggleable user lines
- Search and filter on every column
- Pagination (20 records per page)
- Export data to Excel
- Responsive design with Tailwind CSS

## Tech Stack

- **Next.js 16** (App Router)
- **TypeScript**
- **Prisma ORM**
- **SQLite** database
- **Tailwind CSS**
- **bcrypt** for password encryption
- **Recharts** for data visualisation
- **xlsx** for Excel import/export

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
git clone https://github.com/aarammel/usersapp
cd usersapp
npm install
```

### Environment Setup

Copy the example environment file and update as needed:

```bash
cp .env.example .env
```

### Database Setup

```bash
npx prisma migrate dev
```

### Run the Application

```bash
npm run dev
```

Open [http://localhost:3000/login](http://localhost:3000/login) in your browser.

## Default Login

Create a user first via the database or run the seed script.

## Access Levels

| Level | Name   | Permissions                                      |
|-------|--------|--------------------------------------------------|
| 1     | Low    | View only                                        |
| 2     | Normal | View and edit                                    |
| 3     | High   | Full access including department performance charts |

## Author

**Aram Aghajanyan**

GitHub: [github.com/aarammel](https://github.com/aarammel)
