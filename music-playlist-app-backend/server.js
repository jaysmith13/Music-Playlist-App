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