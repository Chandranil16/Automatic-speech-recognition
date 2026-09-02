const express=require ('express');
const cors=require ('cors');
require ('dotenv').config ();
const transcribe_route=require ('./routes/transcription_route');
const error_handler=require ('./middleware/error_handler');
const http = require("http");
const startLiveTranscription = require("./live_transcription_backend");
const app=express();
const PORT=process.env.PORT

//middleware
app.use (cors());
app.use (express.json());
app.use (express.urlencoded ({extended: true}));

//routes
app.use('/api/transcribe', transcribe_route);

//error handling
app.use (error_handler);

const server = http.createServer(app);

startLiveTranscription(server);

server.listen(PORT || 5000, () => {
  console.log(`Server is running on port ${PORT || 5000}`);
});