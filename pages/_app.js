import '../styles/globals.css';
import { ThemeProvider } from '../lib/context/ThemeContext';

function MyApp({ Component, pageProps }) {
    return (
        <ThemeProvider>
            <Component {...pageProps} />
        </ThemeProvider>
    );
}

export default MyApp;
