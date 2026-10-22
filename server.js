const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const crypto = require("crypto");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));
app.get("/health", (_, res) => res.json({ ok: true }));

const questions = [
  { type:"mc", q:"Which method transfers thermal energy mainly through direct particle interactions in a solid?", options:["Conduction","Convection","Radiation","Evaporation"], answer:0, explain:"Conduction transfers energy through particle collisions and interactions." },
  { type:"mc", q:"How does energy from the Sun travel through the vacuum of space to Earth?", options:["Conduction","Convection","Radiation","Sound waves"], answer:2, explain:"Radiation travels as electromagnetic waves and does not need a material medium." },
  { type:"mc", q:"Which material is generally the best thermal conductor?", options:["Rubber","Copper","Wood","Foam"], answer:1, explain:"Copper is a metal and transfers thermal energy efficiently." },
  { type:"mc", q:"Warm air rises mainly because it is...", options:["more dense than cold air","less dense than surrounding cold air","a better conductor","unable to transfer energy"], answer:1, explain:"Heating makes air expand and become less dense, so it rises in cooler air." },
  { type:"mc", q:"Which surface usually absorbs thermal radiation most effectively?", options:["Shiny white","Shiny silver","Dull black","Polished aluminium"], answer:2, explain:"Dark, dull surfaces are generally good absorbers of thermal radiation." },
  { type:"mc", q:"A metal spoon becomes warm in hot soup. Which process is most directly responsible for heat moving along the spoon?", options:["Conduction","Convection","Radiation","Condensation"], answer:0, explain:"Energy is conducted through the solid metal spoon." },
  { type:"mc", q:"Convection occurs in which materials?", options:["Solids only","Liquids and gases","Vacuum only","Metals only"], answer:1, explain:"Convection transfers energy by bulk movement in fluids: liquids and gases." },
  { type:"mc", q:"What is the usual direction of spontaneous thermal energy transfer?", options:["Cold to hot","Hot to cold","Only upward","Only through metals"], answer:1, explain:"Net thermal energy transfers from higher temperature to lower temperature." },
  { type:"mc", q:"Why are saucepan handles often made from wood or heat-resistant plastic?", options:["They increase convection","They are good conductors","They are thermal insulators","They create radiation"], answer:2, explain:"Insulators slow the transfer of thermal energy to the hand." },
  { type:"mc", q:"Which example best demonstrates convection?", options:["A metal bar warming at one end","Sunlight warming the ground","Warm water circulating in a heated pot","A spoon absorbing infrared waves"], answer:2, explain:"Convection involves movement of the heated liquid." },
  { type:"tf", q:"Radiation can transfer thermal energy through a vacuum.", options:["True","False"], answer:0, explain:"Radiation does not require matter, so it can travel through a vacuum." },
  { type:"tf", q:"Convection transfers thermal energy through the bulk movement of particles in a solid.", options:["True","False"], answer:1, explain:"Convection occurs in fluids (liquids and gases), not by bulk flow through a solid." },
  { type:"tf", q:"A good thermal insulator slows down the rate of thermal energy transfer.", options:["True","False"], answer:0, explain:"Insulators reduce the rate of heat transfer." },
  { type:"tf", q:"Thermal energy naturally flows from a colder object to a hotter object without external work.", options:["True","False"], answer:1, explain:"Net spontaneous heat transfer is from hotter to colder objects." },
  { type:"mc", q:"A room heater warms nearby air, which rises and cooler air moves in to replace it. This is...", options:["Conduction","Convection","Radiation only","Reflection"], answer:1, explain:"Warm air rises and cooler air sinks, setting up a convection current." },
  { type:"mc", q:"Which method transfers energy from a fire to your face across a gap without contact?", options:["Conduction only","Convection only","Radiation","Freezing"], answer:2, explain:"Infrared radiation can transfer energy across the gap." },
  { type:"mc", q:"Why does a metal bench feel colder than a wooden bench at the same room temperature?", options:["Metal is always at a lower temperature","Metal conducts energy away from your skin faster","Wood has no thermal energy","Wood produces heat"], answer:1, explain:"Metal's higher thermal conductivity transfers energy away from your skin more quickly." },
  { type:"mc", q:"Which change would generally reduce heat loss through a house wall?", options:["Use a good insulating layer","Replace insulation with copper","Make the wall thinner without insulation","Increase air leakage"], answer:0, explain:"Insulating materials reduce thermal energy transfer." },
  { type:"mc", q:"What is temperature a measure of in the particle model?", options:["The total mass of an object","The average kinetic energy of particles","The object's volume only","The number of atoms only"], answer:1, explain:"Temperature is related to the average kinetic energy of particles." },
  { type:"mc", q:"A vacuum flask has reflective surfaces and a vacuum gap. The reflective surfaces mainly reduce...", options:["Conduction through the vacuum","Radiation transfer","The liquid's mass","Gravity"], answer:1, explain:"Reflective surfaces reduce heat transfer by radiation." }
];

const rooms = new Map();
const makePin = () => String(crypto.randomInt(100000, 1000000));
function roomSnapshot(room) {
  return {
    pin: room.pin, state: room.state, questionIndex: room.questionIndex,
    questionCount: questions.length,
   question: ["question", "results"].includes(room.state) ? publicQuestion(room.questionIndex) : null,
    players: [...room.players.values()].map(p => ({
      id:p.id, name:p.name, className:p.className, score:p.score,
      answered:p.answer !== null, connected:p.connected
    })).sort((a,b)=>b.score-a.score),
    answeredCount: [...room.players.values()].filter(p=>p.answer !== null).length,
    answerStats: room.state === "results" ? countAnswers(room) : null,
    correctAnswer: room.state === "results" ? questions[room.questionIndex].answer : null,
    explanation: room.state === "results" ? questions[room.questionIndex].explain : null
  };
}
function publicQuestion(index) {
  const q = questions[index];
  return { number:index+1, total:questions.length, type:q.type, question:q.q, options:q.options };
}
function countAnswers(room) {
  const q = questions[room.questionIndex];
  return q.options.map((_,i)=>[...room.players.values()].filter(p=>p.answer===i).length);
}
function broadcast(room) {
  io.to(room.pin).emit("room:update", roomSnapshot(room));
}
io.on("connection", socket => {
  socket.on("teacher:create", (_, cb) => {
    let pin;
    do { pin = makePin(); } while (rooms.has(pin));
    const room = { pin, teacherId:socket.id, state:"lobby", questionIndex:-1, players:new Map() };
    rooms.set(pin, room);
    socket.join(pin);
    socket.data.role = "teacher"; socket.data.pin = pin;
    if (typeof cb === "function") cb({ok:true, pin, questions:questions.length});
    broadcast(room);
  });

  socket.on("student:join", (data, cb) => {
    const pin = String(data?.pin || "").trim();
    const name = String(data?.name || "").trim().slice(0,40);
    const className = String(data?.className || "").trim().slice(0,30);
    const room = rooms.get(pin);
    if (!room) return cb?.({ok:false, error:"That PIN was not found. Ask your teacher to check the code."});
    if (!name || !className) return cb?.({ok:false, error:"Enter your name and class."});
    if (room.state === "finished") return cb?.({ok:false, error:"This quiz has already finished."});
    const duplicate = [...room.players.values()].find(p => p.name.toLowerCase()===name.toLowerCase());
    if (duplicate) return cb?.({ok:false, error:"That name is already in this room. Add an initial or ask your teacher."});
    const player = { id:socket.id, name, className, score:0, answer:null, connected:true };
    room.players.set(socket.id, player);
    socket.join(pin); socket.data.role="student"; socket.data.pin=pin;
    cb?.({ok:true, name, className});
    socket.emit("room:update", roomSnapshot(room));
    broadcast(room);
  });

  socket.on("teacher:action", (data, cb) => {
    const room = rooms.get(String(data?.pin || socket.data.pin || ""));
    if (!room || room.teacherId !== socket.id) return cb?.({ok:false,error:"Teacher session not found."});
    const action = data?.action;
    if (action === "start") {
      room.questionIndex = 0; room.state = "question";
      for (const p of room.players.values()) p.answer = null;
    } else if (action === "next") {
      if (room.questionIndex >= questions.length-1) room.state = "finished";
      else { room.questionIndex++; room.state = "question"; for (const p of room.players.values()) p.answer = null; }
    } else if (action === "reveal") {
      if (room.state === "question") {
        room.state = "results";
        const q = questions[room.questionIndex];
        for (const p of room.players.values()) {
          if (p.answer === q.answer) p.score += 1000;
        }
      }
    } else if (action === "end") room.state = "finished";
    else return cb?.({ok:false,error:"Unknown action."});
    cb?.({ok:true}); broadcast(room);
  });

  socket.on("student:answer", (data, cb) => {
    const pin = String(data?.pin || socket.data.pin || "");
    const room = rooms.get(pin);
    const player = room?.players.get(socket.id);
    if (!room || !player || room.state !== "question") return cb?.({ok:false,error:"The question is not accepting answers right now."});
    if (player.answer !== null) return cb?.({ok:false,error:"Your answer is already locked in."});
    const choice = Number(data?.choice);
    if (!Number.isInteger(choice) || choice < 0 || choice >= questions[room.questionIndex].options.length)
      return cb?.({ok:false,error:"Choose one of the available answers."});
    player.answer = choice;
    cb?.({ok:true});
    broadcast(room);
  });

  socket.on("disconnect", () => {
    const pin = socket.data.pin, room = rooms.get(pin);
    if (!room) return;
    if (room.teacherId === socket.id) {
      // Keep the room alive briefly in memory; students see the connection drop.
      room.teacherConnected = false;
      broadcast(room);
    } else if (room.players.has(socket.id)) {
      room.players.get(socket.id).connected = false;
      broadcast(room);
    }
  });
});

server.listen(PORT, () => console.log(`Thermal Energy Quiz running on port ${PORT}`));
