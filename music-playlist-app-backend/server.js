const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const { GridFSBucket, ObjectId } = require('mongodb');
const shortid = require('shortid');

require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/musicdatabase', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Failed to connect to MongoDB', err));

// Initialize GridFS
let gfs;

const conn = mongoose.connection;
conn.once('open', () => {
    gfs = new GridFSBucket(conn.db, {bucketName: 'uploads' //Specify your bucket name here
});
});

// Create storage engine using GridFS
const storage = new GridFsStorage({
    url: 'mongodb://localhost:27017/musicdatabase',
    file: (req, file) => {
        return {
            __filename: file.originalname,
            bucketName: 'uploads' // Bucket name in MongoDB

        };
    }
});
// Set up multer to handle file uploads
const upload = multer({ storage });

// Route to handle file uploads
app.post('/api/upload', upload.single('audioFile'), (req,res) => {
    if(!req.file){
        return res.status(400).json({ error: 'No file uploaded'});

    }
    console.log('uploaded file:', req.file);
    res.json({fileId: req.file.id});
});
// Playlist Model
const PlaylistSchema = new mongoose.Schema({
    name: {type: String, required: true},
    songs: [{type: mongoose.Schema.Types.ObjectId, ref: 'Song'}],
    playlistCode: {
        type: String,
        required: true,
        unique: true,
        default: () => shortid.generate ()
    }
});
const Playlist = mongoose.model('Playlist', PlaylistSchema);

// Song Model
const Song = mongoose.model('Song', new mongoose.Schema({
    title: { type: String, required: true },
    artist: { type: String, required: true },
    songcode: { type: String, required: true, unique: true },
    album: String,
    duration: { type: Number, required: true },
    fileId: { type: mongoose.Schema
                            .Types.ObjectId, ref: 'uploads.files' }
    // Reference to GridFS file
}));

// Routes
// Playlists
app.get('/api/playlists', async (req, res) => {
    try {
        const playlists = await Playlist.find().populate('songs');
        res.json(playlists);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/songs/:songId/audio', async (req, res) => {
    try {
        const songId = req.params.songId;

        // Ensure the songId is a valid ObjectId
        if (!ObjectId.isValid(songId)) {
            return res.status(404).json({ error: 'Invalid song ID' });
        }

        // Find the song in MongoDB
        const song = await Song.findById(songId);
        if (!song) {
            return res.status(404).json({ error: 'Song not found' });