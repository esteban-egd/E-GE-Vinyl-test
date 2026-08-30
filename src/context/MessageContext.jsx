import { createContext, useContext, useState, useCallback, useRef } from 'react';

const MessageContext = createContext({});

export const MessageProvider = ({ children }) => {
  const [messageData, setMessageData] = useState({ text: '', icon: '', visible: false });
  const timeoutRef = useRef(null);

  const showMessage = useCallback((text, icon = '✨', duration = 5000) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // First hide any existing message slightly to trigger re-animation if needed,
    // but React batching might skip it. Let's just set it.
    setMessageData({ text, icon, visible: true });
    
    timeoutRef.current = setTimeout(() => {
      setMessageData(prev => ({ ...prev, visible: false }));
    }, duration);
  }, []);

  return (
    <MessageContext.Provider value={{ showMessage, messageData }}>
      {children}
    </MessageContext.Provider>
  );
};

export const useMessage = () => {
  return useContext(MessageContext);
};
