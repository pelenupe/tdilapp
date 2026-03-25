const { query } = require('../config/database');
const { sendDirectMessageEmail } = require('../services/emailService');

const initChat = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌: New user connected with ID ${socket.id}`);

    // Join personal room
    socket.on('join', ({ userId }) => {
      socket.join(userId.toString());
      console.log(`📥: User ${userId} joined their room`);
    });

    // Handle sending a message
    socket.on('sendMessage', async ({ senderId, receiverId, content }) => {
      try {
        // Save message to database using raw SQL
        const result = await query(
          `INSERT INTO messages (sender_id, receiver_id, content, created_at, is_read) 
           VALUES ($1, $2, $3, datetime('now'), 0)
           RETURNING id`,
          [senderId, receiverId, content]
        );

        const messageId = result[0].id;

        // Create message object to send
        const newMessage = {
          id: messageId,
          senderId,
          receiverId,
          content,
          createdAt: new Date().toISOString(),
          isRead: false
        };

        // Emit message to both sender and receiver
        io.to(receiverId.toString()).emit('receiveMessage', newMessage);
        io.to(senderId.toString()).emit('messageSent', newMessage);
        
        console.log(`📨: Message ${messageId} sent from ${senderId} to ${receiverId}`);

        // Email notification to receiver (non-blocking, only if they have an email)
        try {
          const [receiver] = await query(
            `SELECT email, "firstName" FROM users WHERE id = $1`, [receiverId]
          );
          const [sender] = await query(
            `SELECT "firstName" FROM users WHERE id = $1`, [senderId]
          );
          if (receiver?.email && sender) {
            sendDirectMessageEmail({
              toEmail: receiver.email,
              toName: receiver.firstName,
              fromName: sender.firstName,
              preview: content
            }).catch(() => {});
          }
        } catch (_) {}
      } catch (err) {
        console.error('Error saving or sending message:', err);
        socket.emit('messageError', { error: 'Failed to send message' });
      }
    });

    // Mark message as read
    socket.on('markAsRead', async ({ messageId, userId }) => {
      try {
        await query(
          'UPDATE messages SET is_read = 1 WHERE id = $1 AND receiver_id = $2',
          [messageId, userId]
        );
        console.log(`✅: Message ${messageId} marked as read`);
      } catch (err) {
        console.error('Error marking message as read:', err);
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`❌: User ${socket.id} disconnected`);
    });
  });
};

module.exports = { initChat };
