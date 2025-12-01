import express from 'express';
import { join,dirname } from 'path';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import runOllama from './aiag.js';
import { readFile } from 'fs/promises';

const app = express();
const port = 3000;

app.use(express.urlencoded({ extended: true }));

const __dirname = dirname(fileURLToPath(import.meta.url));

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

app.get('/room', async (req, res) => {
  db.serialize(() => {
    const roomId = req.query.id;
    const roomName = req.query.name;
    db.all("SELECT * FROM ChatLog WHERE room_id = ?", [roomId], async (err, rows) => {
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
  res.render('CreateRoom');
//   res.sendFile(join(__dirname, "../public/CreateRoom.html"));
});

app.post('/create-room', (req, res) => {
  db.serialize(() => {
    const roomName = req.body['room-name'];
    const countQuery = `select count(room_id) as count from ChatRoom`;
    let roomCount = 0;
    db.get(countQuery, (err, row) => {
      if (err) {
        console.error(err);
        res.status(500).send("Database error");
        return;
      }
      roomCount = row.count;
      const insertQuery = `INSERT INTO ChatRoom (room_id, room_name) VALUES (?, ?)`;
      db.run(insertQuery, [roomCount + 1, roomName], (err) => {
        if (err) {
          console.error(err);
          res.status(500).send("Database error");
          return;
        }
        res.redirect('/');
      });
    });
  });
});

app.post('/send-message', (req, res) => {
  const roomId = req.body.room_id;
  const roomName = req.body.room_name;
  const username = req.body.username;
  const message = req.body.message;
  const timestamp = new Date().toISOString();

  db.serialize(async () => {
    const insertQuery = `INSERT INTO ChatLog (room_id, user_name, message, post_date) VALUES (?, ?, ?, ?)`;
    db.run(insertQuery, [roomId, username, message, timestamp], async (err) => {
      if (err) {
        console.error(err);
        res.status(500).send("Database error");
        return;
      }

      const getlogQuery = `SELECT * FROM ChatLog WHERE room_id = ?`;
      db.all(getlogQuery, [roomId], async (err, rows) => {
        if (err) {
          console.error(err);
          return;
        }

        try {
          const promptTemplate = await readFile(join(__dirname, '../prompt/generate_dialogue.txt'), 'utf-8');
          const dialogue = rows.map(row => `${row.user_name}: ${row.message}`).join('\n');
          const fullPrompt = `${promptTemplate}\n# 会話内容\n${dialogue}`;

          // Ollama API呼び出し
          const aiResponse = await runOllama(fullPrompt);
          const responseMessage = aiResponse ? aiResponse.trim() : "AIからの応答が得られませんでした。";

          const reinsertQuery = `INSERT INTO ChatLog (room_id, user_name, message, post_date) VALUES (?, ?, ?, ?)`;
          db.run(reinsertQuery, [roomId, "AI", responseMessage, new Date().toISOString()], (err) => {
            if (err) {
              console.error("AI message insert error:", err);
            }
            // AIメッセージの挿入後にリダイレクト
            res.redirect(`/room?id=${roomId}&name=${encodeURIComponent(roomName)}`);
          });
        } catch (e) {
          console.error("AI response error:", e);
          res.redirect(`/room?id=${roomId}&name=${encodeURIComponent(roomName)}`);
        }
      });
    });
  });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
