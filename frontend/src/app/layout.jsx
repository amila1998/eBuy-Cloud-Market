import { AuthProvider } from '../context/AuthContext';
import '../styles/globals.css';

export const metadata = {
  title: 'eBuy Cloud Market',
  description: 'Microservices-based e-commerce platform',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
