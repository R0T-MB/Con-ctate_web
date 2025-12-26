// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- VERSIÓN DE DEPURACIÓN DE fetchUserProfile ---
  const fetchUserProfile = async (authUser) => {
    console.log('🕵️‍♂️ fetchUserProfile llamado con:', authUser?.id);
    if (!authUser) {
      console.log('❌ fetchUserProfile: No hay authUser, setUser(null)');
      setUser(null);
      return;
    }

    try {
      console.log('🔍 Buscando perfil en la base de datos para el ID:', authUser.id);
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      console.log('📊 Resultado de la búsqueda de perfil:', { profile, error });

      if (error) {
        console.error('❌ Error en la búsqueda de perfil (bloque if):', error);
        setUser({ ...authUser, subscription_status: null, plan_id: null });
      } else {
        console.log('✅ Perfil encontrado, combinando datos.');
        setUser({ ...authUser, ...profile });
      }
    } catch (err) {
      console.error('💥 Error inesperado en el bloque catch de fetchUserProfile:', err);
      setUser({ ...authUser, subscription_status: null, plan_id: null });
    }
    console.log('🏁 fetchUserProfile ha terminado.');
  };
  // --- FIN DE LA VERSIÓN DE DEPURACIÓN ---

  useEffect(() => {
    const getSession = async () => {
      console.log('🚀 Iniciando getSession...');
      const { data: { session } } = await supabase.auth.getSession();
      await fetchUserProfile(session?.user ?? null);
      setLoading(false);
      console.log('✅ getSession y fetchUserProfile iniciales completados.');
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('🔐 onAuthStateChange disparado:', _event, session?.user?.id);
      await fetchUserProfile(session?.user ?? null);
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
    user,
    login,
    register,
    logout,
    loading,
    handleSubscribe,
  };

  if (loading) {
    return <div>Cargando...</div>;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};