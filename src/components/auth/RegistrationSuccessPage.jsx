// src/components/auth/RegistrationSuccessPage.jsx (VERSIÓN DE PRUEBA)
import React from 'react';
import { Link } from 'react-router-dom';

const RegistrationSuccessPage = () => {
  // Sin traducciones, sin Card. Solo JSX plano.
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-md p-8 text-center bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <div className="text-6xl mb-4">📧</div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
          Revisa tu correo
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Te hemos enviado un enlace para confirmar tu cuenta. Por favor, revisa tu bandeja de entrada.
        </p>
        <Link
          to="/login"
          className="inline-block bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Ir al Inicio de Sesión
        </Link>
      </div>
    </div>
  );
};

export default RegistrationSuccessPage;