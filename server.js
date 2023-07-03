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
    port: process.env.DATABASE_PORT,
    ssl: {
        rejectUnauthorized: false
    }
});

const query = (text, params) => pool.query(text, params);

app.post("/identify", async (req,res)=>{
    const email = req.body.email;
    const phoneNumber = req.body.phoneNumber;
    await modifyContactData(email, phoneNumber);
    const response = await getResponse(email, phoneNumber);
    res.status(200).json(response);
});

async function modifyContactData(email, phoneNumber){
    var emailExist = false;
    var phoneNumberExist = false;

    if(email!=null){
        emailExist = await checkIfEmailExist(email);
    }
    if(phoneNumber!=null){
        phoneNumberExist = await checkIfPhoneNumberExist(phoneNumber);
    }

    const createTime=new Date().toISOString();
    const updatedTime=new Date().toISOString();

    if(emailExist && phoneNumberExist){
        const primaryId1 = await getPrimaryIdUsingPhoneNumber(phoneNumber);
        const primaryId2 = await getPrimaryIdUsingEmail(email);

        if(primaryId1!=primaryId2){
            const contactDetails1 = await query('SELECT * FROM "Contact" where id=$1',[primaryId1]);
            const contactDetails2 = await query('SELECT * FROM "Contact" where id=$1',[primaryId2]);

            if((new Date(contactDetails1.rows[0].createTime).getTime()) < (new Date(contactDetails2.rows[0].createTime).getTime())){
                await query('UPDATE "Contact" SET "linkedId"=$1, "updatedAt"=$1 where "linkedId"=$3', [primaryId1, updatedTime, primaryId2]);
                await query('UPDATE "Contact" SET "linkedId"=$1, "linkPrecedence"=$2, "updatedAt"=$3 where id=$4',[primaryId1, 'secondary', updatedTime,primaryId2]);
            }
            else{
                await query('UPDATE "Contact" SET "linkedId"=$1, "updatedAt"=$2 where "linkedId"=$3', [primaryId2, updatedTime, primaryId1]);
                await query('UPDATE "Contact" SET "linkedId"=$1, "linkPrecedence"=$2, "updatedAt"=$3 where id=$4',[primaryId2, 'secondary', updatedTime, primaryId1]);
            }
        }
    }   
    else if(emailExist && !phoneNumberExist && phoneNumber!=null){
        const primaryId = await getPrimaryIdUsingEmail(email);
        await query('INSERT INTO "Contact"("phoneNumber", email, "linkedId", "linkPrecedence", "createdAt", "updatedAt") values($1, $2, $3, $4, $5, $6)', [phoneNumber, email, primaryId, 'secondary', createTime, createTime]);
    }
    else if(!emailExist && phoneNumberExist && email!=null){
        const primaryId = await getPrimaryIdUsingPhoneNumber(phoneNumber);
        await query('INSERT INTO "Contact"("phoneNumber", email, "linkedId", "linkPrecedence", "createdAt", "updatedAt") values($1, $2, $3, $4, $5, $6)', [phoneNumber, email, primaryId, 'secondary', createTime, createTime]);
    }
    else{
        await query('INSERT INTO "Contact"("phoneNumber", email, "linkPrecedence", "createdAt", "updatedAt") values($1, $2, $3, $4, $5)', [phoneNumber, email, "primary", createTime, createTime]);
    }
}

async function getResponse(email, phoneNumber){
    var primaryContactId="";
    const secondaryContactIdsList = [];

    if(phoneNumber!=null){
        primaryContactId = await getPrimaryIdUsingPhoneNumber(phoneNumber);
    }else{
        primaryContactId = await getPrimaryIdUsingEmail(email);
    }

    const phoneNumberSet = new Set();
    const emailSet = new Set();

    var temp = await query('SELECT * FROM "Contact" where id=$1', [primaryContactId]);
    
    if(temp.rows[0].phoneNumber!=null)
        phoneNumberSet.add(temp.rows[0].phoneNumber);
    if(temp.rows[0].email!=null)
        emailSet.add(temp.rows[0].email);

    temp = await query('SELECT * FROM "Contact" where "linkedId"=$1', [primaryContactId]);    
    temp.rows.forEach(element => {
        if(element.phoneNumber!=null)
            phoneNumberSet.add(element.phoneNumber);
        if(element.email!=null)
            emailSet.add(element.email);
        secondaryContactIdsList.push(element.id);
    });

    const phoneNumberList = [...phoneNumberSet];
    const emailList = [...emailSet];

    return {
        "contact":{
            "primartContactId": primaryContactId,
            "emails": emailList,
            "phoneNumbers": phoneNumberList,
            "secondaryContactIds": secondaryContactIdsList
        }
    }
}

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

let port= process.env.PORT || 3000;
app.listen(port,()=>{
    console.log('Listening at port '+port+'...');
});