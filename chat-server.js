const http = require("http"),
    fs = require("fs");
const path = require("path");

const port = 3456;

// Listen for HTTP connections.
const server = http.createServer((req, res) => {
    const filePath = req.url === '/' ? 'index.html' : req.url;
    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css'
    };
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(path.join(__dirname, filePath), (err, data) => {
        if (err) {
            res.writeHead(500);
            res.end(`Error: ${err.code}`);
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data, 'utf-8');
        }
    });
});

server.listen(port);

const socketio = require("socket.io")(http, {
    wsEngine: 'ws'
});

const io = socketio.listen(server);

const users = {};
//basic room structure with users, creator, banned users, muted users
let rooms = {
    "Main Lobby": { users: [], creator: "", bannedUsers: [], mutedUsers: [] },
};
const privateRooms = {};

io.sockets.on("connection", (socket) => {
// join to the server
    socket.on("join", (data) => {
        const { nickname, room } = data;
        const nicknameAlreadyInUse = Object.values(users).some((user) => user.nickname === nickname);
        if (nicknameAlreadyInUse) {
            socket.emit("nicknameInUse", {});
            return;
        }
        users[socket.id] = { nickname, room };
        socket.join(room);
        rooms[room].users.push(nickname);
        socket.emit("updateRoom", { room, usersInRoom: rooms[room].users, isCreator: rooms[room].creator === nickname, creator: rooms[room].creator });
        socket.broadcast.to(room).emit("userJoined", { nname: nickname, creator: rooms[room].creator });
        socketio.emit("updateRooms", { rooms, privateRooms });
    });
// message to the server
    socket.on("message_to_server", (data) => {
        console.log("Message to server: ", data);
        // const { message } = data;
        // const { room } = users[socket.id];
        // var currentRoom = data["curroom"];
        const { message, curroom, recipient } = data;
        // socketio.to(room).emit("message_to_client", { message, user: users[socket.id].nickname, curroom: currentRoom});
        socketio.to(curroom).emit("message_to_client", { user: users[socket.id].nickname, message, curroom, recipient });
    });
// create room
    socket.on("createRoom", (data) => {
        const { roomName, password } = data;
        const creatorNickname = users[socket.id].nickname;
        rooms[roomName] = { users: [], creator: creatorNickname, bannedUsers: [], mutedUsers: []};
        if (password) {
            privateRooms[roomName] = password;
        }
        socketio.emit("updateRooms", { rooms, privateRooms });
    });
// join room
    socket.on("joinRoom", (data) => {
        const { roomName, password } = data;

        if (users[socket.id] && users[socket.id].room === roomName) {
            return; // If the user is already in the room, do not proceed
          }

        if (rooms[roomName]) {
            if (rooms[roomName].bannedUsers.includes(users[socket.id].nickname)) {
              socket.emit("banFailed", { message: "You are banned from this room." });
              return;
            }
            if (privateRooms[roomName]) {
                if (privateRooms[roomName] !== password) {
                    socket.emit("wrongPassword", {});
                    return;
                }
            }
            const oldRoom = users[socket.id].room;
            const nickname = users[socket.id].nickname;
            //left old room
            socket.leave(oldRoom);
            if(rooms[oldRoom]){
                rooms[oldRoom].users = rooms[oldRoom].users.filter(user => user !== nickname);
                socket.broadcast.to(oldRoom).emit("userLeft", { nickname });
            }
            users[socket.id].room = roomName;
            socket.join(roomName);
            rooms[roomName].users.push(nickname);
            socket.broadcast.to(roomName).emit("userJoined", { nname: nickname, creator: rooms[roomName].creator});
            socket.emit("updateRoom", { room: roomName, usersInRoom: rooms[roomName].users, isCreator: rooms[roomName].creator === nickname, creator: rooms[roomName].creator });
            socketio.emit("updateRooms", { rooms, privateRooms });
            socketio.emit("clearChat", { curname: nickname });
          }
    });
//handle referesh/disconnect
    socket.on("disconnect", () => {
        if (users[socket.id]) {
            const { room, nickname } = users[socket.id];
            socket.broadcast.to(room).emit("userLeft", { nickname });
            rooms[room].users = rooms[room].users.filter(user => user !== nickname);
            delete users[socket.id];
            socket.broadcast.emit("updateRooms", { rooms, privateRooms });
        }
    });
//kick user
    socket.on("kickUser", (data) => {
        const { userToKick } = data;
        const roomName = users[socket.id].room;
        if (rooms[roomName].creator === users[socket.id].nickname) {
            const userToKickSocketId = Object.keys(users).find(key => users[key].nickname === userToKick && users[key].room === roomName);
            if (userToKickSocketId) {
                rooms[roomName].users = rooms[roomName].users.filter(user => user !== userToKick);
                io.to(userToKickSocketId).emit("kicked");
                socketio.emit("updateRoom", { room: roomName, usersInRoom: rooms[roomName].users, isCreator: rooms[roomName].creator === users[socket.id].nickname, creator: rooms[roomName].creator });
                socket.broadcast.to(roomName).emit("userLeft", { nickname: userToKick });
            } else {
                //debuging purposes
                socket.emit("kickFailed", { message: "User not found in the room." });
            }
        } else {
            socket.emit("kickFailed", { message: "Only the room creator can kick users." });
        }
    });

/////////////////////////BAN USER///////////////////////////
socket.on("banUser", (data) => {
    const { userToBan } = data;
    const roomName = users[socket.id].room;
    if (rooms[roomName].creator === users[socket.id].nickname) {
        const userToKickSocketId = Object.keys(users).find(key => users[key].nickname === userToBan && users[key].room === roomName);
        if (userToKickSocketId) {
            rooms[roomName].bannedUsers.push(userToBan);
            rooms[roomName].users = rooms[roomName].users.filter(user => user !== userToBan);
            io.to(userToKickSocketId).emit("banned");
            socketio.emit("updateRoom", { room: roomName, usersInRoom: rooms[roomName].users, isCreator: rooms[roomName].creator === users[socket.id].nickname, creator: rooms[roomName].creator });
            socket.broadcast.to(roomName).emit("userLeft", { nickname: userToBan });
        } else {
            socket.emit("banFailed", { message: "User not found in the room." });
        }
    } else {
        socket.emit("banFailed", { message: "Only the room creator can kick users." });
    }
});
//delete room
socket.on("deleteRoom", (data) => {
    const roomName = data.roomName;
    if (rooms[roomName]) {
        // Send all users in the room back to the Main Lobby
        rooms[roomName].users.forEach(useri => {
            const userSocketId = Object.keys(users).find(key => users[key].nickname === useri && users[key].room === roomName);
            //rooms[roomName].users = rooms[roomName].users.filter(user => user !== useri);
            io.to(userSocketId).emit("roomDeleted");
            //socketio.emit("updateRoom", { room: roomName, usersInRoom: rooms[roomName].users, isCreator: rooms[roomName].creator === users[socket.id].nickname, creator: rooms[roomName].creator });
        });
        // Delete the room
        delete rooms[roomName];
        if (privateRooms[roomName]) {
            delete privateRooms[roomName];
        }
        // Update the room list for all clients
        io.sockets.emit("updateRooms", { rooms, privateRooms });
    } else {
        socket.emit("deleteFailed", { message: "You don't have permission to delete this room." });
    }
});
//mute user
socket.on("muteUser", (data) => {
    const { userToMute } = data;
    const roomName = users[socket.id].room;
    if (rooms[roomName].creator === users[socket.id].nickname) {
        const userToMuteSocketId = Object.keys(users).find(key => users[key].nickname === userToMute && users[key].room === roomName);
        if (userToMuteSocketId) {
            rooms[roomName].mutedUsers.push(userToMute);
            io.to(userToMuteSocketId).emit("muted");
        } else {
            socket.emit("muteFailed", { message: "User not found in the room." });
        }
    } else {
        socket.emit("muteFailed", { message: "Only the room creator can mute users." });
    }
});
//unmute user
socket.on("unmuteUser", (data) => {
    const { userToUnmute } = data;
    const roomName = users[socket.id].room;
    if (rooms[roomName].creator === users[socket.id].nickname) {
        const userToUnmuteSocketId = Object.keys(users).find(key => users[key].nickname === userToUnmute && users[key].room === roomName);
        if (userToUnmuteSocketId) {
            rooms[roomName].mutedUsers = rooms[roomName].mutedUsers.filter(user => user !== userToUnmute);
            io.to(userToUnmuteSocketId).emit("unmuted");
        } else {
            socket.emit("unmuteFailed", { message: "User not found in the room." });
        }
    } else {
        socket.emit("unmuteFailed", { message: "Only the room creator can unmute users." });
    }
});

    
});