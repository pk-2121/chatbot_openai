const { readJsonData } = require("./helperFunctions");

require("dotenv").config();
const { Configuration, OpenAIApi } = require("openai");

let questions = null;
let default_question;

readJsonData("public/questions.json", (err, question) => {
  if (err) {
    console.log("Error in Json File reading");
    return;
  }
  questions = question.questions;
});

readJsonData("public/answers.json", (err, answer) => {
  if (err) {
    console.log("Error in Json File reading");
    return;
  }
  answers = answer.answers;
});

const express = require("express");
const app = express();

const http = require("http");
const server = http.createServer(app);

const { Server } = require("socket.io");
const io = new Server(server);

server.listen(5000, function () {
  console.log("server started at port 5000");
});

app.use(express.static("public"));

// init openai chatbot
const configuration = new Configuration({
  apiKey: process.env.CHAT_BOT_KEY,
});
const openai = new OpenAIApi(configuration);

const doGYMTrainer = async () => {
  const messages = [
    {
      role: "user",
      content: "You are a gym trainer. Answer my questions.",
    },
  ];
  try {
    const trainerResponse = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages,
    });
    console.log(trainerResponse.data.choices[0].message);
  } catch (error) {
    if (error.response) {
      console.error(error.response.status, error.response.data);
    } else {
      console.error(`Error with OpenAI API request: ${error.message}`);
    }
  }
};

doGYMTrainer();

// get data from gpt response for user questions
const getGPTResponse = async (msg) => {
  const messages = [
    {
      role: "user",
      content: msg,
    },
  ];
  try {
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages,
    });

    return completion.data.choices[0].message;
  } catch (error) {
    if (error.response) {
      console.error(error.response.status, error.response.data);
    } else {
      console.error(`Error with OpenAI API request: ${error.message}`);
    }
  }
};

io.on("connection", (socket) => {
  console.log(`connect ${socket.id}`);
  default_question = questions[0]["question"];
  current_id = questions[0]["id"];
  data_storage = { current_id: null };
  socket.emit("answer", default_question);

  socket.on("disconnect", (reason) => {
    console.log(`disconnect ${socket.id} due to ${reason}`);
  });

  // get user input data and response from openai
  socket.on("question", async (data) => {
    const responseMSG = await getGPTResponse(data);

    socket.emit("answer", responseMSG.content);
  });
});
