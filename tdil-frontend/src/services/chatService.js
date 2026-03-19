import { io } from 'socket.io-client';
import API from './api';

const socket = io('http://localhost:5000');

export const connectSocket = (userId) => {
  socket.emit('join', { userId });
};

export const sendMessage = (senderId, receiverId, content) => {
  socket.emit('sendMessage', { senderId, receiverId, content });
};

export const onReceiveMessage = (callback) => {
  socket.on('receiveMessage', callback);
};

export const getConversation = (otherUserId) => API.get(`/messages/${otherUserId}`);

export default socket;
