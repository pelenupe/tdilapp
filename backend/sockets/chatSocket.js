const { Message } = require('../models');

const initChat = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌: New user connected with ID ${socket.id}`);

    // Join personal room
    socket.on('join', ({ userId }) => {
      socket.join(userId);
      console.log(`📥: User ${userId} joined their room`);
    });

    // Handle sending a message
    socket.on('sendMessage', async ({ senderId, receiverId, content }) => {
      try {
        // Save message to database
        const newMessage = await Message.create({ senderId, receiverId, content });

        // Emit message to receiver if online
        io.to(receiverId).emit('receiveMessage', newMessage);
      } catch (err) {
        console.error('Error saving or sending message:', err);
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log('❌: A user disconnected');
    });
  });
};

module.exports = { initChat };
