// require('dotenv').config({path: './env'});
import dotenv from "dotenv";
import connectDB from "./db/connection.js";
import { app } from "./app.js";

dotenv.config({
  path: "./.env",
});

const port = process.env.PORT || 9000;

connectDB()
  .then(() => {
    app.on("error", (error) => {
      console.error("ERR: ", error);
      throw error;
    });

    app.listen(port, () => {
      console.log(`Server listening at http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.log(`MONGODB Connection Failed!! - ${err}`);
  });















  
// import express from 'express';
// const app = express()
// ;(async () => {

//     try{
//         await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);

//         app.on('error', (error) => {
//             console.error("ERR: ", error);
//             throw error;
//         });

//         app.listen(process.env.PORT, ()=>{
//             console.log(`App is listening on port: ${process.env.PORT}`);
//         })

//     }catch(error){
//         console.error("ERROR: " , error);
//         throw error;

//     }

// })();
