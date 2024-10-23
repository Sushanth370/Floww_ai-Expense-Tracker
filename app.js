const express = require("express");
const app = express();

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

app.use(express.json());

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const path = require("path");
const dbPath = path.join(__dirname, "expenseTracker.db");
console.log("hello");

let db = null;
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3820, () => {
      console.log("Server is Running at http://localhost:3820");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
  }
};

initializeDBAndServer();


// JwtToken Verification
const authenticateToken = (request, response, next) => {
    const { type, category, amount, description } = request.body;
    const { id } = request.params;
    let jwtToken;
    const authHeader = request.headers["authorization"];
    if (authHeader !== undefined) {
      jwtToken = authHeader.split(" ")[1];
    }
    if (jwtToken === undefined) {
      response.status(401);
      response.send("Invalid JWT Token");
    } else {
      jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
        if (error) {
          response.status(401);
          response.send("Invalid JWT Token");
        } else {
          request.payload = payload;
          request.id = id;
          request.type = type;
          request.category = category;
          request.amount = amount;
          request.description = description;
          next();
        }
      });
    }
  };


//Register User API-1
app.post("/register", async (request, response) => {
    const { username, password } = request.body;
    const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
    console.log(username, password);
    const dbUser = await db.get(selectUserQuery);
    if (dbUser === undefined) {
      if (password.length < 6) {
        response.status(400);
        response.send("Password is too short");
      } else {
        const hashedPassword = await bcrypt.hash(password, 10);
        const createUserQuery = `
              INSERT INTO 
                  user ( username, password)
              VALUES(
                  '${username}',
                  '${hashedPassword}'
              )    
           ;`;
  
        await db.run(createUserQuery);
        response.status(200);
        response.send("User created successfully");
      }
    } else {
      response.status(400);
      response.send("User already exists");
    }
  });


//User Login API-2
app.post("/login", async (request, response) => {
    const { username, password } = request.body;
    const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
    console.log(username, password);
    const dbUser = await db.get(selectUserQuery);
    console.log(dbUser);
    if (dbUser === undefined) {
      response.status(400);
      response.send("Invalid user");
    } else {
      const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
      if (isPasswordMatched === true) {
        const jwtToken = jwt.sign(dbUser, "MY_SECRET_TOKEN");
        response.send({ jwtToken });
      } else {
        response.status(400);
        response.send("Invalid password");
      }
    }
  });


//Get Post New Transaction API-3
app.post("/transactions", authenticateToken, async (request, response) => {
    const { type } = request;
    const { category } = request;
    const { amount } = request;
    const { description } = request;
    const { payload } = request;
    const { user_id, username } = payload;
    console.log(username);
  
    const postTransactionQuery = `
          INSERT INTO 
              transactions (type, category, amount, description, user_id)
          VALUES(
              '${type}',
              '${category}',
              ${amount},
              '${description}',
              ${user_id}
          )
      ;`;
    await db.run(postTransactionQuery);
    response.send("Created a Transaction");
  });


//All Transactions of User API-4
app.get("/transactions", authenticateToken, async (request, response) => {
    const { payload } = request;
    const { user_id, username } = payload;
    console.log(username);
    const getTransactionsQuery = `
          SELECT *
          FROM 
              transactions
          WHERE 
              user_id = ${user_id}   
              ;`;
  
    const transactionsArray = await db.all(getTransactionsQuery);
    response.send(transactionsArray);
  });


//Transaction of User based on transaction_id  API-5
app.get("/transactions/:id", authenticateToken, async (request, response) => {
    const { payload } = request;
    const { id } = request;
    const { user_id, username } = payload;
    console.log(username);
    const getTransactionsQuery = `
          SELECT *
          FROM 
              transactions
          WHERE 
              user_id = ${user_id} AND transaction_id = ${id}   
              ;`;
  
    const transactionsArray = await db.all(getTransactionsQuery);
    response.send(transactionsArray);
  });


//Update the Transaction based on transaction_id API-6
app.put("/transactions/:id", authenticateToken, async (request, response) => {
    const { type } = request;
    const { category } = request;
    const { amount } = request;
    const { description } = request;
    const { payload } = request;
    const { id } = request;
    const { user_id, username } = payload;
    console.log(username);
  
    if (category !== undefined){
        const updateTransactionQuery1 = `
            UPDATE
                transactions
            SET 
                category = '${category}'
            WHERE 
                user_id = ${user_id} AND transaction_id = ${id}
      ;`;
    await db.run(updateTransactionQuery1);
    response.send("Category updated successfully");
    }

    if (type !== undefined){
        const updateTransactionQuery2 = `
            UPDATE
                transactions
            SET 
                type = '${type}'
            WHERE 
                user_id = ${user_id} AND transaction_id = ${id}
      ;`;
    await db.run(updateTransactionQuery2);
    response.send("Type updated successfully");
    }

    if (amount !== undefined){
        const updateTransactionQuery3 = `
            UPDATE
                transactions
            SET 
                amount = ${amount}
            WHERE 
                user_id = ${user_id} AND transaction_id = ${id}
      ;`;
    await db.run(updateTransactionQuery3);
    response.send("Amount updated successfully");
    }

    if (description !== undefined){
        const updateTransactionQuery4 = `
            UPDATE
                transactions
            SET 
                description = '${description}'
            WHERE 
                user_id = ${user_id} AND transaction_id = ${id}
      ;`;
    await db.run(updateTransactionQuery4);
    response.send("Description updated successfully");
    }
  });


//Delete Transaction API-7
app.delete("/transactions/:id", authenticateToken, async (request, response) => {
    const { id } = request;
    const { payload } = request;
    const { user_id, username } = payload;
  
    const deleteTransactionQuery = `
          DELETE FROM transactions
          WHERE 
              user_id = ${user_id} AND transaction_id = ${id}
      ;`;
      await db.run(deleteTransactionQuery);
      response.send("Transaction Removed");  
  });


//Summary of User API-8
app.get("/summary", authenticateToken, async (request, response) => {
    const { payload } = request;
    const { user_id, username } = payload;
    console.log(username);
    const getSummaryQuery = `
          SELECT 
            SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as totalIncome,
            SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as totalExpenses,
            (SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) - 
            SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END)) as balance
          FROM 
              transactions
          WHERE 
              user_id = ${user_id}   
              ;`;
  
    const summaryArray = await db.all(getSummaryQuery);
    response.send(summaryArray);
  });


  module.exports = app;