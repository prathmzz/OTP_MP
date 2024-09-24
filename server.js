// server.js
const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(bodyParser.json());

// Connect to MongoDB (update your connection string)
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// User model
const UserSchema = new mongoose.Schema({
    email: String,
    otp: String,
    otpExpires: Date
});
const User = mongoose.model('User', UserSchema);

// Configure nodemailer
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Route to send OTP
app.post('/send-otp', async (req, res) => {
    const { email } = req.body;

    // Generate a random OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60000); // OTP valid for 10 minutes

    // Save OTP to the database
    await User.findOneAndUpdate(
        { email },
        { otp, otpExpires },
        { upsert: true, new: true }
    );

    // Send OTP email
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Your OTP Code',
        text: `Your OTP code is ${otp}. It is valid for 10 minutes.`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return res.status(500).json({ message: 'Error sending email' });
        }
        res.status(200).json({ message: 'OTP sent to your email' });
    });
});

// Route to verify OTP
app.post('/verify-otp', async (req, res) => {
    const { email, otp } = req.body;

    // Check if the OTP is valid
    const user = await User.findOne({ email });

    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    if (user.otp === otp && user.otpExpires > new Date()) {
        // OTP is valid
        await User.findOneAndUpdate({ email }, { otp: null, otpExpires: null }); // Clear OTP
        return res.status(200).json({ message: 'OTP verified successfully' });
    } else {
        return res.status(400).json({ message: 'Invalid or expired OTP' });
    }
});

// Start the server
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
