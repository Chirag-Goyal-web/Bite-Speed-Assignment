require('dotenv').config()
const express = require('express');
const pq = require('pg');

const app = express();
app.use(express.json());

const pool = new pq.Pool({
    user: process.env.USER,
    host: process.env.HOST,
    database: process.env.DATABASE,
    password: process.env.PASSWORD,
    port: process.env.PORT
});

const query = (text, params) => pool.query(text, params);


app.post("/identify", async (req,res)=>{
    const email = req.body.email;
    const phoneNumber = req.body.phoneNumber;
});