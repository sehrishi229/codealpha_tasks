const bcrypt = require('bcryptjs');
const { User, Project, ProjectMember, BoardColumn, Task, Comment, Notification, ActivityLog } = require('../app/models');
const { getDb, initDB } = require('../app/config/database');

async function seed() {
    console.log('Initializing database...');
    initDB();

    await new Promise(resolve => setTimeout(resolve, 500));

    const db = getDb();

    // Clear existing data
    db.serialize(() => {
        db.run('DELETE FROM notifications');
        db.run('DELETE FROM activity_log');
        db.run('DELETE FROM comments');
        db.run('DELETE FROM tasks');
        db.run('DELETE FROM board_columns');
        db.run('DELETE FROM project_members');
        db.run('DELETE FROM projects');
        db.run('DELETE FROM users');
    });

    // Wait for clears
    await new Promise(resolve => setTimeout(resolve, 200));

    const users = [];
    const userData = [
        { username: 'admin',       email: 'admin@collaboboard.com',     password: 'password123', full_name: 'Admin User' },
        { username: 'ahmed',       email: 'ahmed@collaboboard.com',     password: 'password123', full_name: 'Ahmed Irfan' },
        { username: 'sarah',       email: 'sarah@collaboboard.com',     password: 'password123', full_name: 'Sarah Johnson' },
        { username: 'mike',        email: 'mike@collaboboard.com',      password: 'password123', full_name: 'Mike Chen' },
        { username: 'elena',       email: 'elena@collaboboard.com',     password: 'password123', full_name: 'Elena Rodriguez' },
        { username: 'james',       email: 'james@collaboboard.com',     password: 'password123', full_name: 'James Wilson' },
    ];

    for (const u of userData) {
        const user = await User.create(u);
        users.push(user);
    }
    console.log(`Created ${users.length} users`);

    // Create projects
    const projects = [
        { name: 'Website Redesign', description: 'Redesign the company website with modern UX', owner_id: users[0].id },
        { name: 'Mobile App', description: 'Build a cross-platform mobile application', owner_id: users[1].id },
        { name: 'Marketing Campaign', description: 'Q4 marketing and content strategy', owner_id: users[2].id },
    ];

    for (const p of projects) {
        const project = await Project.create(p);

        // Add members
        await ProjectMember.add({ project_id: project.id, user_id: p.owner_id, role: 'owner' });

        // Add additional members
        if (p.name === 'Website Redesign') {
            await ProjectMember.add({ project_id: project.id, user_id: users[2].id, role: 'admin' });
            await ProjectMember.add({ project_id: project.id, user_id: users[3].id, role: 'member' });
            await ProjectMember.add({ project_id: project.id, user_id: users[4].id, role: 'member' });
        }
        if (p.name === 'Mobile App') {
            await ProjectMember.add({ project_id: project.id, user_id: users[0].id, role: 'admin' });
            await ProjectMember.add({ project_id: project.id, user_id: users[5].id, role: 'member' });
        }
        if (p.name === 'Marketing Campaign') {
            await ProjectMember.add({ project_id: project.id, user_id: users[1].id, role: 'member' });
            await ProjectMember.add({ project_id: project.id, user_id: users[3].id, role: 'admin' });
        }

        console.log(`Created project: ${p.name}`);
    }

    // Get project IDs
    const project1 = await new Promise((resolve) => {
        const db = getDb();
        db.get('SELECT id FROM projects WHERE name = "Website Redesign"', (err, row) => {
            db.close();
            resolve(row);
        });
    });

    const project2 = await new Promise((resolve) => {
        const db = getDb();
        db.get('SELECT id FROM projects WHERE name = "Mobile App"', (err, row) => {
            db.close();
            resolve(row);
        });
    });

    const project3 = await new Promise((resolve) => {
        const db = getDb();
        db.get('SELECT id FROM projects WHERE name = "Marketing Campaign"', (err, row) => {
            db.close();
            resolve(row);
        });
    });

    // Create columns for each project
    const defaultColumns = ['To Do', 'In Progress', 'Review', 'Done'];

    for (const project of [project1, project2, project3]) {
        for (let i = 0; i < defaultColumns.length; i++) {
            await BoardColumn.create({
                project_id: project.id,
                name: defaultColumns[i],
                position: i
            });
        }
    }

    // Get column IDs for project 1
    const col1Cols = await new Promise((resolve) => {
        const db = getDb();
        db.all('SELECT * FROM board_columns WHERE project_id = ? ORDER BY position', [project1.id], (err, rows) => {
            db.close();
            resolve(rows);
        });
    });

    const col2Cols = await new Promise((resolve) => {
        const db = getDb();
        db.all('SELECT * FROM board_columns WHERE project_id = ? ORDER BY position', [project2.id], (err, rows) => {
            db.close();
            resolve(rows);
        });
    });

    const col3Cols = await new Promise((resolve) => {
        const db = getDb();
        db.all('SELECT * FROM board_columns WHERE project_id = ? ORDER BY position', [project3.id], (err, rows) => {
            db.close();
            resolve(rows);
        });
    });

    // Create tasks
    const taskData = [
        // Project 1 (Website Redesign)
        { project_id: project1.id, column_id: col1Cols[0].id, title: 'Design landing page mockups', description: 'Create high-fidelity mockups for the homepage', priority: 'high', assigned_to: users[2].id, created_by: users[0].id, due_date: '2024-01-15' },
        { project_id: project1.id, column_id: col1Cols[0].id, title: 'Plan site structure', description: 'Sitemap and navigation flow', priority: 'medium', assigned_to: users[3].id, created_by: users[0].id, due_date: '2024-01-10' },
        { project_id: project1.id, column_id: col1Cols[1].id, title: 'Implement hero section', description: 'Build the main hero section with animations', priority: 'high', assigned_to: users[3].id, created_by: users[0].id, due_date: '2024-01-20' },
        { project_id: project1.id, column_id: col1Cols[1].id, title: 'Setup CSS framework', description: 'Configure Tailwind CSS', priority: 'urgent', assigned_to: users[2].id, created_by: users[0].id, due_date: null },
        { project_id: project1.id, column_id: col1Cols[2].id, title: 'Homepage development', description: 'Build homepage with responsive design', priority: 'high', assigned_to: users[3].id, created_by: users[0].id, due_date: '2024-01-25' },
        { project_id: project1.id, column_id: col1Cols[3].id, title: 'Setup analytics', description: 'Add Google Analytics and tracking', priority: 'low', assigned_to: users[4].id, created_by: users[0].id, due_date: '2024-01-05' },
        { project_id: project1.id, column_id: col1Cols[0].id, title: 'Review wireframes', description: 'Review landing page wireframes', priority: 'medium', assigned_to: users[0].id, created_by: users[0].id, due_date: '2024-01-12' },

        // Project 2 (Mobile App)
        { project_id: project2.id, column_id: col2Cols[0].id, title: 'API endpoint design', description: 'Design REST API for mobile app', priority: 'urgent', assigned_to: users[1].id, created_by: users[1].id, due_date: '2024-02-01' },
        { project_id: project2.id, column_id: col2Cols[0].id, title: 'UI wireframes', description: 'Create wireframes for main screens', priority: 'medium', assigned_to: users[5].id, created_by: users[1].id, due_date: '2024-02-05' },
        { project_id: project2.id, column_id: col2Cols[1].id, title: 'Authentication flow', description: 'Implement login/register screens', priority: 'high', assigned_to: users[1].id, created_by: users[1].id, due_date: '2024-02-10' },
        { project_id: project2.id, column_id: col2Cols[0].id, title: 'Database schema design', description: 'Design SQLite schema for mobile app', priority: 'high', assigned_to: users[0].id, created_by: users[1].id, due_date: '2024-02-15' },
        { project_id: project2.id, column_id: col2Cols[2].id, title: 'Push notifications', description: 'Set up push notification system', priority: 'medium', assigned_to: users[5].id, created_by: users[1].id, due_date: null },

        // Project 3 (Marketing Campaign)
        { project_id: project3.id, column_id: col3Cols[1].id, title: 'Content calendar planning', description: 'Plan Q4 content topics', priority: 'medium', assigned_to: users[3].id, created_by: users[2].id, due_date: '2024-01-08' },
        { project_id: project3.id, column_id: col3Cols[0].id, title: 'Social media assets', description: 'Design assets for social campaigns', priority: 'high', assigned_to: users[3].id, created_by: users[2].id, due_date: '2024-01-12' },
        { project_id: project3.id, column_id: col3Cols[3].id, title: 'Campaign report', description: 'Compile Q4 campaign performance report', priority: 'low', assigned_to: users[1].id, created_by: users[2].id, due_date: null },
    ];

    const createdTasks = [];
    for (const task of taskData) {
        const result = await new Promise((resolve, reject) => {
            const db = getDb();
            db.run(
                `INSERT INTO tasks (project_id, column_id, title, description, assigned_to, created_by, priority, due_date, position)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [task.project_id, task.column_id, task.title, task.description,
                 task.assigned_to, task.created_by, task.priority, task.due_date, 0],
                function(err) {
                    db.close();
                    if (err) reject(err);
                    else resolve({ id: this.lastID, ...task });
                }
            );
        });
        createdTasks.push(result);
    }
    console.log(`Created ${createdTasks.length} tasks`);

    // Add comments
    const commentData = [
        { task_id: createdTasks[0].id, user_id: users[2].id, content: 'I have the initial mockups ready. Should have them by Thursday.' },
        { task_id: createdTasks[0].id, user_id: users[0].id, content: 'Great, let me know if you need any feedback.' },
        { task_id: createdTasks[2].id, user_id: users[3].id, content: 'Hero section is looking great. Will update tomorrow.' },
        { task_id: createdTasks[6].id, user_id: users[1].id, content: 'API endpoints are mostly done. Need to add rate limiting.' },
        { task_id: createdTasks[9].id, user_id: users[5].id, content: 'Working on the notifications now.' },
        { task_id: createdTasks[9].id, user_id: users[1].id, content: 'Remember to test on both iOS and Android.' },
    ];

    for (const comment of commentData) {
        await Comment.create(comment);
    }
    console.log(`Created ${commentData.length} comments`);

    // Create notifications
    const notifData = [
        { user_id: users[2].id, type: 'project_invitation', message: 'You were added to project "Website Redesign"', project_id: project1.id },
        { user_id: users[3].id, type: 'task_assigned', message: 'Task "Design landing page mockups" was assigned to you', project_id: project1.id, task_id: createdTasks[0].id },
        { user_id: users[1].id, type: 'task_assigned', message: 'Task "API endpoint design" was assigned to you', project_id: project2.id, task_id: createdTasks[6].id },
        { user_id: users[0].id, type: 'comment', message: 'New comment on "Design landing page mockups"', project_id: project1.id, task_id: createdTasks[0].id },
        { user_id: users[3].id, type: 'task_assigned', message: 'Task "Social media assets" was assigned to you', project_id: project3.id, task_id: createdTasks[10].id },
    ];

    for (const notif of notifData) {
        await Notification.create(notif);
    }

    // Create activity log
    const activityData = [
        { project_id: project1.id, user_id: users[0].id, action: 'project_created', entity_type: 'project', entity_id: project1.id },
        { project_id: project1.id, user_id: users[0].id, action: 'member_added', entity_type: 'project_member', entity_id: users[2].id },
        { project_id: project1.id, user_id: users[0].id, action: 'task_created', entity_type: 'task', entity_id: createdTasks[0].id },
        { project_id: project1.id, user_id: users[3].id, action: 'comment_added', entity_type: 'comment', entity_id: commentData[0].id },
        { project_id: project2.id, user_id: users[1].id, action: 'task_assigned', entity_type: 'task', entity_id: createdTasks[6].id, details: 'Task assigned to Ahmed Irfan' },
    ];

    for (const activity of activityData) {
        await ActivityLog.create(activity);
    }

    console.log('\n=== DEMO CREDENTIALS ===');
    console.log('Username: admin / Password: password123');
    console.log('Username: ahmed / Password: password123');
    console.log('Username: sarah / Password: password123');
    console.log('Username: mike   / Password: password123');
    console.log('Username: elena  / Password: password123');
    console.log('Username: james  / Password: password123');
    console.log('\nSeed complete!\n');

    process.exit(0);
}

seed().catch(err => {
    console.error('Seed failed:', err);
    process.exit(1);
});
