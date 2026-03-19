const { Message } = require('../models');

// Get conversation between two users
const getConversation = async (req, res) => {
  try {
    const { otherUserId } = req.params;

    const conversation = await Message.findAll({
      where: {
        senderId: req.user.id,
        receiverId: otherUserId
      },
      order: [['createdAt', 'ASC']]
    });

    res.json(conversation);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching conversation' });
  }
};

module.exports = { getConversation };
