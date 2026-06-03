import { useEffect, useRef, useCallback } from 'react';
import { getWebSocketUrl } from '../config/env.js';

const useChatSocket = ({ onMessage, onTyping, onReadReceipt } = {}) => {
  const socketRef = useRef(null);
  const callbacksRef = useRef({ onMessage, onTyping, onReadReceipt });

  useEffect(() => {
    callbacksRef.current = { onMessage, onTyping, onReadReceipt };
  }, [onMessage, onTyping, onReadReceipt]);

  useEffect(() => {
    let reconnectTimer = null;
    let unmounted = false;

    const connect = () => {
      if (unmounted) return;

      const token = localStorage.getItem('accessToken');
      if (!token) return;

      try {
        const socket = new WebSocket(`${getWebSocketUrl()}?token=${token}`);
        socketRef.current = socket;

        socket.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.type === 'new_message' && payload.data) {
              callbacksRef.current.onMessage?.(payload.data);
            } else if (payload.type === 'typing' && payload.data) {
              callbacksRef.current.onTyping?.(payload.data);
            } else if (payload.type === 'read_receipt' && payload.data) {
              callbacksRef.current.onReadReceipt?.(payload.data);
            }
          } catch {
          }
        };

        socket.onclose = () => {
          socketRef.current = null;
          if (!unmounted) {
            reconnectTimer = setTimeout(connect, 4000);
          }
        };

        socket.onerror = () => {
        };
      } catch {
        if (!unmounted) {
          reconnectTimer = setTimeout(connect, 4000);
        }
      }
    };

    connect();

    return () => {
      unmounted = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      const socket = socketRef.current;
      if (socket) {
        socket.onclose = null;
        socket.onerror = null;
        if (socket.readyState === WebSocket.OPEN) {
          socket.close();
        } else if (socket.readyState === WebSocket.CONNECTING) {
          socket.onopen = () => socket.close();
        }
      }
    };
  }, []);

  const sendTyping = useCallback((recipientId, isTyping = true) => {
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'typing',
        recipientId,
        isTyping,
      }));
    }
  }, []);

  return { sendTyping };
};

export default useChatSocket;
