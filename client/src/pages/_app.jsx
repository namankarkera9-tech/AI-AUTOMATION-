import '../styles/globals.css';
import { useEffect } from 'react';
import useAuthStore from '../store/authStore';
import { joinUserRoom } from '../lib/socket';

export default function App({ Component, pageProps }) {
  const { user, isAuthenticated, refreshMe } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      refreshMe();
    }
  }, [isAuthenticated, refreshMe]);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      joinUserRoom(user.id);
    }
  }, [isAuthenticated, user?.id]);

  return <Component {...pageProps} />;
}
