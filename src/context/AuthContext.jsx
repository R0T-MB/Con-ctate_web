// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Obtiene la sesión actual al cargar la aplicación
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false); // <-- El loading termina aquí, es rápido y directo.
    };

    getSession();

    // Escucha los cambios de auth (login, logout, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('🔐 onAuthStateChange disparado:', _event, session?.user?.id);
      setUser(session?.user ?? null);
      setLoading(false); // <-- También lo establecemos aquí por si acaso.

      // Llamamos a la función SIN 'await' para que no bloquee NADA.
      if (_event === 'SIGNED_IN' && session) {
        console.log('✅ Usuario logueado. Llamando a createPaddleCustomerForUser en segundo plano.');
        createPaddleCustomerForUser(session);
      }
    });

    // Limpia la suscripción cuando el componente se desmonta
    return () => subscription.unsubscribe();
  }, []);

  // --- FUNCIÓN SIMPLIFICADA ---
  const createPaddleCustomerForUser = async (session) => {
    if (!session?.user?.email) {
      console.error("No hay sesión de usuario o email.");
      return;
    }

    console.log(`Verificando/creando cliente de Paddle para ${session.user.email}...`);

    try {
      // Llamamos a la función sin hacer ninguna comprobación previa.
      // La función en Supabase debe manejar si el cliente ya existe.
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

  const value = {
    user,
    login,
    register,
    logout,
    loading,
  };

  // Muestra una pantalla de carga mientras se obtiene la sesión inicial
  if (loading) {
    return <div>Cargando...</div>; // Puedes poner aquí un spinner o componente de carga
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};