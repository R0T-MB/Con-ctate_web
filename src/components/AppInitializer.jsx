// src/components/AppInitializer.jsx

import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // <-- ¡Ya lo tenías!
import { supabase } from '../lib/supabaseClient'; // <-- ¡Ya lo tenías!
import toast, { Toaster } from 'react-hot-toast';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';

// Importa TODOS tus componentes de página
import LoginPage from './auth/LoginPage';
import RegisterPage from './auth/RegisterPage';
import ForgotPasswordPage from './auth/ForgotPasswordPage';
import LandingPage from './LandingPage';
import MainLayout from './MainLayout';
import TestRoute from '../TestRoute';
import TestDestination from '../TestDestination';
import RegistrationSuccessPage from './auth/RegistrationSuccessPage';
import ResetPasswordPage from './auth/ResetPasswordPage';

// Componente para proteger rutas (sin cambios)
const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();
    if (loading) {
        return <div className="flex justify-center items-center min-h-screen">Cargando...</div>;
    }
    if (!user) {
        return <Navigate to="/" />;
    }
    return children;
};

// Componente para la pantalla de carga de confirmación (sin cambios)
const ConfirmationScreen = () => (
  <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50">
    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
    <p className="mt-4 text-lg text-gray-600">Confirmando tu cuenta, por favor espera...</p>
  </div>
);

// --- NUEVO: Función de suscripción que podemos reutilizar ---
const handleSubscribe = async (priceId) => {
    try {
        const { data, error } = await supabase.functions.invoke('paddle-checkout', {
            body: { priceId },
        });

        if (error) {
            throw new Error(error.message);
        }

        window.location.href = data.url;

    } catch (error) {
        console.error('Error al suscribirse:', error);
        toast.error(error.message);
    }
};


// Este componente contiene la lógica principal
function AppContent() {
    const navigate = useNavigate();
    const [isConfirming, setIsConfirming] = useState(false);
    const { user } = useAuth(); // --- NUEVO: Obtenemos el usuario para mostrar el botón condicionalmente

    useEffect(() => {
        const { hash } = window.location;
        if (hash) {
            setIsConfirming(true);
            const urlParams = new URLSearchParams(hash.substring(1));
            const accessToken = urlParams.get('access_token');
            const refreshToken = urlParams.get('refresh_token');
            const type = urlParams.get('type');

            if (type === 'signup' && accessToken) {
                const toastId = toast.loading('Confirmando tu correo electrónico...');

                supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                }).then(({ error }) => {
                    if (!error) {
                        toast.success('¡Cuenta confirmada con éxito!', { id: toastId });
                        navigate('/app');
                        window.history.replaceState({}, document.title, window.location.pathname);
                    } else {
                        console.error('Error al confirmar la cuenta:', error);
                        toast.error(`Error al confirmar: ${error.message}`, { id: toastId });
                        setTimeout(() => navigate('/login'), 2500);
                    }
                }).finally(() => {
                    setIsConfirming(false);
                });
            } else if (type === 'recovery' && accessToken) {
                console.log('¡Enlace de recuperación detectado!');
                const toastId = toast.loading('Verificando tu acceso...');
                
                supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                }).then(({ error }) => {
                    if (!error) {
                        console.log('Sesión de recuperación establecida con éxito.');
                        toast.success('Acceso verificado. Por favor, introduce tu nueva contraseña.', { id: toastId });
                        navigate('/reset-password');
                        console.log('Intentando navegar a /reset-password...');
                        window.history.replaceState({}, document.title, window.location.pathname);
                    } else {
                        console.error('Error al verificar el enlace de recuperación:', error);
                        toast.error(`Error de verificación: ${error.message}`, { id: toastId });
                        setTimeout(() => navigate('/forgot-password'), 2500);
                    }
                }).finally(() => {
                    setIsConfirming(false);
                });
            } else {
                setIsConfirming(false);
            }
        }
    }, [navigate]);

    if (isConfirming) {
        return <ConfirmationScreen />;
    }

    return (
        <div className="relative">
            <Routes>
                {/* Rutas Públicas */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/test-route" element={<TestRoute />} />
                <Route path="/test-destination" element={<TestDestination />} />
                <Route path="/registration-success" element={<RegistrationSuccessPage />} />
                
                {/* Ruta Protegida para el resto de la aplicación */}
                <Route path="/app/*" element={<ProtectedRoute><MainLayout /></ProtectedRoute>} />
                
                {/* Redirección por defecto para cualquier otra ruta */}
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>

            {/* --- NUEVO: BOTÓN FLOTANTE DE SUSCRIPCIÓN --- */}
            {user && (
                <div className="fixed bottom-5 right-5 z-50">
                    <button
                        onClick={() => handleSubscribe('pri_01kc9ak434g0mqbry653pegctd')} // <-- ¡REEMPLAZA ESTO!
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
                    >
                        Suscribirse a Premium
                    </button>
                </div>
            )}
        </div>
    );
}

// El componente principal que exportamos, ahora envuelve TODO en el proveedor
function AppInitializer() {
    return (
        <I18nextProvider i18n={i18n}>
            <Router>
                <AppContent />
            </Router>
            <Toaster
                position="top-center"
                toastOptions={{
                    duration: 4000,
                    style: { background: '#363636', color: '#fff', borderRadius: '8px' },
                    success: { duration: 3000, iconTheme: { primary: '#4ade80', secondary: '#fff' } },
                    error: { duration: 5000, iconTheme: { primary: '#ef4444', secondary: '#fff' } },
                }}
            />
        </I18nextProvider>
    );
}

export default AppInitializer;