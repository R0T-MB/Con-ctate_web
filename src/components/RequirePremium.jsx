// src/components/RequirePremium.jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from './ui/button'; // Asumo que tienes este componente de botón

// Componente para mostrar una página de "actualiza a premium"
const PremiumUpgradePrompt = () => {
  const location = useLocation();
  const { handleSubscribe } = location.state || {}; // Recibe la función del estado de la ruta

  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900 text-center p-8">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-xl max-w-md w-full">
        <h1 className="text-3xl font-bold mb-4 text-gray-800 dark:text-gray-100">Contenido Exclusivo</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Esta función es solo para miembros Premium. ¡Desbloquea todo el potencial de Conectate App!
        </p>
        <div className="w-full h-48 bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-6 rounded-lg">
          <span className="text-6xl">🔒</span>
        </div>
        {handleSubscribe && (
          <Button onClick={() => handleSubscribe()} className="w-full">
            Suscribirse Ahora
          </Button>
        )}
      </div>
    </div>
  );
};

// El componente guardián principal
const RequirePremium = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Cargando...</div>;
  }

  // Si el usuario no está autenticado, redirige a la página de login.
  // Esto es una doble capa de seguridad, ya que ProtectedRoute ya lo hace.
  if (!user) {
    return <Navigate to="/login" />;
  }

  // Si el usuario está autenticado pero su suscripción no está activa, muestra el prompt de actualización.
  if (user.subscription_status !== 'active') {
    return <PremiumUpgradePrompt />;
  }

  // Si el usuario está autenticado Y tiene una suscripción activa, renderiza el contenido.
  return children;
};

export default RequirePremium;