import readline from "readline";
import { io } from "socket.io-client";
import { encrypt, decrypt } from "./encryption.js";

const socket = io("http://localhost:3000");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

let mode = null;
let target = null;

socket.on("receive_private_message", ({ from, message }) => {
  const decrypted = decrypt(message);
  console.log(`\n[PRIVATE] ${from}: ${decrypted}`);
  promptInput();
});

socket.on("receive_room_message", ({ from, message }) => {
  const decrypted = decrypt(message);
  console.log(`\n[${target} ROOM] ${from}: ${decrypted}`);
  // promptInput();
});

let username = "";
let password = "";

rl.question("Enter your username: ", (name) => {
  username = name;
  rl.question("Enter your password: ", (pass) => {
    password = pass;

    socket.emit("auth", { username, password });

    socket.on("auth_success", (data) => {
      console.log(` Authenticated as ${data.username}`);
      chooseMode();
    });

    socket.on("auth_error", (message) => {
      console.log(` Authentication failed: ${message}`);
      process.exit(1);
    });
  });
});

function chooseMode() {
  rl.question(
    "\nChoose chat mode:\n1) Private chat\n2) Room chat\n> ",
    (choice) => {
      if (choice === "1") {
        mode = "private";
        rl.question("Enter username to chat with: ", (user) => {
          socket.emit("find_user", user, (response) => {
            if (response.success) {
              target = user;
              console.log("User exists, starting private chat...");
              promptInput();
            } else {
              console.log(response.message);
              chooseMode();
            }
          });
        });
      } else if (choice === "2") {
        mode = "room";
        rl.question("Enter room name: ", (room) => {
          socket.emit("find_room", room, (response) => {
            console.log("in find room");
            if (response.success) {
              target = room;
              console.log("Room exists,joining...");
              socket.emit("join_room", room);
              promptInput();
            } else {
              console.log(response.message);
              chooseMode();
            }
          });
        });
      } else {
        console.log("Invalid choice.");
        chooseMode();
      }
    }
  );
}

let isFirstTime = 0;

socket.on("private_messages_history", (messages) => {
  messages.forEach((message) => {
    console.log(`[${message.from}] : ${decrypt(message.message)}`);
  });
});
socket.on("room_messages_history", (messages) => {
  console.log("in room history"); ////////
  messages.forEach((message) => {
    console.log(`[${message.room}] : ${decrypt(message.message)}`);
  });
});

function promptInput() {
  if (!isFirstTime) {
    isFirstTime = 1;

    mode === "private"
      ? socket.emit("get_private_messages", { withUser: target })
      : socket.emit("get_room_messages", { room: target });
  }

  rl.question(`${mode === "private" ? `[${username}]` : ""} > `, (msg) => {
    if (msg.trim().toLowerCase() === "/menu") {
      mode = null;
      target = null;
      isFirstTime = 0;
      chooseMode();

      return;
    }

    if (mode === "private") {
      socket.emit("send_private_message", {
        to: target,
        message: encrypt(msg),
      });
    } else if (mode === "room") {
      socket.emit("send_room_message", {
        room: target,
        message: encrypt(msg),
      });
    }

    setTimeout(promptInput, 100);
  });
}
