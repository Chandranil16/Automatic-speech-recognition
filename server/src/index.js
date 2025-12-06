const express=require ('express');
const cors=require ('cors');
require ('dotenv').config ();
const transcribe_route=require ('./routes/transcription_route');
const error_handler=require ('./middleware/error_handler');

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

app.listen (PORT, () => {
  console.log (`Server is running on port ${PORT}`);
});