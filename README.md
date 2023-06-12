[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-8d59dc4de5201274e310e4c54b9627a8934c3b88527886e3b421487c677d23eb.svg)](https://classroom.github.com/a/tduhEvNW)
# CSE330
David Wang 498218 xucheng-wang

Christine Li 498009 ChristineLH01

The webpage is index.html, the chat server is chat-server.js and the features and function implementations are in mian.js.

Run locally:
1. run the following code in the project folder to regenerate node_modules(since node_modules was ignored)
npm install socket.io --save
2. run the following code in the same folder to start the server
node chat-server.js
3. go to http://localhost:3456/ or http://localhost:3456/index.html in the browser

Usage:
1. Create a nickname first. All the other buttons are disabled if not logged in.
2. You can create private or public rooms. If you leave the password blank, it will automatically be a public room.
3. Join a room by clicking on the room name.
4. The creator of the room has the buttons to kick, ban(cannot rejoin), mute, and unmute users. The creator can also delete a room, through which all users in the room will be moved to the main lobby.
5. You can select the user to send a private message to in the drop down list. It is by default send to All users.
6. After creating a room, user need to click that room inorder to join


Creative Portion:
1. Creator of the room can mute and unmute a user by disabling their send button.
2. The creator of the room can delete a room. Doing this will move all the users in that room to the main lobby.
3. Refresh the page won't crash the server. It will disconnect the user and removes the user form its current room.
4. Private messages are highlighted in yellow.
5. Duplicate active nickname is handled when log in.
6. The drop down list for selecting target user for private message changes dynamically as users enter and leave.
