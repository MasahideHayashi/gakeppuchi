import express from 'express';
import { join,dirname } from 'path';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
const app = express();
const port = 3000;

app.use(express.urlencoded({ extended: true }));

const __dirname = dirname(new URL(import.meta.url).pathname);

app.set('view engine', 'ejs');
app.set('views', join(__dirname, "../ejs"));

const db = new sqlite3.Database(join(__dirname, '../db/chat.db'));

app.get('/', (req, res) => {
  // res.sendFile(join(__dirname, "../public/HomePage.html"));
  db.serialize(() => {
    db.all("SELECT * FROM ChatRoom", (err, rows) => {
      if (err) {
        console.error(err);
        res.status(500).send("Database error");
        return;
      }
      const sendData = { chatRooms: rows  };
      res.render('HomePage', sendData);
    });
  });
});

app.get('/room', (req, res) => {
  db.serialize(() => {
    const roomId = req.query.id;
    const roomName = req.query.name;
    db.all("SELECT * FROM ChatLog WHERE room_id = ?", [roomId], (err, rows) => {
      if (err) {
        console.error(err);
        res.status(500).send("Database error");
        return;
      }
      const chatData = { 
        roomName: roomName,
        roomId: roomId,
        chatLog: rows 
      };
      res.render('ChatRoom', chatData);
    });
  });
});

app.get('/create-room', (req, res) => {
  res.sendFile(join(__dirname, "../public/CreateRoom.html"));
});

app.post('/send-message', (req, res) => {
  db.serialize(() => {
    const roomId = req.body.room_id;
    const roomName = req.body.room_name;
    const username = req.body.username;
    const message = req.body.message;
    const timestamp = new Date().toISOString();

    const insertQuery = `INSERT INTO ChatLog (room_id, user_name, message, post_date) VALUES (?, ?, ?, ?)`;
    db.run(insertQuery, [roomId, username, message, timestamp], (err) => {
      if (err) {
        console.error(err);
        res.status(500).send("Database error");
        return;
      }
      res.redirect(`/room?id=${roomId}&name=${encodeURIComponent(roomName)}`); // メッセージ送信後にチャットルームにリダイレクト
    });
  });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
