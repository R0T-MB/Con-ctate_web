// src/components/auth/ResetPasswordPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '../LanguageSelector';

function ResetPasswordPage() {
  console.log('¡El componente ResetPasswordPage se ha cargado!');
  const { t } = useTranslation();
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error(t('passwordRecovery.noMatch', 'Las contraseñas no coinciden.'));
      return;
    }

    if (newPassword.length < 6) {
      toast.error(t('passwordRecovery.tooShort', 'La contraseña debe tener al menos 6 caracteres.'));
      return;
    }

    setIsLoading(true);
    const toastId = toast.loading(t('passwordRecovery.updating', 'Actualizando tu contraseña...'));

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        throw error;
      }

      toast.success(t('passwordRecovery.successMessage', '¡Contraseña actualizada con éxito!'), { id: toastId });
      
      // Espera un momento antes de redirigir para que el usuario vea el éxito
      setTimeout(() => {
        navigate('/login');
      }, 1500);

    } catch (error) {
      toast.error(`${t('passwordRecovery.errorPrefix', 'Error')}: ${error.message}`, { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex flex-col justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* <-- VERSIÓN LIMPIA DEL SELECTOR DE IDIOMA */}
      <div className="absolute top-4 right-4 z-10">
        <LanguageSelector className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-md rounded-lg" />
      </div>

      <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('passwordRecovery.title', 'Restablecer Contraseña')}
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {t('passwordRecovery.description', 'Por favor, introduce tu nueva contraseña.')}
          </p>
        </div>
        <form onSubmit={handleResetPassword} className="mt-8 space-y-6">
          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('passwordRecovery.newKeyLabel', 'Nueva Contraseña')}
            </label>
            <input
              id="new-password"
              name="new-password"
              type="password"
              autoComplete="new-password"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('passwordRecovery.confirmKeyLabel', 'Confirmar Nueva Contraseña')}
            </label>
            <input
              id="confirm-password"
              name="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isLoading ? t('passwordRecovery.updating', 'Actualizando...') : t('passwordRecovery.saveButton', 'Guardar nueva contraseña')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ResetPasswordPage;