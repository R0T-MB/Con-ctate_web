// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

// 1. Crear el contexto
const AuthContext = createContext(null);

// 2. Crear el Proveedor del contexto
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- NUEVA FUNCIÓN PARA CREAR EL CLIENTE EN PADDLE ---
  const createPaddleCustomerForUser = async (session) => {
    if (!session?.user) {
      console.error("No hay sesión de usuario para crear el cliente de Paddle.");
      return;
    }

    // Opcional pero recomendado: comprueba si el usuario ya tiene un ID de Paddle
    // para no crearlo innecesariamente.
    const { data: profile } = await supabase
      .from('profiles')
      .select('paddle_customer_id')
      .eq('id', session.user.id)
      .single();

    if (profile?.paddle_customer_id) {
      console.log('El usuario ya tiene un paddle_customer_id. No se crea uno nuevo.');
      return;
    }

    console.log(`Creando cliente de Paddle para el usuario ${session.user.email}...`);

    try {
      const { data, error } = await supabase.functions.invoke('create-paddle-customer', {
        // No necesitas pasar un body, la función obtiene el usuario del token
      });

      if (error) {
        console.error("Error al invocar la función create-paddle-customer:", error);
      } else {
        console.log("Cliente de Paddle creado/verificado con éxito:", data);
      }
    } catch (err) {
      console.error("Error inesperado al crear el cliente de Paddle:", err);
    }
  };

  // useEffect que escucha los cambios de estado de autenticación de Supabase
  useEffect(() => {
    // Obtiene la sesión actual al cargar la aplicación
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };

    getSession();

    // Escucha los cambios de auth (login, logout, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('🔐 onAuthStateChange disparado:', _event, session?.user?.id);

      if (_event === 'SIGNED_IN' && session) {
    console.log('✅ Condición de SIGNED_IN cumplida. Voy a llamar a createPaddleCustomerForUser.');
    await createPaddleCustomerForUser(session);
  }
  
      setUser(session?.user ?? null);
      setLoading(false);

      // --- NUEVA LÓGICA: Si el usuario inicia sesión, crea su cliente de Paddle ---
      if (_event === 'SIGNED_IN' && session) {
        // Llamamos a nuestra nueva función
        await createPaddleCustomerForUser(session);
      }
    });

    // Limpia la suscripción cuando el componente se desmonta
    return () => subscription.unsubscribe();
  }, []); // El array vacío asegura que solo se ejecute una vez

  // Función de inicio de sesión con Supabase
  const login = async (email, password) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      return { success: false, error: error.message };
    }

    // No llamamos a setUser aquí. Confiamos en que onAuthStateChange lo hará.
    return { success: true, user: data.user };
  };

  // Función de registro con Supabase
  const register = async (email, password) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      return { success: false, error: error.message };
    }

    return { success: true, user: data.user };
  };

  // Función para cerrar sesión con Supabase
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// 3. Crear un hook personalizado
export const useAuth = () => {
  return useContext(AuthContext);
};