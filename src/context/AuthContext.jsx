// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast'; // <-- AÑADIDO: Importar toast

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // Este user ahora contendrá los datos de auth + perfil
  const [loading, setLoading] = useState(true);

  // Función para obtener el perfil del usuario desde la tabla 'profiles'
  const fetchUserProfile = async (authUser) => {
    if (!authUser) {
      setUser(null);
      return;
    }

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*') // Selecciona todo: subscription_status, plan_id, etc.
        .eq('id', authUser.id) // Compara con el ID de autenticación
        .single(); // Espera un único resultado

      if (error) {
        console.error('Error fetching user profile:', error);
        // Si no hay perfil (ej. usuario nuevo), dejamos el usuario de auth.
        setUser({ ...authUser, subscription_status: null, plan_id: null });
      } else {
        // Combinamos los datos de autenticación con los del perfil
        setUser({ ...authUser, ...profile });
      }
    } catch (err) {
      console.error('Unexpected error fetching profile:', err);
      setUser({ ...authUser, subscription_status: null, plan_id: null });
    }
  };

  useEffect(() => {
    // Obtiene la sesión actual al cargar la aplicación
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      await fetchUserProfile(session?.user ?? null); // Usamos la nueva función
      setLoading(false);
    };

    getSession();

    // Escucha los cambios de auth (login, logout, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('🔐 onAuthStateChange disparado:', _event, session?.user?.id);
      await fetchUserProfile(session?.user ?? null); // Usamos la nueva función
      setLoading(false);

      if (_event === 'SIGNED_IN' && session) {
        console.log('✅ Usuario logueado. Llamando a createPaddleCustomerForUser en segundo plano.');
        createPaddleCustomerForUser(session);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const createPaddleCustomerForUser = async (session) => {
    if (!session?.user?.email) {
      console.error("No hay sesión de usuario o email.");
      return;
    }
    console.log(`Verificando/creando cliente de Paddle para ${session.user.email}...`);
    try {
      const { data, error } = await supabase.functions.invoke('create-paddle-customer');
      if (error) {
        console.error("Error al invocar la función create-paddle-customer:", error);
      } else {
        console.log("Cliente de Paddle verificado/creado con éxito:", data);
      }
    } catch (err) {
      console.error("Error inesperado al crear el cliente de Paddle:", err);
    }
  };

  const login = async (email, password) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      return { success: false, error: error.message };
    }
    return { success: true, user: data.user };
  };

  const register = async (email, password) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setLoading(false);
      return { success: false, error: error.message };
    }
    return { success: true, user: data.user };
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Error al cerrar sesión:', error.message);
  };

  // --- FUNCIÓN DE SUSCRIPCIÓN MOVIDA AQUÍ ---
  const handleSubscribe = async () => {
    if (!user) {
      toast.error('Debes iniciar sesión para suscribirte.');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('paddle-checkout', {
        body: { priceId: import.meta.env.VITE_PADDLE_PRICE_ID },
      });

      if (error) {
        throw new Error(error.message);
      }

      Paddle.Environment.set(import.meta.env.VITE_PADDLE_ENVIRONMENT);
Paddle.Initialize({
  token: import.meta.env.VITE_PADDLE_TOKEN,
      });

      Paddle.Checkout.open({
        transactionId: data.transactionId,
      });

    } catch (error) {
      console.error('Error al suscribirse:', error);
      toast.error(error.message);
    }
  };

  const value = {
    user, // Ahora user contiene subscription_status
    login,
    register,
    logout,
    loading,
    handleSubscribe, // <-- AÑADIDO: Exponer la función
  };

  if (loading) {
    return <div>Cargando...</div>;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};