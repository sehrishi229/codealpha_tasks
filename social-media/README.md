# Social Media Platform

A mini social media platform built with Express.js, SQLite, EJS, and vanilla JavaScript.

## Features

- **User Authentication**: Registration, login, logout with password hashing and session-based auth
- **User Profiles**: Avatar, username, full name, bio, join date, follower/following/post counts
- **Posts**: Create, edit, delete posts with optional image uploads
- **Feed**: Homepage showing recent posts from all users
- **Comments**: Add, delete comments on posts
- **Likes**: Like/unlike posts with counts
- **Follow System**: Follow/unfollow users, prevent self-follow
- **Search**: Find users by username or full name
- **Responsive UI**: Mobile-first design with CSS variables

## Tech Stack

- **Backend**: Express.js (Node.js)
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Database**: SQLite (with migration path to MySQL/PostgreSQL)
- **Template Engine**: EJS (Embedded JavaScript)
- **Authentication**: bcryptjs for password hashing, express-session for sessions
- **File Uploads**: Multer

## Installation

### Prerequisites

- Node.js (v16+ recommended)
- npm

### Setup

1. Clone or copy the project files.

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create the database and schema:
   ```bash
   npm run setup
   ```

4. Seed the database with demo data:
   ```bash
   npm run seed
   ```

5. Start the application:
   ```bash
   npm start
   ```

6. Open your browser and navigate to `http://localhost:3000`

### Docker Setup (Optional)

A `docker-compose.yml` file can be created for containerized deployment.

## Demo Credentials

| Username | Email               | Password      |
|----------|---------------------|---------------|
| demo     | demo@social.com     | password123   |
| alice    | alice@social.com    | password123   |
| bob      | bob@social.com      | password123   |
| charlie  | charlie@social.com  | password123   |
| diana    | diana@social.com    | password123   |
| edward   | edward@social.com   | password123   |

You can also register a new account via the Sign Up page.

## Project Structure

```
social-media/
├── index.js                  # Application entry point
├── package.json              # Dependencies and scripts
├── config/
│   ├── config.js             # Application configuration
│   └── database.js           # Database connection
├── database/
│   ├── setup.js              # Database schema creation
│   ├── seed.js               # Seed data script
│   └── social_media.db       # SQLite database (auto-created)
├── app/
│   ├── controllers/
│   │   ├── authController.js     # Authentication logic
│   │   ├── postController.js     # Post operations
│   │   └── userController.js     # User profile logic
│   ├── models/
│   │   ├── User.js               # User model
│   │   ├── Post.js               # Post model
│   │   ├── Comment.js            # Comment model
│   │   └── Like.js               # Like model
│   ├── middleware/
│   │   ├── auth.js               # Auth & CSRF middleware
│   │   └── upload.js             # File upload middleware
│   └── utils/
│       ├── validators.js         # Input validation
│       ├── csrf.js               # CSRF token utilities
│       └── helpers.js            # Template helper functions
├── routes/
│   └── web.js              # All HTTP routes
├── views/
│   ├── layouts/
│   │   └── main.ejs            # Main layout
│   ├── partials/
│   │   ├── navbar.ejs          # Navigation bar
│   │   └── post-card.ejs       # Post card component
│   ├── auth/
│   │   ├── login.ejs           # Login page
│   │   └── register.ejs        # Registration page
│   ├── posts/
│   │   ├── create.ejs          # Create post page
│   │   ├── edit.ejs            # Edit post page
│   │   ├── detail.ejs          # Post detail page
│   │   └── single-post.ejs     # Single post partial
│   ├── feed.ejs                # Homepage feed
│   ├── profile.ejs             # User profile
│   ├── search.ejs              # Search results
│   ├── followers.ejs           # Followers list
│   ├── following.ejs           # Following list
│   └── error.ejs               # Error page
└── public/
    ├── css/
    │   └── app.css             # Main stylesheet
    ├── js/
    │   └── app.js              # Frontend JavaScript
    └── uploads/                # User-uploaded images
```

## Database Schema

### Users Table
| Column           | Type    | Description                  |
|------------------|---------|------------------------------|
| id               | INTEGER | Primary key (auto increment) |
| username         | TEXT    | Unique username              |
| email            | TEXT    | Unique email                 |
| password         | TEXT    | Hashed password              |
| full_name        | TEXT    | User's full name             |
| bio              | TEXT    | User biography               |
| profile_picture  | TEXT    | Avatar filename              |
| created_at       | DATETIME| Account creation time        |
| updated_at       | DATETIME| Last update time             |

### Posts Table
| Column      | Type     | Description                |
|-------------|----------|----------------------------|
| id          | INTEGER  | Primary key                |
| user_id     | INTEGER  | FK to users.id             |
| content     | TEXT     | Post content               |
| image       | TEXT     | Optional image filename    |
| created_at  | DATETIME | Creation time              |
| updated_at  | DATETIME | Last update time           |

### Comments Table
| Column     | Type     | Description            |
|------------|----------|------------------------|
| id         | INTEGER  | Primary key            |
| post_id    | INTEGER  | FK to posts.id         |
| user_id    | INTEGER  | FK to users.id         |
| content    | TEXT     | Comment text           |
| created_at | DATETIME | Creation time          |
| updated_at | DATETIME | Last update time      |

### Likes Table
| Column     | Type     | Description            |
|------------|----------|------------------------|
| id         | INTEGER  | Primary key            |
| post_id    | INTEGER  | FK to posts.id         |
| user_id    | INTEGER  | FK to users.id         |
| created_at | DATETIME | Creation time          |

Unique constraint on (post_id, user_id) to prevent duplicate likes.

### Follows Table
| Column       | Type     | Description            |
|--------------|----------|------------------------|
| id           | INTEGER  | Primary key            |
| follower_id  | INTEGER  | FK to users.id         |
| following_id | INTEGER  | FK to users.id         |
| created_at   | DATETIME | Creation time          |

Unique constraint on (follower_id, following_id) to prevent duplicate follows.

## API Routes

### Authentication
| Method | Path         | Description              |
|--------|--------------|--------------------------|
| GET    | /register    | Show registration form   |
| POST   | /register    | Register a new user      |
| GET    | /login       | Show login form          |
| POST   | /login       | Authenticate user        |
| GET    | /logout      | Log out and redirect     |

### Feed & Posts
| Method | Path                  | Description                  |
|--------|-----------------------|------------------------------|
| GET    | /                     | Show feed (home page)        |
| GET    | /create-post          | Show create post form        |
| POST   | /create-post          | Create a new post            |
| GET    | /edit-post/:id       | Show edit post form          |
| POST   | /edit-post/:id       | Update a post                |
| GET    | /delete-post/:id     | Delete a post                |
| GET    | /post/:id            | View a single post           |

### Interactions
| Method | Path                  | Description                    |
|--------|-----------------------|--------------------------------|
| POST   | /post/:id/like       | Like/unlike a post             |
| POST   | /post/:id/comment    | Add a comment to a post        |
| POST   | /comment/:id/delete  | Delete a comment               |

### User Profiles
| Method | Path                   | Description                   |
|--------|------------------------|-------------------------------|
| GET    | /profile/:username    | View user profile             |
| GET    | /search               | Search users                  |
| GET    | /followers/:id        | View followers list           |
| GET    | /following/:id        | View following list           |
| POST   | /follow/:id           | Follow a user                 |
| POST   | /unfollow/:id         | Unfollow a user               |

## Security Measures

1. **Password Hashing**: Uses bcryptjs with salt rounds of 10
2. **Session Management**: Secure HTTP-only cookies, 24-hour expiry
3. **CSRF Protection**: Token-based CSRF protection for forms
4. **SQL Injection Prevention**: Parameterized queries via SQLite3
5. **XSS Protection**: HTML escaping in templates via EJS
6. **File Upload Validation**: MIME type checking, size limits (5MB)
7. **Authorization**: Users can only edit/delete their own posts
8. **Input Validation**: Server-side validation with express-validator

## Configuration

Environment variables can be set in a `.env` file (see `config/config.js`):

| Variable        | Default           | Description               |
|-----------------|-------------------|---------------------------|
| PORT            | 3000              | Server port               |
| SESSION_SECRET  | social_media_...  | Session secret key        |
| DB_HOST         | localhost         | MySQL host (migration)    |
| DB_USER         | root              | MySQL user (migration)    |
| DB_PASSWORD     | (empty)           | MySQL password (migration)|
| DB_NAME         | social_media      | MySQL database (migration)|

## Running Tests

```bash
npm test
```

## License

ISC License