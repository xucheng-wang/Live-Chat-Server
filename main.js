document.addEventListener("DOMContentLoaded", () => {
    const socketio = io.connect();
    let currentUser = "";
    //get data from html
    const nicknameContainer = document.getElementById("nicknameContainer");
    const chatContainer = document.getElementById("chatContainer");
    const submitNickname = document.getElementById("submitNickname");
    const nicknameInput = document.getElementById("nickname");
    const sendMessage = document.getElementById("sendMessage");
    const messageInput = document.getElementById("message_input");
    const roomList = document.getElementById("roomList");
    const createRoom = document.getElementById("createRoom");
    const newRoomName = document.getElementById("newRoomName");
    const currentRoom = document.getElementById("currentRoom");
    const userList = document.getElementById("userList");
    const recipientSelect = document.getElementById("recipientSelect");
    const deleteRoom = document.createElement("button");
    const deleteRoomButton = document.getElementById("deleteRoom");
    currentRoom.innerText = "Main Lobby";

    sendMessage.disabled = true;
    createRoom.disabled = true;
    // initialize buttons when not logged in
    function updateButtons() {
        if (currentUser) {
            sendMessage.disabled = false;
            createRoom.disabled = false;
        } else {
            sendMessage.disabled = true;
            createRoom.disabled = true;
        }
    }
    //function for ban fiailed(testing purpose)
    socketio.on("banFailed", (data) => {
        alert(data.message);
      });
    //handel delete click
    deleteRoomButton.addEventListener("click", () => {
        socketio.emit("deleteRoom", { roomName: currentRoom.innerText });
    });
    //handle submit nickname click
    submitNickname.addEventListener("click", () => {
        if (nicknameInput.value) {
            currentUser = nicknameInput.value;
            socketio.emit("join", { nickname: currentUser, room: "Main Lobby" });
            nicknameContainer.innerHTML = `<h2>Welcome, ${currentUser}!</h2>`;
            chatContainer.classList.remove("hidden");
            updateButtons();
        }
    });

    //send message to server

    sendMessage.addEventListener("click", () => {
        if (messageInput.value) {
            const recipient = recipientSelect.value;
            socketio.emit("message_to_server", { message: messageInput.value, curroom: currentRoom.innerText, recipient });
            messageInput.value = "";
        }
    });
    //handle create room click
    createRoom.addEventListener("click", () => {
        if (newRoomName.value) {
            socketio.emit("createRoom", { roomName: newRoomName.value, password: newRoomPassword.value });
            newRoomName.value = "";
            newRoomPassword.value = "";
        }
    });
    //update room list
    socketio.on("updateRooms", (data) => {
        const { rooms, privateRooms } = data;
        roomList.innerHTML = "";
        for (const room in rooms) {
            console.log(room);
            const li = document.createElement("li");
            li.innerText = room;
            li.classList.add(privateRooms.hasOwnProperty(room) ? "private-room" : "public-room");
    
            li.addEventListener("click", () => {
                if (privateRooms.hasOwnProperty(room)) {
                    const password = prompt("Enter the password for the private room:");
                    if (password) {
                        socketio.emit("joinRoom", { roomName: room, password });
                    }
                } else {
                    socketio.emit("joinRoom", { roomName: room });
                }
            });
    
            roomList.appendChild(li);
        }
    });
    //handel wrong password
    socketio.on("wrongPassword", () => {
        alert("Wrong password! Please try again.");
    });
    //update room's information
    socketio.on("updateRoom", (data) => {
        console.log("update");
        currentRoom.innerText = data.room;
        userList.innerHTML = "";
        recipientSelect.innerHTML = "";
        recipientSelect.innerHTML = `<option value="all">All</option>`;
////////////////////////
        if (data.creator == currentUser) {
            deleteRoom.innerText = "Delete Room";
            deleteRoom.classList.add("delete-btn");
            deleteRoom.addEventListener("click", () => {
                if (confirm("Are you sure you want to delete this room? All users will be sent to the Main Lobby.")) {
                    socketio.emit("deleteRoom", { roomName: data.room });
                }
            });
            deleteRoomContainer.classList.remove("hidden");
        } else {
            deleteRoomContainer.classList.add("hidden");
        }
/////////////////////////update user list with kick, ban, mute, unmute button for creator
        data.usersInRoom.forEach((user) => {
            const li = document.createElement("li");
            li.innerText = user;
            userList.appendChild(li);
            if (data.creator==currentUser) {
                const kickBtn = document.createElement("button");
                kickBtn.innerText = "Kick";
                if(currentUser == user){
                    kickBtn.disabled = true;
                }
                kickBtn.classList.add("kick-btn");
                kickBtn.addEventListener("click", () => {
                    socketio.emit("kickUser", { userToKick: user });
                });
                li.appendChild(kickBtn);
                ///////////////
                const banBtn = document.createElement("button");
                banBtn.innerText = "Ban";
                if (currentUser == user) {
                  banBtn.disabled = true;
                }
                banBtn.classList.add("ban-btn");
                banBtn.addEventListener("click", () => {
                  socketio.emit("banUser", { userToBan: user });
                });
                li.appendChild(banBtn);
                /////////////////////
                const muteBtn = document.createElement("button");
                muteBtn.innerText = "Mute";
                if (currentUser == user) {
                  muteBtn.disabled = true;
                }
                muteBtn.classList.add("mute-btn");
                muteBtn.addEventListener("click", () => {
                  socketio.emit("muteUser", { userToMute: user });
                }
                );
                li.appendChild(muteBtn);
                /////////////////////
                const unmuteBtn = document.createElement("button");
                unmuteBtn.innerText = "Unmute";
                if (currentUser == user) {
                    unmuteBtn.disabled = true;
                    }
                unmuteBtn.classList.add("unmute-btn");
                unmuteBtn.addEventListener("click", () => {
                    socketio.emit("unmuteUser", { userToUnmute: user });
                }
                );
                li.appendChild(unmuteBtn);
            }   
            if (currentUser !== user) {
                const option = document.createElement("option");
                option.value = user;
                option.innerText = user;
                recipientSelect.appendChild(option);
            }      
        });

    });
    //handle users joined to room
    socketio.on("userJoined", (data) => {
        const li = document.createElement("li");
        li.innerText = data.nname;
        userList.appendChild(li);
        //update user list with kick, ban, mute, unmute button for creator
        if (currentUser === data.creator && currentUser !== data.nname) {
            const kickBtn = document.createElement("button");
            kickBtn.classList.add("kick-btn");
            kickBtn.addEventListener("click", () => {
                socketio.emit("kickUser", { userToKick: data.nname });
            });
            kickBtn.innerText = "kick";
            kickBtn.setAttribute("data-nickname", data.nname);
            li.appendChild(kickBtn);
            ///////////////
            const banBtn = document.createElement("button");
            banBtn.innerText = "Ban";
            banBtn.classList.add("ban-btn");
            banBtn.addEventListener("click", () => {
              socketio.emit("banUser", { userToBan: data.nname });
            });
            li.appendChild(banBtn);
            /////////////////////
            const muteBtn = document.createElement("button");
            muteBtn.innerText = "Mute";
            muteBtn.classList.add("mute-btn");
            muteBtn.addEventListener("click", () => {
                socketio.emit("muteUser", { userToMute: data.nname });
            });
            li.appendChild(muteBtn);
    
            const unmuteBtn = document.createElement("button");
            unmuteBtn.innerText = "Unmute";
            unmuteBtn.classList.add("unmute-btn");
            unmuteBtn.addEventListener("click", () => {
                socketio.emit("unmuteUser", { userToUnmute: data.nname });
            });
            li.appendChild(unmuteBtn);
        }
        if (currentUser !== data.nname) {
            const option = document.createElement("option");
            option.value = data.nname;
            option.innerText = data.nname;
            recipientSelect.appendChild(option);
        }
    });
    //handel user left
    socketio.on("userLeft", (data) => {
        const userElements = Array.from(userList.children);
        userElements.forEach((el) => {
            if (el.textContent.includes(data.nickname)) {
                userList.removeChild(el);
            }
        });
    
        const recipientOptions = Array.from(recipientSelect.children);
        recipientOptions.forEach((option) => {
            if (option.value === data.nickname) {
                recipientSelect.removeChild(option);
            }
        });
    
        // Update the user list for the creator
        if (currentUser === data.creator) {
            userList.innerHTML = ""; // Clear the current user list
    
            data.usersInRoom.forEach((user) => { // Re-populate the user list with updated data
                const li = document.createElement("li");
                li.innerText = user;
                userList.appendChild(li);
    
                const kickBtn = document.createElement("button");
                kickBtn.innerText = "Kick";
                kickBtn.classList.add("kick-btn");
                kickBtn.addEventListener("click", () => {
                    socketio.emit("kickUser", { userToKick: user });
                });
                li.appendChild(kickBtn);
    
                const banBtn = document.createElement("button");
                banBtn.innerText = "Ban";
                banBtn.classList.add("ban-btn");
                banBtn.addEventListener("click", () => {
                    socketio.emit("banUser", { userToBan: user });
                });
                li.appendChild(banBtn);
    
                const muteBtn = document.createElement("button");
                muteBtn.innerText = "Mute";
                muteBtn.classList.add("mute-btn");
                muteBtn.addEventListener("click", () => {
                    socketio.emit("muteUser", { userToMute: user });
                });
                li.appendChild(muteBtn);
    
                const unmuteBtn = document.createElement("button");
                unmuteBtn.innerText = "Unmute";
                unmuteBtn.classList.add("unmute-btn");
                unmuteBtn.addEventListener("click", () => {
                    socketio.emit("unmuteUser", { userToUnmute: user });
                });
                li.appendChild(unmuteBtn);
            });
        }
    });
    

    //clear chat for current user
    socketio.on("clearChat", (data) => {
        console.log(currentUser);
        if(data.curname == currentUser){
            document.getElementById("chatlog").innerHTML = "";
        }
    });

    //handle message send to users
    socketio.on("message_to_client", (data) => {
        if (data.curroom == currentRoom.innerText && (data.recipient === currentUser || data.recipient === "all" || data.user === currentUser)) {
            const messageContainer = document.createElement("div");
            messageContainer.classList.add("message");
            const user = document.createElement("span");
            user.classList.add("user");
            user.innerText = data.user + ":";
            const message = document.createElement("span");
            message.classList.add("message-content");
            message.innerText = data.message;
            messageContainer.appendChild(user);
            messageContainer.appendChild(message);
            if(data.recipient != "all"){
                messageContainer.style.backgroundColor = "yellow";
                const p = document.createElement("span");
                p.classList.add("message-content");
                p.innerText = "(private message)";
                messageContainer.appendChild(p);
            }
            document.getElementById("chatlog").appendChild(messageContainer);
            document.getElementById("chatlog").scrollTop = document.getElementById("chatlog").scrollHeight;
        }
    });
   //some error handling and alerts/////////////////
    socketio.on("kicked", () => {
        alert("You have been kicked from the room.");
        socketio.emit("joinRoom", { roomName: "Main Lobby" });
    });

    socketio.on("banned", () => {
        alert("You have been banned from the room.");
        socketio.emit("joinRoom", { roomName: "Main Lobby" });
    });
    
    socketio.on("kickFailed", (data) => {
        alert(data.message);
    });

    socketio.on("banFailed", (data) => {
        alert(data.message);
    });

    socketio.on("roomDeleted", () => {
        alert("The room you were in has been deleted.");
        socketio.emit("joinRoom", { roomName: "Main Lobby" });
    });

    socketio.on("muted", () => {
        sendMessage.disabled = true;
        alert("You have been muted by the room creator.");
    });
    
    socketio.on("unmuted", () => {
        sendMessage.disabled = false;
        alert("You have been unmuted by the room creator.");
    });

    //nickname in use
    socketio.on("nicknameInUse", () => {
        alert("Nickname in use, please choose another one.");
        //refresh page
        location.reload();
    }   );
});

