const { query } = require('../backend/config/database');

async function clearChats() {
  try {
    console.log('Clearing all chat data...');
    
    await query('DELETE FROM group_messages');
    console.log('✅ Deleted all messages');
    
    await query('DELETE FROM group_chat_members');
    console.log('✅ Deleted all chat members');
    
    await query('DELETE FROM group_chats');
    console.log('✅ Deleted all chats');
    
    const messageCount = await query('SELECT COUNT(*) as count FROM group_messages');
    const chatCount = await query('SELECT COUNT(*) as count FROM group_chats');
    
    console.log(`\nFinal counts:`);
    console.log(`Messages: ${messageCount[0].count}`);
    console.log(`Chats: ${chatCount[0].count}`);
    console.log('\n✅ All chat data cleared!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error clearing chats:', error);
    process.exit(1);
  }
}

clearChats();
