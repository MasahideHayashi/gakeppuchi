import express from 'express';
import { join,dirname } from 'path';
const app = express();
const port = 3000;

const __dirname = dirname(new URL(import.meta.url).pathname);

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, "../public/HomePage.html"));
});

app.get('/room', (req, res) => {
  res.sendFile(join(__dirname, "../public/ChatRoom.html"));
});

app.get('/create-room', (req, res) => {
  res.sendFile(join(__dirname, "../public/CreateRoom.html"));
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
