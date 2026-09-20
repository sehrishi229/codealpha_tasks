const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { generateToken } = require('../middleware/auth');

module.exports = {
    register: async (req, res) => {
        try {
            const { username, email, password, full_name } = req.body;

            if (!username || !email || !password || !full_name) {
                return res.status(400).json({ error: 'All fields are required' });
            }

            if (password.length < 6) {
                return res.status(400).json({ error: 'Password must be at least 6 characters' });
            }

            const existingUser = await User.getByUsername(username);
            if (existingUser) {
                return res.status(409).json({ error: 'Username already exists' });
            }

            const existingEmail = await User.getByEmail(email);
            if (existingEmail) {
                return res.status(409).json({ error: 'Email already registered' });
            }

            const user = await User.create({ username, email, password, full_name });
            const token = generateToken(user);

            res.status(201).json({ user: { id: user.id, username, email, full_name }, token });
        } catch (err) {
            res.status(500).json({ error: 'Registration failed' });
        }
    },

    login: async (req, res) => {
        try {
            const { username, password } = req.body;

            if (!username || !password) {
                return res.status(400).json({ error: 'Username and password required' });
            }

            const user = await User.getByUsername(username);
            if (!user) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const validPassword = bcrypt.compareSync(password, user.password);
            if (!validPassword) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const token = generateToken({ id: user.id, username: user.username });

            res.json({
                user: { id: user.id, username: user.username, email: user.email, full_name: user.full_name, profile_picture: user.profile_picture },
                token
            });
        } catch (err) {
            res.status(500).json({ error: 'Login failed' });
        }
    },

    getProfile: async (req, res) => {
        try {
            const user = await User.getById(req.user.id);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
            res.json(user);
        } catch (err) {
            res.status(500).json({ error: 'Failed to fetch profile' });
        }
    },

    searchUsers: async (req, res) => {
        try {
            const { q } = req.query;
            const users = await User.search(q || '');
            res.json(users);
        } catch (err) {
            res.status(500).json({ error: 'Search failed' });
        }
    }
};
