# CollaboBoard - Collaborative Project Management Tool

A modern, fully-functional project management web application inspired by Trello and Asana. Built with Node.js, Express, SQLite, and WebSockets for real-time collaboration.

## Features

- **Authentication**: User registration, login, logout with password hashing (bcrypt) and JWT session management
- **Projects**: Create, edit, delete, and manage projects with ownership and membership
- **Project Members**: Owner/Admin/Member roles with permission-enforced access control
- **Kanban Board**: Draggable columns (To Do, In Progress, Review, Done) with reorder support
- **Task Cards**: Create, edit, delete tasks with title, description, assignee, priority, and due dates
- **Drag & Drop**: Smooth drag-and-drop task movement between columns with backend persistence
- **Comments**: Real-time comment threads on tasks with AJAX submission
- **Notifications**: In-app notifications for assignments, comments, invitations, and status changes
- **Activity Log**: Audit trail tracking all project actions
- **Real-Time Updates**: WebSocket-powered live updates across multiple sessions
- **Dashboard**: Project statistics and assigned task overview
- **Responsive Design**: Works on desktop, tablet, and mobile (horizontal scroll on mobile boards)
- **Search & Filter**: User search for project invitations

## Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (no frameworks)
- **Backend**: Node.js + Express.js
- **Database**: SQLite (with migration-ready schema)
- **Authentication**: JWT (JSON Web Tokens) + bcrypt
- **Real-Time**: WebSocket (ws library)
- **Security**: CSRF protection, input validation, SQL injection prevention

## Installation

```bash
# Clone or copy files to your directory
cd project

# Install dependencies
npm install

# Initialize database and seed with demo data
node scripts/seed.js

# Start the server
npm start
```

## Running the Application

```bash
npm start
```

- **Backend**: http://localhost:3000
- **WebSocket**: ws://localhost:8080
- **API**: `/api/*` endpoints

## Demo Credentials

| Username | Password      | Role          |
|----------|---------------|---------------|
| admin    | password123   | Demo user     |
| ahmed    | password123   | Demo user     |
| sarah    | password123   | Demo user     |
| mike     | password123   | Demo user     |
| elena    | password123   | Demo user     |
| james    | password123   | Demo user     |

The seed script creates:
- 6 users
- 3 projects (Website Redesign, Mobile App, Marketing Campaign)
- Multiple project members with various roles
- 4 board columns per project
- 13+ tasks with different priorities and assignees
- 6 comments
- 5 notifications
- 5 activity log entries

## Project Structure

```
project/
├── package.json
├── app.js                          # Server entry point
├── app/
│   ├── config/
│   │   └── database.js              # SQLite database config & schema
│   ├── middleware/
│   │   └── auth.js                  # JWT authentication & permission middleware
│   ├── models/
│   │   └── index.js                 # Data models (User, Project, Task, etc.)
│   ├── controllers/
│   │   ├── authController.js        # Authentication logic
│   │   ├── projectController.js     # Project & member management
│   │   ├── taskController.js        # Task CRUD operations
│   │   ├── columnController.js      # Board column management
│   │   ├── commentController.js     # Comment management
│   │   └── notificationController.js # Notification logic
│   ├── routes/
│   │   ├── auth.js                  # Auth API routes
│   │   └── projects.js              # Project/task/api routes
│   └── websocket/
│       └── server.js                # WebSocket server
├── public/
│   ├── index.html                   # Landing page
│   ├── login.html                   # Login page
│   ├── register.html                # Registration page
│   ├── dashboard.html               # Dashboard page
│   ├── project.html                 # Project board page
│   ├── css/
│   │   └── app.css                  # All styles
│   ├── js/
│   │   ├── auth.js                  # Auth utilities
│   │   ├── app.js                   # Landing page logic
│   │   ├── dashboard.js             # Dashboard logic
│   │   └── project.js               # Board & task logic
│   └── images/
│       └── default-avatar.png
├── scripts/
│   └── seed.js                      # Database seeding script
└── database/
    └── app.db                       # SQLite database (generated)
```

## API Routes

### Authentication
| Method | Endpoint         | Description                    |
|--------|------------------|--------------------------------|
| POST   | /api/auth/register | Register new user            |
| POST   | /api/auth/login   | Login & get JWT token         |
| GET    | /api/auth/profile | Get user profile (auth)       |
| GET    | /api/auth/search  | Search users (auth)           |

### Projects
| Method | Endpoint                  | Description                     |
|--------|--------------------------|---------------------------------|
| POST   | /api/projects            | Create project (auth)           |
| GET    | /api/projects            | List user's projects (auth)     |
| GET    | /api/projects/:id        | Get project details (auth)      |
| PUT    | /api/projects/:id        | Update project (owner+)         |
| DELETE | /api/projects/:id        | Delete project (owner)          |
| POST   | /api/projects/:id/members| Add member (owner+ admin)       |
| DELETE | /api/projects/:id/members/:userId | Remove member (owner+)  |
| GET    | /api/projects/:id/members| List members (member+)          |
| GET    | /api/projects/stats      | Dashboard stats (auth)          |

### Board Columns
| Method | Endpoint                     | Description       |
|--------|-----------------------------|-------------------|
| POST   | /api/projects/:id/columns   | Create column     |
| PUT    | /api/projects/:id/columns/:columnId | Update column |
| DELETE | /api/projects/:id/columns/:columnId | Delete column |
| POST   | /api/projects/:id/columns/reorder | Reorder columns |

### Tasks
| Method | Endpoint                | Description           |
|--------|------------------------|-----------------------|
| POST   | /api/projects/:id/tasks | Create task           |
| GET    | /api/tasks/:id        | Get task details      |
| PUT    | /api/tasks/:id        | Update task           |
| DELETE | /api/tasks/:id        | Delete task           |
| POST   | /api/tasks/:id/move   | Move task to column   |
| GET    | /api/tasks/assigned/me| Get assigned tasks    |

### Comments
| Method | Endpoint              | Description      |
|--------|----------------------|------------------|
| POST   | /api/tasks/:id/comments | Add comment    |
| GET    | /api/tasks/:id/comments  | List comments  |
| PUT    | /api/comments/:id     | Update comment   |
| DELETE | /api/comments/:id     | Delete comment   |

### Notifications
| Method | Endpoint                    | Description         |
|--------|----------------------------|---------------------|
| GET    | /api/notifications         | List notifications  |
| GET    | /api/notifications/unread  | Unread count        |
| PUT    | /api/notifications/:id/read | Mark read          |
| PUT    | /api/notifications/read-all | Mark all read      |

## Database Schema

### Tables
- **users**: id, username, email, password(hash), full_name, profile_picture, created_at, updated_at
- **projects**: id, name, description, owner_id, is_public, created_at, updated_at
- **project_members**: id, project_id, user_id, role, joined_at (unique on project_id+user_id)
- **board_columns**: id, project_id, name, position, created_at
- **tasks**: id, project_id, column_id, title, description, assigned_to, created_by, priority, due_date, position, created_at, updated_at
- **comments**: id, task_id, user_id, content, created_at, updated_at
- **notifications**: id, user_id, type, message, project_id, task_id, is_read, created_at
- **activity_log**: id, project_id, user_id, action, entity_type, entity_id, details, created_at

## WebSocket API

Connect with: `ws://localhost:8080?token=<jwt_token>`

Events:
- `{ type: "subscribe", payload: { projectId } }` - Subscribe to project updates
- `{ type: "join_task", payload: { taskId } }` - Subscribe to task updates
- Events broadcast from server: `task_created`, `task_updated`, `task_moved`, `task_deleted`, `new_comment`, `notification`

## Migration to MySQL/PostgreSQL

The schema is designed for easy migration:
1. Replace `sqlite3` with `mysql2` or `pg`
2. Adjust `INTEGER PRIMARY KEY AUTOINCREMENT` to `AUTO_INCREMENT` (MySQL) or `SERIAL` (PostgreSQL)
3. Replace `DATETIME DEFAULT CURRENT_TIMESTAMP` with appropriate syntax for MySQL
4. Update `sqlite3` specific syntax (`?` placeholders stay the same for MySQL/pg)

## Security

- Passwords hashed with bcrypt (10 rounds)
- JWT tokens for stateless authentication
- JWT expiration (7 days)
- Authorization checks on every protected route
- Role-based permission enforcement (owner, admin, member)
- Input validation on all endpoints
- SQL queries use parameterized statements
