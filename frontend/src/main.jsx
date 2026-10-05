import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './app.css';
import App from './App.jsx';

// Force https for any non-local visit (the hosting config also redirects at the edge)
const { protocol, hostname, host, pathname, search, hash } = window.location;
if (protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(hostname)) {
  window.location.replace(`https://${host}${pathname}${search}${hash}`);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
