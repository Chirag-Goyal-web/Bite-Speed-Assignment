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


async function getPrimaryIdUsingPhoneNumber(phoneNumber){
    const contactWithSamePhoneNumber = await query('SELECT * FROM "Contact" where "phoneNumber"=$1 limit 1', [phoneNumber]);
    return contactWithSamePhoneNumber.rows[0].linkPrecedence == "primary" ?  contactWithSamePhoneNumber.rows[0].id : contactWithSamePhoneNumber.rows[0].linkedId;
}

async function getPrimaryIdUsingEmail(email){
    const contactWithSameEmail = await query('SELECT * FROM "Contact" where email=$1 limit 1', [email]);
    return contactWithSameEmail.rows[0].linkPrecedence == "primary" ?  contactWithSameEmail.rows[0].id : contactWithSameEmail.rows[0].linkedId;
}

async function checkIfEmailExist(email){
    const result = await query('SELECT * from "Contact" where email= $1',[email]);
    return result.rows.length>0;
}

async function checkIfPhoneNumberExist(phoneNumber){
    const result = await query('SELECT * from "Contact" where "phoneNumber"= $1',[phoneNumber]);   
    return result.rows.length>0;
}